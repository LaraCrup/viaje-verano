/**
 * Bajada de cambios: trae solo lo que cambió desde la última vez (por updated_at).
 *
 * Se pide con 2 minutos de margen hacia atrás para no perder filas de
 * transacciones que terminaron tarde; repetir filas no hace daño (upsert por id).
 * Nunca pisa filas con cambios locales sin mandar.
 */
import { getDb, getMeta, setMeta, SYNC_TABLES, type SyncTable } from './db'
import { normalizeRow } from './normalize'
import { pendingIds } from './outbox'
import type { Remote } from './remote'

const PAGE = 500
const OVERLAP_MS = 2 * 60 * 1000

export type PullStatus = 'done' | 'offline'

export async function pullAll(remote: Remote, tripId: string): Promise<PullStatus> {
  for (const table of ['trips', ...SYNC_TABLES] as const) {
    const status = await pullTable(remote, tripId, table)
    if (status === 'offline') return 'offline'
  }
  await setMeta(`lastPull:${tripId}`, new Date().toISOString())
  return 'done'
}

export async function pullTable(remote: Remote, tripId: string, table: SyncTable | 'trips'): Promise<PullStatus> {
  const key = `cursor:${tripId}:${table}`
  const cursor = await getMeta<string>(key)
  const since = cursor ? new Date(Date.parse(cursor) - OVERLAP_MS).toISOString() : null
  let offset = 0
  let max = cursor ?? null

  for (;;) {
    const res = await remote.select(table, tripId, since, offset, PAGE)
    if (res.kind === 'network') return 'offline'
    if (res.kind !== 'ok') return 'done' // tabla que todavía no existe: se ignora
    await applyRemoteRows(table, res.rows)
    for (const r of res.rows) if (!max || r.updated_at > max) max = r.updated_at
    if (res.rows.length < PAGE) break
    offset += PAGE
  }
  if (max) await setMeta(key, max)
  return 'done'
}

/** Aplica filas que vienen del servidor (pull o Realtime) sin pisar cambios locales pendientes. */
export async function applyRemoteRows(table: SyncTable | 'trips', rows: Record<string, any>[]) {
  if (rows.length === 0) return
  const db = getDb()
  const skip = table === 'trips' ? new Set<string>() : await pendingIds(table)
  const fresh = rows.filter(r => !skip.has(r.id)).map(r => normalizeRow(table, r))
  // Si llega una versión más vieja que la que ya tenemos (Realtime desordenado), se ignora.
  const local = db.table_(table)
  const existing = await local.bulkGet(fresh.map(r => r.id))
  const toPut = fresh.filter((r, i) => {
    const e = existing[i]
    return !e || e.version === undefined || r.version === undefined || r.version >= e.version
  })
  await local.bulkPut(toPut)
}
