/**
 * PostgREST devuelve numeric como número de JS (float) y bigint como número.
 * Los tipos de cambio se guardan localmente como texto decimal exacto.
 */
import { rateFromNumber } from '#shared/money/fx'

const RATE_FIELDS = ['fx_rate']

export function normalizeRate(v: unknown): string {
  if (typeof v === 'string') return v
  if (typeof v === 'number') return rateFromNumber(v)
  return '1'
}

export function normalizeRow(_table: string, row: Record<string, any>): Record<string, any> & { id: string; trip_id: string } {
  const out = { ...row }
  for (const f of RATE_FIELDS) if (f in out) out[f] = normalizeRate(out[f])
  for (const f of ['amount_minor', 'base_amount_minor']) if (typeof out[f] === 'string') out[f] = Number(out[f])
  return out as Record<string, any> & { id: string; trip_id: string }
}
