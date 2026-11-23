/**
 * Cola de cambios pendientes (outbox).
 *
 * 1. Cada cambio se aplica al instante en IndexedDB (la pantalla se actualiza ya)
 *    y se anota en la cola con la hora en que se hizo (client_updated_at).
 * 2. La cola se manda en orden cuando hay señal. Si se corta, se reintenta.
 * 3. Conflictos: gana la edición más reciente según cuándo se hizo (lo resuelve
 *    la base). Si alguien más había editado lo mismo, se avisa; la versión
 *    anterior queda en el historial.
 * 4. Si la base rechaza un cambio (por ejemplo, un gasto que no cierra), se saca
 *    de la cola, se guarda en "failed" y se vuelve a traer la versión del servidor.
 *
 * Los ids se generan en el celular, así que reintentar nunca duplica nada.
 */
import { getDb, UPDATE_ONLY_TABLES, type OutboxItem, type SyncTable } from './db'
import { normalizeRow } from './normalize'
import type { Remote } from './remote'

const SERVER_FIELDS = ['created_at', 'created_by', 'updated_at', 'updated_by', 'version']

export interface FlushHooks {
  /** Otra persona había editado lo mismo en el medio (quedó esta versión). */
  onConcurrentEdit?: (item: OutboxItem, serverRow: Record<string, any>) => void
  /** Había una edición más nueva en el servidor; la nuestra se descartó. */
  onSuperseded?: (item: OutboxItem, serverRow: Record<string, any> | null) => void
  /** La base rechazó el cambio. */
  onRejected?: (item: OutboxItem, message: string) => void
}

export type FlushStatus = 'done' | 'offline'

function nowIso() {
  return new Date().toISOString()
}

/** Guarda un cambio local y lo encola para mandar. Devuelve la fila guardada. */
export async function enqueue<T extends { id: string; trip_id: string }>(
  table: SyncTable,
  row: T,
  opts: { clock?: () => string } = {},
): Promise<T> {
  const db = getDb()
  const at = (opts.clock ?? nowIso)()
  const local = db.table_(table)
  // Copia "plana": las filas que vienen de la pantalla son reactivas (Vue) y sus partes anidadas
  // (quién pagó, cómo se dividió) también; IndexedDB no puede guardar esos proxies (DataCloneError).
  // Las filas son JSON puro (vienen de la base), así que la copia por JSON no pierde nada.
  const full = JSON.parse(JSON.stringify({ ...row, client_updated_at: at })) as T & { client_updated_at: string }

  await db.transaction('rw', local, db.outbox, async () => {
    const previous = await local.get(row.id)
    await local.put(full)
    const existing = await db.outbox.where('[table+rowId]').equals([table, row.id]).first()
    if (existing) {
      // Se junta con el cambio pendiente de la misma fila: se manda solo la última versión.
      await db.outbox.update(existing.seq!, { row: full, enqueuedAt: at })
    } else {
      await db.outbox.add({
        table,
        rowId: row.id,
        row: full,
        baseVersion: (previous?.version as number | undefined) ?? null,
        enqueuedAt: at,
        attempts: 0,
      })
    }
  })
  return full
}

/** Borrado lógico (llega a todos y queda en el historial). */
export async function softDelete(table: SyncTable, row: { id: string; trip_id: string }) {
  return enqueue(table, { ...row, deleted_at: nowIso() })
}

export async function restore(table: SyncTable, row: { id: string; trip_id: string }) {
  return enqueue(table, { ...row, deleted_at: null })
}

export async function pendingCount(): Promise<number> {
  return getDb().outbox.count()
}

/** Ids con cambios sin mandar: la bajada de cambios no los pisa. */
export async function pendingIds(table: SyncTable): Promise<Set<string>> {
  const items = await getDb().outbox.filter(i => i.table === table).toArray()
  return new Set(items.map(i => i.rowId))
}

function payloadOf(row: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) if (!SERVER_FIELDS.includes(k)) out[k] = v
  return out
}

let running: Promise<FlushStatus> | null = null

export function flush(remote: Remote, hooks: FlushHooks = {}): Promise<FlushStatus> {
  if (!running) running = doFlush(remote, hooks).finally(() => (running = null))
  return running
}

async function doFlush(remote: Remote, hooks: FlushHooks): Promise<FlushStatus> {
  const db = getDb()
  for (;;) {
    const item = await db.outbox.orderBy('seq').first()
    if (!item) return 'done'

    const payload = payloadOf(item.row)
    const res = UPDATE_ONLY_TABLES.includes(item.table)
      ? await remote.update(item.table, payload)
      : await remote.upsert(item.table, payload)

    if (res.kind === 'network') {
      await db.outbox.update(item.seq!, { attempts: item.attempts + 1, lastError: res.message })
      return 'offline'
    }

    // ¿Se volvió a editar la fila mientras se mandaba? Entonces queda en la cola.
    const current = await db.outbox.get(item.seq!)
    const editedMeanwhile = current && current.row.client_updated_at !== item.row.client_updated_at

    if (res.kind === 'rejected') {
      await db.failed.add({ ...item, lastError: res.message, failedAt: nowIso() })
      if (!editedMeanwhile) {
        await db.outbox.delete(item.seq!)
        await refreshFromServer(remote, item.table, item.rowId, item.baseVersion === null)
      }
      hooks.onRejected?.(item, res.message)
      continue
    }

    if (!editedMeanwhile) await db.outbox.delete(item.seq!)

    if (res.row) {
      if (!editedMeanwhile) await db.table_(item.table).put(normalizeRow(item.table, res.row))
      if (item.baseVersion !== null && Number(res.row.version) > item.baseVersion + 1) {
        hooks.onConcurrentEdit?.(item, res.row)
      }
    } else {
      // La base descartó el cambio porque ya tenía uno más nuevo: se trae ese.
      const server = await refreshFromServer(remote, item.table, item.rowId, false)
      hooks.onSuperseded?.(item, server)
    }
  }
}

async function refreshFromServer(remote: Remote, table: SyncTable, id: string, wasNew: boolean) {
  const res = await remote.fetchOne(table, id)
  if (res.kind !== 'ok') return null
  const local = getDb().table_(table)
  if (res.row) await local.put(normalizeRow(table, res.row))
  else if (wasNew) await local.delete(id) // nunca llegó a existir en el servidor
  return res.row
}
