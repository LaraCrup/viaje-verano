import { describe, expect, it } from 'vitest'
import { allocate, tieBreakOrder } from './allocate'
import { balancesByCurrency, balancesInBase, isAllSettled, type LedgerExpense, type LedgerSettlement } from './balances'
import { formatMoney, formatPlain, minorDigits, parseAmount } from './currency'
import { convertMinor, divRound, invertRate, parseRate, rateFromNumber } from './fx'
import { simplifyByCurrency, simplifyDebts } from './simplify'
import { computeExpense, computeSplit, parsePercent, validatePayers } from './split'
import { tripStats, type StatsExpense } from './stats'

const AMIGAS = ['wile', 'lara', 'juli', 'ivi', 'meli', 'solcha']
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)

describe('monedas', () => {
  it('sabe los decimales de cada moneda ISO', () => {
    expect(minorDigits('USD')).toBe(2)
    expect(minorDigits('EUR')).toBe(2)
    expect(minorDigits('ILS')).toBe(2)
    expect(minorDigits('JPY')).toBe(0)
    expect(() => minorDigits('XXZ1')).toThrow()
  })

  it('lee montos escritos como los escribe una persona', () => {
    expect(parseAmount('12,50', 'USD')).toBe(1250)
    expect(parseAmount('12.50', 'USD')).toBe(1250)
    expect(parseAmount('12', 'USD')).toBe(1200)
    expect(parseAmount('1.500', 'ARS')).toBe(150000)
    expect(parseAmount('1.500.000', 'ARS')).toBe(150000000)
    expect(parseAmount('1.234,56', 'EUR')).toBe(123456)
    expect(parseAmount('1,234.56', 'EUR')).toBe(123456)
    expect(parseAmount('0,5', 'EUR')).toBe(50)
    expect(parseAmount(',99', 'EUR')).toBe(99)
    expect(parseAmount('US$ 30', 'USD')).toBe(3000)
    expect(parseAmount('500', 'JPY')).toBe(500)
    expect(parseAmount('12,345', 'USD')).toBe(1234500) // tres decimales en USD = miles
    expect(parseAmount('', 'USD')).toBeNull()
    expect(parseAmount('abc', 'USD')).toBeNull()
    expect(parseAmount('1,2,3', 'USD')).toBeNull()
  })

  it('formatea para mostrar sin perder centavos', () => {
    expect(formatPlain(1250, 'USD')).toBe('12,50')
    expect(formatPlain(-5, 'EUR')).toBe('-0,05')
    expect(formatPlain(500, 'JPY')).toBe('500')
    expect(formatMoney(44600, 'USD')).toMatch(/446,00/)
  })
})

describe('tipo de cambio', () => {
  it('convierte con enteros y redondea mitades lejos del cero', () => {
    expect(divRound(5n, 2n)).toBe(3n)
    expect(divRound(-5n, 2n)).toBe(-3n)
    expect(divRound(4n, 3n)).toBe(1n)
    // 10,00 EUR a 1.08 → 10,80 USD
    expect(convertMinor(1000, 'EUR', 'USD', '1.08')).toBe(1080)
    // 33,33 EUR a 1.0857 → 36,1864... → 36,19
    expect(convertMinor(3333, 'EUR', 'USD', '1.0857')).toBe(3619)
    // Misma moneda: no toca nada
    expect(convertMinor(1234, 'USD', 'USD', '7')).toBe(1234)
  })

  it('maneja monedas con distintos decimales', () => {
    // 1000 JPY a 0.0067 USD = 6,70 USD
    expect(convertMinor(1000, 'JPY', 'USD', '0.0067')).toBe(670)
    // 10,00 USD a 150 JPY = 1500 JPY
    expect(convertMinor(1000, 'USD', 'JPY', '150')).toBe(1500)
  })

  it('ARS manual: 1 USD = 1450 ARS, invertido sin perder precisión útil', () => {
    const rate = invertRate('1450')
    expect(rate).toBe('0.000689655172')
    expect(convertMinor(145000, 'ARS', 'USD', rate)).toBe(100) // 1450 ARS = 1 USD
    expect(convertMinor(145000000, 'ARS', 'USD', rate)).toBe(100000) // 1.450.000 ARS = 1000 USD
  })

  it('rechaza tipos de cambio inválidos', () => {
    expect(() => parseRate('0')).toThrow()
    expect(() => parseRate('-1')).toThrow()
    expect(() => parseRate('abc')).toThrow()
    expect(parseRate('1,08').num).toBe(108n)
    expect(rateFromNumber(1.0857)).toBe('1.0857')
  })
})

