/**
 * Monedas y montos.
 *
 * Todos los montos de la app son ENTEROS en unidades menores (centavos, agorot, etc.).
 * Nunca se guarda ni se suma un float. Los decimales de cada moneda salen de la
 * tabla ISO 4217 que trae el navegador (Intl), así funciona con cualquier código.
 */

export type Minor = number

export const DEFAULT_CURRENCIES = ['USD', 'EUR', 'ILS', 'ARS'] as const

const digitsCache = new Map<string, number>()

/** Cantidad de decimales de una moneda ISO (USD → 2, JPY → 0). */
export function minorDigits(currency: string): number {
  const code = currency.toUpperCase()
  const cached = digitsCache.get(code)
  if (cached !== undefined) return cached
  let digits = 2
  try {
    digits = new Intl.NumberFormat('en', { style: 'currency', currency: code }).resolvedOptions()
      .maximumFractionDigits ?? 2
  } catch {
    throw new Error(`Moneda desconocida: ${currency}`)
  }
  digitsCache.set(code, digits)
  return digits
}

export function isValidCurrency(currency: string): boolean {
  if (!/^[A-Za-z]{3}$/.test(currency)) return false
  try {
    minorDigits(currency)
    return true
  } catch {
    return false
  }
}

export function assertMinor(value: number, label = 'monto'): void {
  if (!Number.isSafeInteger(value)) throw new Error(`El ${label} tiene que ser un entero en unidades menores`)
}

/**
 * Convierte lo que escribe una persona a unidades menores.
 * Acepta "12,50", "12.50", "1.234,56", "1,234.56", "1.500" (mil quinientos), "$ 30".
 * Devuelve null si no se puede leer.
 */
export function parseAmount(input: string, currency: string): Minor | null {
  const digits = minorDigits(currency)
  let s = input.trim().replace(/[\s$€₪]/g, '').replace(/[A-Za-z]/g, '')
  if (!s) return null
  const negative = s.startsWith('-')
  if (negative) s = s.slice(1)
  if (!/^[\d.,]+$/.test(s)) return null

  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  let intPart: string
  let fracPart = ''

  if (lastDot >= 0 && lastComma >= 0) {
    // El separador que aparece último es el decimal.
    const dec = lastDot > lastComma ? '.' : ','
    const thousands = dec === '.' ? ',' : '.'
    const [i, f = ''] = s.split(dec)
    intPart = i!.split(thousands).join('')
    fracPart = f
    if (s.split(dec).length > 2) return null
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? ',' : '.'
    const parts = s.split(sep)
    const tail = parts[parts.length - 1]!
    // "1.500" o "1.500.000": separador de miles. "1,5" o "1.5": decimal.
    const looksLikeThousands = (parts.length > 2 || tail.length === 3) && parts.slice(1).every(p => p.length === 3)
    if (looksLikeThousands && digits < 3) {
      intPart = parts.join('')
    } else if (parts.length === 2) {
      intPart = parts[0]!
      fracPart = tail
    } else {
      return null
    }
  } else {
    intPart = s
  }

  if (intPart === '') intPart = '0'
  if (!/^\d+$/.test(intPart) || (fracPart && !/^\d+$/.test(fracPart))) return null
  if (fracPart.length > digits) return null

  const minor = Number(intPart) * 10 ** digits + Number((fracPart || '').padEnd(digits, '0') || '0')
  if (!Number.isSafeInteger(minor)) return null
  return negative ? -minor : minor
}

/** Formato para mostrar: "US$ 12,50", "€ 3,00", "₪ 40,00". */
export function formatMoney(minor: Minor, currency: string, opts: { signed?: boolean } = {}): string {
  const digits = minorDigits(currency)
  const fmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: opts.signed ? 'exceptZero' : 'auto',
  })
  // Solo para mostrar: la división acá no afecta ningún cálculo.
  return fmt.format(minor / 10 ** digits)
}

/** Monto sin símbolo, para inputs: "12,50". */
export function formatPlain(minor: Minor, currency: string): string {
  const digits = minorDigits(currency)
  const sign = minor < 0 ? '-' : ''
  const abs = Math.abs(minor)
  const int = Math.floor(abs / 10 ** digits)
  const frac = abs % 10 ** digits
  return digits === 0 ? `${sign}${int}` : `${sign}${int},${String(frac).padStart(digits, '0')}`
}
