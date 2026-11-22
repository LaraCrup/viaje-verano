/**
 * Cómo se divide un gasto y quién lo pagó.
 *
 * Funciones puras: reciben lo que se cargó en la pantalla y devuelven el reparto
 * final en unidades menores, o un error con un mensaje claro para mostrar.
 */
import { allocate } from './allocate'
import { formatMoney, type Minor } from './currency'

export type SplitMode = 'equal' | 'exact' | 'percent' | 'shares' | 'personal'

export const SPLIT_LABELS: Record<SplitMode, string> = {
  equal: 'Partes iguales',
  exact: 'Montos exactos',
  percent: 'Porcentajes',
  shares: 'Por partes',
  personal: 'Gasto personal',
}

/**
 * Lo que se cargó para cada persona incluida en la división.
 * - equal: sin valor (todas las incluidas pagan igual; excluir = no incluirla).
 * - exact: monto en unidades menores.
 * - percent: puntos básicos (10000 = 100 %, 1250 = 12,5 %).
 * - shares: centésimos de parte (100 = 1 parte, 150 = 1,5 partes).
 * - personal: una sola persona, sin valor.
 */
export interface SplitEntry {
  memberId: string
  value?: number
}

export interface SplitInput {
  mode: SplitMode
  total: Minor
  currency: string
  entries: SplitEntry[]
  /** Semilla para el desempate del redondeo: el id del gasto. */
  seed: string
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const fail = <T>(error: string): Result<T> => ({ ok: false, error })

function unique(entries: SplitEntry[]): boolean {
  return new Set(entries.map(e => e.memberId)).size === entries.length
}

export function computeSplit(input: SplitInput): Result<Record<string, Minor>> {
  const { mode, total, currency, entries, seed } = input
  if (!Number.isSafeInteger(total) || total <= 0) return fail('Poné un monto mayor a 0')
  if (!unique(entries)) return fail('Hay una persona repetida en la división')

  switch (mode) {
    case 'personal': {
      if (entries.length !== 1) return fail('Un gasto personal es de una sola persona')
      return ok({ [entries[0]!.memberId]: total })
    }
    case 'equal': {
      if (entries.length === 0) return fail('Elegí al menos una persona para dividir')
      return ok(allocate(total, Object.fromEntries(entries.map(e => [e.memberId, 1])), seed))
    }
    case 'shares': {
      const active = entries.filter(e => (e.value ?? 0) !== 0)
      if (active.some(e => !Number.isSafeInteger(e.value) || e.value! < 0)) return fail('Las partes tienen que ser números positivos')
      if (active.length === 0) return fail('Poné cuántas partes le tocan a cada una')
      return ok(allocate(total, Object.fromEntries(active.map(e => [e.memberId, e.value!])), seed))
    }
    case 'percent': {
      const active = entries.filter(e => (e.value ?? 0) !== 0)
      if (active.some(e => !Number.isSafeInteger(e.value) || e.value! < 0)) return fail('Los porcentajes tienen que ser positivos')
      const sum = active.reduce((a, e) => a + e.value!, 0)
      if (sum !== 10000) {
        const diff = 10000 - sum
        return fail(
          diff > 0
            ? `Los porcentajes suman ${formatPercent(sum)}: faltan ${formatPercent(diff)}`
            : `Los porcentajes suman ${formatPercent(sum)}: sobran ${formatPercent(-diff)}`,
        )
      }
      return ok(allocate(total, Object.fromEntries(active.map(e => [e.memberId, e.value!])), seed))
    }
    case 'exact': {
      const active = entries.filter(e => (e.value ?? 0) !== 0)
      if (active.some(e => !Number.isSafeInteger(e.value) || e.value! < 0)) return fail('Los montos tienen que ser positivos')
      const sum = active.reduce((a, e) => a + e.value!, 0)
      if (sum !== total) return fail(diffMessage(total, sum, currency, 'repartir'))
      return ok(Object.fromEntries(active.map(e => [e.memberId, e.value!])))
    }
  }
}

/** Valida quién pagó (personas o caja común) y cuánto puso cada una. */
export function validatePayers(total: Minor, payers: Record<string, Minor>, currency: string): Result<Record<string, Minor>> {
  const active = Object.entries(payers).filter(([, v]) => v !== 0)
  if (active.length === 0) return fail('Elegí quién pagó')
  if (active.some(([, v]) => !Number.isSafeInteger(v) || v < 0)) return fail('Lo que puso cada una tiene que ser positivo')
  const sum = active.reduce((a, [, v]) => a + v, 0)
  if (sum !== total) return fail(diffMessage(total, sum, currency, 'pagado'))
  return ok(Object.fromEntries(active))
}

function diffMessage(total: Minor, sum: Minor, currency: string, what: 'repartir' | 'pagado'): string {
  const diff = total - sum
  if (what === 'repartir') {
    return diff > 0
      ? `Faltan ${formatMoney(diff, currency)} por repartir`
      : `Te pasaste por ${formatMoney(-diff, currency)} del total`
  }
  return diff > 0
    ? `Lo que pagaron suma ${formatMoney(sum, currency)}: faltan ${formatMoney(diff, currency)}`
    : `Lo que pagaron suma ${formatMoney(sum, currency)}: sobran ${formatMoney(-diff, currency)}`
}

export function formatPercent(bp: number): string {
  return `${(bp / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })} %`
}

/** "12,5" → 1250 puntos básicos. null si no se entiende. */
export function parsePercent(input: string): number | null {
  const s = input.trim().replace('%', '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null
  const [i, f = ''] = s.split('.')
  return Number(i) * 100 + Number(f.padEnd(2, '0'))
}

/** "1,5" partes → 150. null si no se entiende. */
export function parseShares(input: string): number | null {
  return parsePercent(input)
}

export interface ExpenseDraft {
  id: string
  amount: Minor
  currency: string
  payers: Record<string, Minor>
  split: Omit<SplitInput, 'total' | 'currency' | 'seed'>
}

export interface ComputedExpense {
  payers: Record<string, Minor>
  shares: Record<string, Minor>
}

/** Valida todo el gasto junto: lo pagado y lo dividido tienen que sumar el total. */
export function computeExpense(draft: ExpenseDraft): Result<ComputedExpense> {
  const payers = validatePayers(draft.amount, draft.payers, draft.currency)
  if (!payers.ok) return payers
  const shares = computeSplit({ ...draft.split, total: draft.amount, currency: draft.currency, seed: draft.id })
  if (!shares.ok) return shares
  return ok({ payers: payers.value, shares: shares.value })
}