describe('reparto con el mayor resto', () => {
  it('nunca pierde ni inventa centavos', () => {
    for (const total of [1, 2, 5, 99, 100, 101, 1000, 12345, 44600, 49900]) {
      const out = allocate(total, Object.fromEntries(AMIGAS.map(a => [a, 1])), 'g1')
      expect(sum(out)).toBe(total)
      const values = Object.values(out)
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1)
    }
  })

  it('el centavo que sobra es determinístico y depende del gasto, no del orden en pantalla', () => {
    const w = Object.fromEntries(AMIGAS.map(a => [a, 1]))
    const reversed = Object.fromEntries([...AMIGAS].reverse().map(a => [a, 1]))
    expect(allocate(100, w, 'gasto-a')).toEqual(allocate(100, reversed, 'gasto-a'))
    // Con distintas semillas el centavo extra no cae siempre en la misma persona
    const winners = new Set<string>()
    for (let i = 0; i < 30; i++) {
      const out = allocate(1, w, `gasto-${i}`)
      winners.add(Object.entries(out).find(([, v]) => v === 1)![0])
    }
    expect(winners.size).toBeGreaterThan(3)
  })

  it('el orden de desempate es una rotación del orden alfabético', () => {
    const order = tieBreakOrder(['c', 'a', 'b'], 'x')
    expect([...order].sort()).toEqual(['a', 'b', 'c'])
  })

  it('reparte negativos con signo', () => {
    const out = allocate(-100, { a: 1, b: 1, c: 1 }, 's')
    expect(sum(out)).toBe(-100)
  })

  it('reparte proporcional a los pesos', () => {
    expect(allocate(300, { a: 2, b: 1 }, 's')).toEqual({ a: 200, b: 100 })
    const out = allocate(100, { a: 2, b: 1 }, 's')
    expect(sum(out)).toBe(100)
    expect(out.a).toBe(67)
  })

  it('no reparte a quien tiene peso 0', () => {
    const out = allocate(100, { a: 1, b: 0, c: 1 }, 's')
    expect(out.b).toBe(0)
    expect(sum(out)).toBe(100)
  })
})

