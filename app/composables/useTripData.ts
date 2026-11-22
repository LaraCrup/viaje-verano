/**
 * Todos los datos del viaje, en vivo desde IndexedDB.
 * Se suscribe una sola vez; cualquier cambio (local, pull o Realtime) actualiza la UI.
 */
import { liveQuery, type Subscription } from 'dexie'
import type {
  Attachment, Chapter, ChecklistItem, CountryInfo, Day, Expense, JournalEntry, Member, Place, Plan, Poll, PollOption, PollVote,
  Pot, Settlement, Stay, Transport, Trip,
} from '#shared/types/domain'
import { uuid } from '~/lib/supabase'
import { getDb, type SyncTable } from '~/sync/db'
import { enqueue, restore, softDelete } from '~/sync/outbox'

export const tripData = reactive({
  loaded: false,
  trip: null as Trip | null,
  members: [] as Member[],
  places: [] as Place[],
  chapters: [] as Chapter[],
  days: [] as Day[],
  pots: [] as Pot[],
  expenses: [] as Expense[],
  settlements: [] as Settlement[],
  transports: [] as Transport[],
  stays: [] as Stay[],
  plans: [] as Plan[],
  attachments: [] as Attachment[],
  polls: [] as Poll[],
  poll_options: [] as PollOption[],
  poll_votes: [] as PollVote[],
  checklist_items: [] as ChecklistItem[],
  country_info: [] as CountryInfo[],
  journal_entries: [] as JournalEntry[],
})

type ListKey = Exclude<keyof typeof tripData, 'loaded' | 'trip'>

const SORTS: Partial<Record<ListKey, (a: any, b: any) => number>> = {
  members: (a, b) => a.sort - b.sort,
  chapters: (a, b) => a.sort - b.sort,
  days: (a, b) => (a.date < b.date ? -1 : 1),
  expenses: (a, b) => (a.date === b.date ? (a.created_at ?? a.client_updated_at ?? '') < (b.created_at ?? b.client_updated_at ?? '') ? 1 : -1 : a.date < b.date ? 1 : -1),
  settlements: (a, b) => (a.date < b.date ? 1 : -1),
  transports: (a, b) => (a.depart_at ?? '9999') < (b.depart_at ?? '9999') ? -1 : 1,
  stays: (a, b) => (a.check_in_date ?? '9999') < (b.check_in_date ?? '9999') ? -1 : 1,
  plans: (a, b) => a.sort - b.sort || (a.start_time ?? '').localeCompare(b.start_time ?? ''),
  polls: (a, b) => ((a.created_at ?? a.client_updated_at ?? '') < (b.created_at ?? b.client_updated_at ?? '') ? 1 : -1),
  poll_options: (a, b) => a.sort - b.sort,
  checklist_items: (a, b) => a.sort - b.sort || ((a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1),
  country_info: (a, b) => a.sort - b.sort,
  journal_entries: (a, b) => (a.date < b.date ? 1 : -1),
}

let subs: Subscription[] = []
let current = ''

export function loadTripData(tripId: string) {
  if (current === tripId) return
  subs.forEach(s => s.unsubscribe())
  subs = []
  current = tripId
  const db = getDb()
  const lists: ListKey[] = [
    'members', 'places', 'chapters', 'days', 'pots', 'expenses', 'settlements', 'transports', 'stays', 'plans', 'attachments',
    'polls', 'poll_options', 'poll_votes', 'checklist_items', 'country_info', 'journal_entries',
  ]
  let pending = lists.length + 1
  const done = () => {
    if (--pending <= 0) tripData.loaded = true
  }
  subs.push(liveQuery(() => db.trips.get(tripId)).subscribe(t => {
    tripData.trip = (t as unknown as Trip) ?? null
    done()
  }))
  for (const key of lists) {
    let first = true
    subs.push(
      liveQuery(() => db.table_(key as SyncTable).where('trip_id').equals(tripId).filter(r => !r.deleted_at).toArray()).subscribe(rows => {
        const sort = SORTS[key]
        ;(tripData as any)[key] = sort ? rows.sort(sort) : rows
        if (first) {
          first = false
          done()
        }
      }),
    )
  }
}

/** Guardar (crear o editar) desde la UI: queda en el celular y se manda cuando haya señal. */
export async function saveRow<T extends Record<string, any>>(table: SyncTable, row: T & { id?: string }) {
  const { tripId } = useSession()
  const full = { ...row, id: row.id || uuid(), trip_id: tripId.value }
  const saved = await enqueue(table, full)
  syncSoon()
  return saved
}

export async function deleteRow(table: SyncTable, row: { id: string; trip_id: string }) {
  await softDelete(table, row)
  syncSoon()
}

export async function restoreRow(table: SyncTable, row: { id: string; trip_id: string }) {
  await restore(table, row)
  syncSoon()
}

export function useTripData() {
  const { memberId } = useSession()
  const memberById = computed(() => new Map(tripData.members.map(m => [m.id, m])))
  const placeById = computed(() => new Map(tripData.places.map(p => [p.id, p])))
  const chapterById = computed(() => new Map(tripData.chapters.map(c => [c.id, c])))
  const dayByDate = computed(() => new Map(tripData.days.map(d => [d.date, d])))
  const potById = computed(() => new Map(tripData.pots.map(p => [p.id, p])))
  const me = computed(() => memberById.value.get(memberId.value) ?? null)
  const base = computed(() => tripData.trip?.base_currency ?? 'USD')

  function partyName(id: string) {
    return memberById.value.get(id)?.name ?? potById.value.get(id)?.name ?? '¿?'
  }

  function chapterForDate(date: string) {
    const day = dayByDate.value.get(date)
    if (day?.chapter_id) return chapterById.value.get(day.chapter_id) ?? null
    return tripData.chapters.find(c => c.start_date <= date && date <= c.end_date) ?? null
  }

  function placeForDate(date: string) {
    const day = dayByDate.value.get(date)
    const placeId = day?.place_id ?? chapterForDate(date)?.place_id
    return placeId ? placeById.value.get(placeId) ?? null : null
  }

  function attachmentsFor(ownerId: string) {
    return tripData.attachments.filter(a => a.owner_id === ownerId)
  }

  return {
    data: tripData,
    me,
    base,
    memberById,
    placeById,
    chapterById,
    dayByDate,
    potById,
    partyName,
    chapterForDate,
    placeForDate,
    attachmentsFor,
  }
}
