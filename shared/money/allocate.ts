/**
 * Reparto de un entero en partes proporcionales sin perder ni inventar centavos.
 *
 * Método del mayor resto (Hamilton): cada parte recibe el piso de su proporción
 * y los centavos que sobran van a los restos más grandes. Si hay empate, se usa
 * un orden determinístico que rota según una semilla (el id del gasto): así el
 * centavo de más no le cae siempre a la misma persona, y todos los celulares
 * calculan exactamente lo mismo.
 */
import type { Minor } from './currency'

/** FNV-1a de 32 bits: hash estable y simple para la semilla. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/**
 * Orden de desempate: las claves se ordenan alfabéticamente (no dependen del orden
 * en que se tocaron en la pantalla) y se rotan según la semilla.
 */
export function tieBreakOrder(keys: string[], seed: string): string[] {
  const sorted = [...keys].sort()
  if (sorted.length === 0) return sorted
  const k = hashSeed(seed) % sorted.length
  return [...sorted.slice(k), ...sorted.slice(0, k)]
}

/**
 * Reparte `total` según `weights` (enteros ≥ 0). Devuelve enteros que suman exactamente `total`.
 * Funciona también con totales negativos (se reparte el valor absoluto y se le pone el signo).
 */
export function allocate(total: Minor, weights: Record<string, number>, seed: string): Record<string, Minor> {
  const keys = Object.keys(weights)
  const result: Record<string, Minor> = {}
  if (keys.length === 0) {
    if (total !== 0) throw new Error('No hay entre quiénes repartir')
    return result
  }
  const w = keys.map(k => {
    const v = weights[k]!
    if (!Number.isSafeInteger(v) || v < 0) throw new Error('Los pesos tienen que ser enteros positivos')
    return BigInt(v)
  })
  const sumW = w.reduce((a, b) => a + b, 0n)
  if (sumW === 0n) throw new Error('Los pesos suman 0')

  const sign = total < 0 ? -1n : 1n
  const abs = BigInt(Math.abs(total))
  const floors = new Map<string, bigint>()
  const remainders = new Map<string, bigint>()
  let assigned = 0n
  keys.forEach((k, i) => {
    const prod = abs * w[i]!
    const f = prod / sumW
    floors.set(k, f)
    remainders.set(k, prod % sumW)
    assigned += f
  })

  let leftover = abs - assigned
  const order = tieBreakOrder(keys, seed)
  const position = new Map(order.map((k, i) => [k, i]))
  const byRemainder = [...keys].sort((a, b) => {
    const ra = remainders.get(a)!
    const rb = remainders.get(b)!
    if (ra !== rb) return ra > rb ? -1 : 1
    return position.get(a)! - position.get(b)!
  })
  for (const k of byRemainder) {
    if (leftover === 0n) break
    if (w[keys.indexOf(k)] === 0n) continue
    floors.set(k, floors.get(k)! + 1n)
    leftover -= 1n
  }

  for (const k of keys) result[k] = Number(floors.get(k)! * sign)
  return result
}
