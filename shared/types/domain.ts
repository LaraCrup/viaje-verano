/**
 * Tipos de las filas tal como viven en la base y en IndexedDB.
 * Montos en unidades menores. Fechas de día "YYYY-MM-DD". Instantes en ISO (UTC).
 */
import type { SplitMode } from '../money/split'
import type { TransportKind } from '../time/trip'

export interface SyncMeta {
  id: string
  trip_id: string
  created_at?: string
  created_by?: string | null
  updated_at?: string
  updated_by?: string | null
  client_updated_at?: string | null
  deleted_at?: string | null
  version?: number
}

export interface Trip {
  id: string
  slug: string
  name: string
  start_date: string
  end_date: string
  base_currency: string
  home_tz: string
  updated_at?: string
}

export interface Member extends SyncMeta {
  name: string
  color: string
  emoji: string | null
  sort: number
}

export interface Place extends SyncMeta {
  name: string
  country: string | null
  tz: string
  lat: number | null
  lon: number | null
  iata: string | null
}

export interface Chapter extends SyncMeta {
  name: string
  color: string
  accent: string
  emoji: string | null
  start_date: string
  end_date: string
  place_id: string | null
  currency: string | null
  sort: number
}

export interface Day extends SyncMeta {
  date: string
  chapter_id: string | null
  place_id: string | null
  title: string | null
  notes: string | null
  night_override: string | null
}

export type CategoryIdStr = 'comida' | 'super' | 'alojamiento' | 'transporte' | 'salidas' | 'actividades' | 'compras' | 'otros'

export interface Expense extends SyncMeta {
  description: string
  category: CategoryIdStr
  currency: string
  amount_minor: number
  fx_rate: string
  fx_source: 'same' | 'auto' | 'cached' | 'manual'
  base_amount_minor: number
  date: string
  chapter_id: string | null
  place_id: string | null
  split_mode: SplitMode
  payers: Record<string, number>
  shares: Record<string, number>
  split_inputs: Record<string, number>
  receipt_path: string | null
  note: string | null
}

export interface Settlement extends SyncMeta {
  from_id: string
  to_id: string
  currency: string
  amount_minor: number
  fx_rate: string
  base_amount_minor: number
  date: string
  note: string | null
}

export type Status = 'pending' | 'booked' | 'cancelled'

export interface Transport extends SyncMeta {
  kind: TransportKind
  status: Status
  code: string | null
  carrier: string | null
  origin_label: string | null
  origin_place_id: string | null
  dest_label: string | null
  dest_place_id: string | null
  depart_at: string | null
  depart_tz: string | null
  arrive_at: string | null
  arrive_tz: string | null
  terminal: string | null
  booking_ref: string | null
  purchased_by: string | null
  expense_id: string | null
  leave_buffer_min: number | null
  travel_to_min: number | null
  notes: string | null
}

export interface Stay extends SyncMeta {
  chapter_id: string | null
  name: string
  kind: string | null
  status: Status
  address: string | null
  lat: number | null
  lon: number | null
  check_in_date: string | null
  check_in_time: string | null
  check_out_date: string | null
  check_out_time: string | null
  booking_url: string | null
  /** Link de Google Maps cargado a mano; si no hay, "Cómo llegar" busca la dirección. */
  maps_url: string | null
  contact: string | null
  wifi_name: string | null
  wifi_pass: string | null
  door_code: string | null
  guests: number | null
  expense_id: string | null
  notes: string | null
}

export interface Plan extends SyncMeta {
  chapter_id: string | null
  day_id: string | null
  start_time: string | null
  title: string
  notes: string | null
  maps_url: string | null
  status: 'pending' | 'done' | 'skipped'
  proposed_by: string | null
  group_label: string | null
  sort: number
}

export interface Attachment extends SyncMeta {
  owner_type: 'transport' | 'stay' | 'expense' | 'journal' | 'other'
  owner_id: string
  member_id: string | null
  storage_path: string
  mime: string | null
  name: string | null
  size_bytes: number | null
}

export interface ActivityEntry {
  id: number
  trip_id: string
  entity: string
  entity_id: string
  action: 'insert' | 'update' | 'delete' | 'restore'
  actor_member_id: string | null
  at: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}

// ---- V2 ----

export interface Poll extends SyncMeta {
  question: string
  chapter_id: string | null
  multiple: boolean
  closes_at: string | null
  closed: boolean
}

export interface PollOption extends SyncMeta {
  poll_id: string
  label: string
  plan_id: string | null
  sort: number
}

export interface PollVote extends SyncMeta {
  poll_id: string
  member_id: string
  option_ids: string[]
}

export interface ChecklistItem extends SyncMeta {
  list: 'valija' | 'documentos' | 'grupo'
  owner_member_id: string | null
  text: string
  done: boolean
  sort: number
}

export interface CountryInfo extends SyncMeta {
  country: string
  section: string
  title: string
  body: string
  needs_check: boolean
  sort: number
}

export interface JournalEntry extends SyncMeta {
  date: string
  member_id: string | null
  text: string | null
  photo_path: string | null
}
