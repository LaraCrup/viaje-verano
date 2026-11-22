/**
 * Tipos de cambio sin floats.
 *
 * Un tipo de cambio se guarda como texto decimal ("0.92", "0.000689655172"):
 * cuántas unidades MAYORES de la moneda base vale 1 unidad mayor de la moneda del gasto.
 * Ejemplo con base USD: EUR → "1.08", ARS → "0.000689655172" (1 USD = 1450 ARS).
 *
 * Las cuentas se hacen con BigInt escalado, y se redondea al entero más cercano
 * (mitades lejos del cero), siempre igual en todos los celulares.
 */
import { minorDigits, type Minor } from './currency'

export const RATE_DECIMALS = 12

interface Decimal {
  num: bigint
  scale: bigint // 10^decimales
}

export function parseRate(rate: string): Decimal {
  const s = rate.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`Tipo de cambio inválido: "${rate}"`)
  const [int, frac = ''] = s.split('.')
  const num = BigInt(int! + frac)
  if (num === 0n) throw new Error('El tipo de cambio no puede ser 0')
  return { num, scale: 10n ** BigInt(frac.length) }
}

export function isValidRate(rate: string): boolean {
  try {
    parseRate(rate)
    return true
  } catch {
    return false
  }
}

/** División entera con redondeo de mitades lejos del cero. */
export function divRound(n: bigint, d: bigint): bigint {
  if (d === 0n) throw new Error('División por cero')
  const neg = (n < 0n) !== (d < 0n)
  const an = n < 0n ? -n : n
  const ad = d < 0n ? -d : d
  const q = (an * 2n + ad) / (ad * 2n)
  return neg ? -q : q
}

/** Convierte un monto en unidades menores de `from` a unidades menores de `to`. */
export function convertMinor(amount: Minor, from: string, to: string, rate: string): Minor {
  if (from.toUpperCase() === to.toUpperCase()) return amount
  const { num, scale } = parseRate(rate)
  const shift = minorDigits(to) - minorDigits(from)
  let n = BigInt(amount) * num
  let d = scale
  if (shift >= 0) n *= 10n ** BigInt(shift)
  else d *= 10n ** BigInt(-shift)
  return Number(divRound(n, d))
}

/** Invierte un tipo de cambio ("1 USD = 1450 ARS" → "0.000689655172"). */
export function invertRate(rate: string, decimals = RATE_DECIMALS): string {
  const { num, scale } = parseRate(rate)
  const scaled = divRound(scale * 10n ** BigInt(decimals), num)
  return decimalToString(scaled, decimals)
}

/** Normaliza un número que viene de una API (puede ser float) a texto decimal fijo. */
export function rateFromNumber(value: number, decimals = RATE_DECIMALS): string {
  if (!Number.isFinite(value) || value <= 0) throw new Error('Tipo de cambio inválido')
  return trimZeros(value.toFixed(decimals))
}

function decimalToString(scaled: bigint, decimals: number): string {
  const s = scaled.toString().padStart(decimals + 1, '0')
  return trimZeros(`${s.slice(0, -decimals)}.${s.slice(-decimals)}`)
}

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
}

/** Para mostrar: "1 EUR = 1,08 USD". */
export function describeRate(rate: string, from: string, to: string): string {
  const n = Number(rate)
  const nice = n >= 1 ? n.toLocaleString('es-AR', { maximumFractionDigits: 4 }) : null
  if (nice) return `1 ${from} = ${nice} ${to}`
  const inv = Number(invertRate(rate, 6))
  return `1 ${to} = ${inv.toLocaleString('es-AR', { maximumFractionDigits: 2 })} ${from}`
}
