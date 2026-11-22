/**
 * Tipo de cambio automático con Frankfurter (BCE, gratis, sin key) y siempre
 * editable a mano. ARS no está en el BCE: se carga a mano (depende de con qué
 * se pagó) y se recuerda el último que usó este celular.
 */
import { invertRate, rateFromNumber } from '#shared/money/fx'
import { getMeta, setMeta } from '~/sync/db'

interface RatesCache {
  base: string
  date: string
  fetchedAt: string
  /** 1 base = x moneda */
  rates: Record<string, number>
}

export const MANUAL_ONLY = new Set(['ARS'])

export type FxQuote =
  | { rate: string; source: 'same' | 'auto' | 'cached'; date: string }
  | { rate: string | null; source: 'manual'; date: null }

const MAX_AGE_MS = 6 * 60 * 60 * 1000

async function fetchRates(base: string): Promise<RatesCache | null> {
  for (const url of [`https://api.frankfurter.dev/v1/latest?base=${base}`, `https://api.frankfurter.app/latest?from=${base}`]) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const j = await res.json()
      return { base, date: j.date, fetchedAt: new Date().toISOString(), rates: j.rates }
    } catch {
      /* probar el siguiente */
    }
  }
  return null
}

async function ratesFor(base: string, forceFresh = false): Promise<{ cache: RatesCache | null; fresh: boolean }> {
  const key = `fx:${base}`
  const cached = await getMeta<RatesCache>(key)
  const stale = !cached || Date.now() - Date.parse(cached.fetchedAt) > MAX_AGE_MS
  if ((stale || forceFresh) && navigator.onLine) {
    const fresh = await fetchRates(base)
    if (fresh) {
      await setMeta(key, fresh)
      return { cache: fresh, fresh: true }
    }
  }
  return { cache: cached ?? null, fresh: false }
}

/** Tipo de cambio para pasar de `currency` a `base`. */
export async function quoteRate(currency: string, base: string): Promise<FxQuote> {
  const cur = currency.toUpperCase()
  if (cur === base.toUpperCase()) return { rate: '1', source: 'same', date: new Date().toISOString().slice(0, 10) }
  if (MANUAL_ONLY.has(cur)) return { rate: (await getMeta<string>(`fxManual:${cur}`)) ?? null, source: 'manual', date: null }
  const { cache, fresh } = await ratesFor(base)
  const perBase = cache?.rates[cur]
  if (!perBase) return { rate: (await getMeta<string>(`fxManual:${cur}`)) ?? null, source: 'manual', date: null }
  return { rate: invertRate(rateFromNumber(perBase)), source: fresh ? 'auto' : 'cached', date: cache!.date }
}

export async function rememberManualRate(currency: string, rate: string) {
  await setMeta(`fxManual:${currency.toUpperCase()}`, rate)
}

export async function warmRates(base: string) {
  await ratesFor(base)
}
