/**
 * Copia local de todo el viaje en IndexedDB (Dexie).
 * La UI SIEMPRE lee de acá; nunca espera a la red.
 */
import Dexie, { type Table } from 'dexie'

/** Tablas que se sincronizan con Supabase (todas tienen trip_id y metadatos de sync). */
export const SYNC_TABLES = [
  'members',
  'places',
  'chapters',
  'days',
  'pots',
  'expenses',
  'settlements',
  'transports',
  'stays',
  'plans',
  'attachments',
  // V2
  'polls',
  'poll_options',
  'poll_votes',
  'checklist_items',
  'country_info',
  'journal_entries',
] as const

export type SyncTable = (typeof SYNC_TABLES)[number]

/** Tablas que la app solo puede editar (no crear). */
export const UPDATE_ONLY_TABLES: SyncTable[] = ['members']

export interface OutboxItem {
  seq?: number
  table: SyncTable
  rowId: string
  /** Fila completa como quedó en el celular. */
  row: Record<string, unknown>
  /** Versión del servidor sobre la que se editó (para avisar si alguien más la tocó). */
  baseVersion: number | null
  enqueuedAt: string
  attempts: number
  lastError?: string
}

export interface FailedItem extends OutboxItem {
  failedAt: string
}

export interface MetaRow {
  key: string
  value: unknown
}

export interface FileRow {
  path: string
  blob: Blob
  mime: string
  cachedAt: string
  /** true = se sacó sin señal y todavía no se subió. */
  pendingUpload: boolean
}

type AnyRow = Record<string, any> & { id: string; trip_id: string }

export class TripDB extends Dexie {
  trips!: Table<AnyRow, string>
  members!: Table<AnyRow, string>
  places!: Table<AnyRow, string>
  chapters!: Table<AnyRow, string>
  days!: Table<AnyRow, string>
  pots!: Table<AnyRow, string>
  expenses!: Table<AnyRow, string>
  settlements!: Table<AnyRow, string>
  transports!: Table<AnyRow, string>
  stays!: Table<AnyRow, string>
  plans!: Table<AnyRow, string>
  attachments!: Table<AnyRow, string>
  polls!: Table<AnyRow, string>
  poll_options!: Table<AnyRow, string>
  poll_votes!: Table<AnyRow, string>
  checklist_items!: Table<AnyRow, string>
  country_info!: Table<AnyRow, string>
  journal_entries!: Table<AnyRow, string>
  outbox!: Table<OutboxItem, number>
  failed!: Table<FailedItem, number>
  meta!: Table<MetaRow, string>
  files!: Table<FileRow, string>

  constructor(name = 'viaje-2026') {
    super(name)
    this.version(1).stores({
      trips: 'id',
      members: 'id, trip_id',
      places: 'id, trip_id',
      chapters: 'id, trip_id',
      days: 'id, trip_id, date',
      pots: 'id, trip_id',
      expenses: 'id, trip_id, date',
      settlements: 'id, trip_id, date',
      transports: 'id, trip_id, depart_at',
      stays: 'id, trip_id',
      plans: 'id, trip_id, day_id',
      attachments: 'id, trip_id, owner_id',
      polls: 'id, trip_id',
      poll_options: 'id, trip_id, poll_id',
      poll_votes: 'id, trip_id, poll_id',
      checklist_items: 'id, trip_id',
      country_info: 'id, trip_id',
      journal_entries: 'id, trip_id, date',
      outbox: '++seq, [table+rowId]',
      failed: '++seq',
      meta: 'key',
      files: 'path',
    })
  }

  table_(name: SyncTable | 'trips'): Table<AnyRow, string> {
    return this.table(name) as Table<AnyRow, string>
  }
}

let instance: TripDB | null = null

export function getDb(): TripDB {
  if (!instance) instance = new TripDB()
  return instance
}

/** Solo para tests. */
export function setDb(db: TripDB) {
  instance = db
}

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await getDb().meta.get(key))?.value as T | undefined
}

export async function setMeta(key: string, value: unknown) {
  await getDb().meta.put({ key, value })
}

/** Borra todo lo local (al salir del viaje). */
export async function wipeLocal() {
  const db = getDb()
  await Promise.all(db.tables.map(t => t.clear()))
}