describe('divisiones', () => {
  const base = { total: 10000, currency: 'USD', seed: 'g' }

  it('partes iguales entre las 6 (Airbnb Israel 446 USD)', () => {
    const r = computeSplit({ ...base, total: 44600, mode: 'equal', entries: AMIGAS.map(memberId => ({ memberId })) })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(sum(r.value)).toBe(44600)
    const values = Object.values(r.value).sort()
    // 44600 / 6 = 7433,33 → cuatro de 7433 y dos de 7434
    expect(values.filter(v => v === 7434)).toHaveLength(2)
    expect(values.filter(v => v === 7433)).toHaveLength(4)
  })

  it('excluir personas = partes iguales entre las seleccionadas', () => {
    const r = computeSplit({ ...base, mode: 'equal', entries: [{ memberId: 'lara' }, { memberId: 'juli' }, { memberId: 'ivi' }] })
    expect(r.ok && Object.keys(r.value).sort()).toEqual(['ivi', 'juli', 'lara'])
    expect(r.ok && sum(r.value)).toBe(10000)
  })

  it('montos exactos: valida que sumen el total', () => {
    const okR = computeSplit({ ...base, mode: 'exact', entries: [{ memberId: 'lara', value: 6000 }, { memberId: 'juli', value: 4000 }] })
    expect(okR).toEqual({ ok: true, value: { lara: 6000, juli: 4000 } })
    const falta = computeSplit({ ...base, mode: 'exact', entries: [{ memberId: 'lara', value: 6000 }, { memberId: 'juli', value: 3650 }] })
    expect(falta.ok).toBe(false)
    expect(!falta.ok && falta.error).toMatch(/Faltan .*3,50 por repartir/)
    const sobra = computeSplit({ ...base, mode: 'exact', entries: [{ memberId: 'lara', value: 6000 }, { memberId: 'juli', value: 4100 }] })
    expect(!sobra.ok && sobra.error).toMatch(/Te pasaste por .*1,00/)
  })

  it('porcentajes: tienen que sumar 100 %', () => {
    const r = computeSplit({
      ...base,
      total: 1000,
      mode: 'percent',
      entries: [{ memberId: 'lara', value: 3333 }, { memberId: 'juli', value: 3333 }, { memberId: 'ivi', value: 3334 }],
    })
    expect(r.ok && sum(r.value)).toBe(1000)
    const mal = computeSplit({ ...base, mode: 'percent', entries: [{ memberId: 'lara', value: 5000 }, { memberId: 'juli', value: 4500 }] })
    expect(!mal.ok && mal.error).toMatch(/suman 95 %: faltan 5 %/)
    expect(parsePercent('12,5')).toBe(1250)
    expect(parsePercent('100')).toBe(10000)
    expect(parsePercent('1,234')).toBeNull()
  })

  it('por partes: "yo 2, vos 1"', () => {
    const r = computeSplit({ ...base, total: 900, mode: 'shares', entries: [{ memberId: 'lara', value: 200 }, { memberId: 'juli', value: 100 }] })
    expect(r).toEqual({ ok: true, value: { lara: 600, juli: 300 } })
    const medias = computeSplit({ ...base, total: 1000, mode: 'shares', entries: [{ memberId: 'lara', value: 150 }, { memberId: 'juli', value: 100 }, { memberId: 'ivi', value: 0 }] })
    expect(medias.ok && medias.value).toEqual({ lara: 600, juli: 400 })
  })

  it('gasto personal: todo para una persona', () => {
    expect(computeSplit({ ...base, mode: 'personal', entries: [{ memberId: 'meli' }] })).toEqual({ ok: true, value: { meli: 10000 } })
    expect(computeSplit({ ...base, mode: 'personal', entries: [{ memberId: 'meli' }, { memberId: 'ivi' }] }).ok).toBe(false)
  })

  it('rechaza montos inválidos y personas repetidas', () => {
    expect(computeSplit({ ...base, total: 0, mode: 'equal', entries: [{ memberId: 'a' }] }).ok).toBe(false)
    expect(computeSplit({ ...base, mode: 'equal', entries: [] }).ok).toBe(false)
    expect(computeSplit({ ...base, mode: 'equal', entries: [{ memberId: 'a' }, { memberId: 'a' }] }).ok).toBe(false)
  })
})

describe('varias pagadoras', () => {
  it('lo pagado tiene que sumar el total', () => {
    expect(validatePayers(10000, { lara: 6000, juli: 4000 }, 'EUR')).toEqual({ ok: true, value: { lara: 6000, juli: 4000 } })
    const r = validatePayers(10000, { lara: 6000, juli: 3000 }, 'EUR')
    expect(!r.ok && r.error).toMatch(/faltan .*10,00/)
    expect(validatePayers(10000, {}, 'EUR').ok).toBe(false)
  })

  it('valida el gasto completo y descarta pagadoras en 0', () => {
    const r = computeExpense({
      id: 'cena-1',
      amount: 9000,
      currency: 'EUR',
      payers: { lara: 5000, juli: 4000, ivi: 0 },
      split: { mode: 'equal', entries: [{ memberId: 'lara' }, { memberId: 'juli' }, { memberId: 'ivi' }] },
    })
    expect(r).toEqual({ ok: true, value: { payers: { lara: 5000, juli: 4000 }, shares: { lara: 3000, juli: 3000, ivi: 3000 } } })
  })
})

