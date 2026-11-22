/**
 * Interfaz mínima con el servidor. La cola y la bajada de cambios dependen de
 * esto (no de supabase-js directo) para poder testearlas sin red.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { SyncTable } from './db'

export type RemoteResult =
  | { kind: 'ok'; row: Record<string, any> | null }
  | { kind: 'network'; message: string }
  | { kind: 'rejected'; message: string }

export interface Remote {
  upsert(table: SyncTable, row: Record<string, unknown>): Promise<RemoteResult>
  update(table: SyncTable, row: Record<string, unknown>): Promise<RemoteResult>
  fetchOne(table: SyncTable, id: string): Promise<RemoteResult>
  select(
    table: SyncTable | 'trips',
    tripId: string,
    since: string | null,
    offset: number,
    limit: number,
  ): Promise<{ kind: 'ok'; rows: Record<string, any>[] } | { kind: 'network' | 'rejected' | 'missing'; message: string }>
}

interface PgError {
  message: string
  code?: string
  details?: string
  hint?: string
}

function classify(error: PgError, status?: number): 'network' | 'rejected' | 'missing' {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'network'
  if (!status || status >= 500 || /fetch|network|load failed|timeout|abort/i.test(error.message)) return 'network'
  // Tabla que todavía no existe (por ejemplo, V2 sin migrar).
  if (error.code === 'PGRST205' || error.code === '42P01') return 'missing'
  if (status === 401) return 'network' // token vencido: se renueva y se reintenta
  return 'rejected'
}

/** Mensaje entendible para la persona a partir del error de la base. */
export function friendlyError(error: PgError): string {
  const m = error.message || ''
  if (/row-level security/i.test(m)) return 'No tenés permiso para guardar esto. Probá volver a entrar.'
  return m.replace(/^.*?ERROR:\s*/, '')
}

// Pedidos en curso: se cancelan al cortarse o volver la señal, para no quedar esperando
// reintentos de una conexión vieja (supabase-js reintenta solo los GET que fallan).
let inflight = new AbortController()
export function abortInflight() {
  inflight.abort()
  inflight = new AbortController()
}
function signal() {
  return AbortSignal.any ? AbortSignal.any([inflight.signal, AbortSignal.timeout(20_000)]) : inflight.signal
}

export function supabaseRemote(sb: SupabaseClient): Remote {
  const wrap = async (p: PromiseLike<{ data: any; error: PgError | null; status: number }>): Promise<RemoteResult> => {
    try {
      const { data, error, status } = await p
      if (error) {
        const kind = classify(error, status)
        return { kind: kind === 'missing' ? 'rejected' : kind, message: friendlyError(error) }
      }
      return { kind: 'ok', row: data ?? null }
    } catch (e) {
      return { kind: 'network', message: (e as Error).message }
    }
  }
  return {
    upsert: (table, row) => wrap(sb.from(table).upsert(row, { onConflict: 'id' }).select().abortSignal(signal()).maybeSingle()),
    update: (table, row) => {
      const { id, ...rest } = row
      return wrap(sb.from(table).update(rest).eq('id', id as string).select().abortSignal(signal()).maybeSingle())
    },
    fetchOne: (table, id) => wrap(sb.from(table).select('*').eq('id', id).abortSignal(signal()).maybeSingle()),
    async select(table, tripId, since, offset, limit) {
      try {
        let q = sb.from(table).select('*')
        q = table === 'trips' ? q.eq('id', tripId) : q.eq('trip_id', tripId)
        if (since) q = q.gt('updated_at', since)
        const { data, error, status } = await q.order('updated_at').order('id').range(offset, offset + limit - 1).abortSignal(signal())
        if (error) return { kind: classify(error, status), message: friendlyError(error) }
        return { kind: 'ok', rows: data ?? [] }
      } catch (e) {
        return { kind: 'network', message: (e as Error).message }
      }
    },
  }
}
