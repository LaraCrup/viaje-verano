/**
 * Simplificar deudas con el MÍNIMO de transferencias.
 *
 * Si se agrupa a las partes en conjuntos cuyo balance suma 0, cada conjunto de k
 * partes se salda con k − 1 transferencias. El mínimo total es n − (máxima cantidad
 * de conjuntos disjuntos que suman 0). Encontrar esa partición es exponencial en
 * general, pero con 6 amigas + cajas (≤ 16 partes) se resuelve exacto en milisegundos
 * con programación dinámica sobre subconjuntos. Para más partes se usa el greedy clásico.
 */
import type { Minor } from './currency'
import type { Balances } from './balances'

export interface Transfer {
  from: string
  to: string
  amount: Minor
}

const EXACT_LIMIT = 16

export function simplifyDebts(balances: Balances): Transfer[] {
  const entries = Object.entries(balances)
    .filter(([, v]) => v !== 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const total = entries.reduce((a, [, v]) => a + v, 0)
  if (total !== 0) throw new Error(`Los balances no suman 0 (dan ${total})`)
  if (entries.length === 0) return []
  if (entries.length > EXACT_LIMIT) return greedy(entries)

  const groups = zeroSumPartition(entries.map(([, v]) => v))
  return groups.flatMap(group => greedy(group.map(i => entries[i]!)))
}

/** Partición en la mayor cantidad posible de subconjuntos que suman 0. */
function zeroSumPartition(values: number[]): number[][] {
  const n = values.length
  const full = (1 << n) - 1
  const sum = new Float64Array(1 << n)
  for (let mask = 1; mask <= full; mask++) {
    const low = mask & -mask
    sum[mask] = sum[mask ^ low]! + values[31 - Math.clz32(low)]!
  }
  // dp[mask] = máxima cantidad de prefijos que suman 0 en algún orden de quitar elementos de mask.
  const dp = new Int8Array(1 << n)
  const parent = new Int8Array(1 << n)
  for (let mask = 1; mask <= full; mask++) {
    let best = -1
    let bestI = -1
    for (let i = 0; i < n; i++) {
      if (!(mask & (1 << i))) continue
      const v = dp[mask ^ (1 << i)]!
      if (v > best) {
        best = v
        bestI = i
      }
    }
    dp[mask] = best + (sum[mask] === 0 ? 1 : 0)
    parent[mask] = bestI
  }
  // Reconstrucción: se recorre la cadena desde el conjunto completo y se corta
  // un grupo cada vez que el resto vuelve a sumar 0.
  const groups: number[][] = []
  let current: number[] = []
  let mask = full
  while (mask) {
    const i = parent[mask]!
    current.push(i)
    mask ^= 1 << i
    if (sum[mask] === 0) {
      groups.push(current)
      current = []
    }
  }
  return groups
}

/** Greedy: la que más debe le paga a la que más le deben, hasta saldar. */
function greedy(entries: [string, number][]): Transfer[] {
  const debtors = entries.filter(([, v]) => v < 0).map(([id, v]) => ({ id, v: -v }))
  const creditors = entries.filter(([, v]) => v > 0).map(([id, v]) => ({ id, v }))
  const byAmount = (a: { id: string; v: number }, b: { id: string; v: number }) => b.v - a.v || (a.id < b.id ? -1 : 1)
  const out: Transfer[] = []
  while (debtors.length && creditors.length) {
    debtors.sort(byAmount)
    creditors.sort(byAmount)
    const d = debtors[0]!
    const c = creditors[0]!
    const amount = Math.min(d.v, c.v)
    out.push({ from: d.id, to: c.id, amount })
    d.v -= amount
    c.v -= amount
    if (d.v === 0) debtors.shift()
    if (c.v === 0) creditors.shift()
  }
  return out
}

/** Simplifica cada moneda por separado (sin convertir entre monedas). */
export function simplifyByCurrency(byCurrency: Record<string, Balances>): Record<string, Transfer[]> {
  return Object.fromEntries(Object.entries(byCurrency).map(([c, b]) => [c, simplifyDebts(b)]))
}