function expense(id: string, currency: string, amount: number, payers: Record<string, number>, shares: Record<string, number>, fxRate = '1'): LedgerExpense {
  return { id, currency, amount, payers, shares, fxRate }
}

function equalAmong(total: number, ids: string[], seed: string) {
  return allocate(total, Object.fromEntries(ids.map(i => [i, 1])), seed)
}

describe('balances', () => {
  it('gastos del seed: Juli, Lara e Ivi pagaron alojamientos y micro', () => {
    const exps = [
      expense('airbnb', 'USD', 44600, { juli: 44600 }, equalAmong(44600, AMIGAS, 'airbnb')),
      expense('ozz', 'USD', 49900, { lara: 49900 }, equalAmong(49900, AMIGAS, 'ozz')),
      expense('micro', 'USD', 15500, { ivi: 15500 }, equalAmong(15500, AMIGAS, 'micro')),
      expense('yellow', 'USD', 45000, { lara: 45000 }, equalAmong(45000, AMIGAS, 'yellow')),
    ]
    const b = balancesInBase(exps, [], 'USD')
    expect(sum(b)).toBe(0)
    // Total 155000 / 6 = 25833,33 por persona
    expect(b.lara).toBeGreaterThan(0)
    expect(b.juli).toBeGreaterThan(0)
    expect(b.wile).toBeLessThan(0)
    expect(b.lara! + b.juli! + b.ivi!).toBe(-(b.wile! + b.meli! + b.solcha!))
    // Con 3 deudoras y 3 acreedoras alcanza con pocas transferencias
    const t = simplifyDebts(b)
    expect(t.length).toBeLessThanOrEqual(5)
  })

  it('un pago entre amigas reduce la deuda', () => {
    const exps = [expense('e', 'USD', 8000, { juli: 8000 }, { lara: 4000, juli: 4000 })]
    const pago: LedgerSettlement = { id: 's', currency: 'USD', amount: 4000, fxRate: '1', fromId: 'lara', toId: 'juli' }
    expect(balancesInBase(exps, [], 'USD')).toEqual({ juli: 4000, lara: -4000 })
    const after = balancesInBase(exps, [pago], 'USD')
    expect(isAllSettled(after)).toBe(true)
  })

  it('multi-moneda: cada gasto con su tipo de cambio y netos que suman 0', () => {
    const exps = [
      expense('cena', 'EUR', 10001, { lara: 10001 }, equalAmong(10001, ['lara', 'juli', 'ivi'], 'cena'), '1.0857'),
      expense('shuk', 'ILS', 33333, { juli: 33333 }, equalAmong(33333, AMIGAS, 'shuk'), '0.2712'),
      expense('regalo', 'ARS', 145000, { ivi: 145000 }, { ivi: 72500, meli: 72500 }, invertRate('1450')),
    ]
    const inBase = balancesInBase(exps, [], 'USD')
    expect(sum(inBase)).toBe(0)
    const byCur = balancesByCurrency(exps, [])
    expect(Object.keys(byCur).sort()).toEqual(['ARS', 'EUR', 'ILS'])
    for (const b of Object.values(byCur)) expect(sum(b)).toBe(0)
    const perCurrency = simplifyByCurrency(byCur)
    expect(perCurrency.ARS).toEqual([{ from: 'meli', to: 'ivi', amount: 72500 }])
  })

  it('gasto personal no genera deudas', () => {
    const b = balancesInBase([expense('cafe', 'EUR', 350, { meli: 350 }, { meli: 350 }, '1.08')], [], 'USD')
    expect(isAllSettled(b)).toBe(true)
  })
})

describe('simplificar deudas', () => {
  const countTransfers = (b: Record<string, number>) => simplifyDebts(b).length

  it('salda exactamente los balances', () => {
    const b = { a: -3000, b: -2000, c: 1000, d: 4000 }
    const t = simplifyDebts(b)
    const after: Record<string, number> = { ...b }
    for (const x of t) {
      after[x.from]! += x.amount
      after[x.to]! -= x.amount
      expect(x.amount).toBeGreaterThan(0)
    }
    expect(Object.values(after).every(v => v === 0)).toBe(true)
  })

  it('encuentra el mínimo cuando hay grupos que se cancelan (el greedy no)', () => {
    // a↔x y b↔y se cancelan por separado: alcanza con 2 transferencias
    // c, d, z también: 2 más. Total mínimo 4.
    const b = { a: -500, x: 500, b: -700, y: 700, c: -300, d: -200, z: 500 }
    expect(countTransfers(b)).toBe(4)
    // Caso donde el greedy hace 4 y el óptimo es 3: {-6,-4,+5,+5}? no se cancela, óptimo 3.
    expect(countTransfers({ a: -600, b: -400, c: 500, d: 500 })).toBe(3)
    // El greedy (mayor deudora → mayor acreedora) hace 4 acá: x→z, x→w, y→w, y→v.
    // El óptimo es 3: y→z se cancelan solas, y x le paga a w y a v.
    const tramposo = { x: -600, y: -400, z: 400, w: 300, v: 300 }
    expect(countTransfers(tramposo)).toBe(3)
    expect(simplifyDebts(tramposo)).toContainEqual({ from: 'y', to: 'z', amount: 400 })
  })

  it('sin deudas no hay transferencias y rechaza balances que no cierran', () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([])
    expect(() => simplifyDebts({ a: 1, b: 0 })).toThrow()
  })

  it('siempre es ≤ n−1 y salda todo con 6 amigas al azar', () => {
    let seed = 42
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31)
    for (let round = 0; round < 200; round++) {
      const vals = AMIGAS.slice(0, 5).map(() => Math.floor(rnd() * 20000) - 10000)
      const b: Record<string, number> = Object.fromEntries(AMIGAS.slice(0, 5).map((a, i) => [a, vals[i]!]))
      b.solcha = -sum(b)
      const t = simplifyDebts(b)
      const nonZero = Object.values(b).filter(v => v !== 0).length
      expect(t.length).toBeLessThanOrEqual(Math.max(nonZero - 1, 0))
      const after = { ...b }
      for (const x of t) {
        after[x.from]! += x.amount
        after[x.to]! -= x.amount
      }
      expect(isAllSettled(after)).toBe(true)
    }
  })
})

describe('estadísticas', () => {
  it('total del grupo y lo que consumió cada una sin personales; lo gastado en total con personales', () => {
    const e = (id: string, cat: string, amount: number, personal = false): StatsExpense => ({
      ...expense(id, 'USD', amount, { lara: amount }, personal ? { lara: amount } : { lara: amount / 2, juli: amount / 2 }),
      category: cat,
      placeId: 'niza',
      chapterId: 'cap-niza',
      personal,
    })
    const s = tripStats([e('a', 'comida', 1000), e('b', 'comida', 2000), e('c', 'compras', 500, true)], 'USD')
    expect(s.groupTotal).toBe(3000)
    expect(s.byCategory).toEqual({ comida: 3000 })
    expect(s.byMember).toEqual({ lara: 1500, juli: 1500 })
    expect(s.byMemberWithPersonal).toEqual({ lara: 2000, juli: 1500 })
    expect(s.timesPaid.lara).toBe(2)
  })

})
