import type { Day, Transport } from '#shared/types/domain'
import { stayForNight } from '#shared/time/trip'
import { localParts } from '#shared/time/tz'

/** Fecha local (del lugar) en la que sale / llega un traslado. */
export function transportDates(t: Transport): string[] {
  const out = new Set<string>()
  if (t.depart_at) out.add(localParts(new Date(t.depart_at), t.depart_tz ?? 'UTC').date)
  if (t.arrive_at) out.add(localParts(new Date(t.arrive_at), t.arrive_tz ?? 'UTC').date)
  return [...out]
}

export function useItinerary() {
  const { data, chapterById } = useTripData()
  const scope = useScope()

  const transportsByDate = computed(() => {
    const map = new Map<string, Transport[]>()
    for (const t of scope.transports.value) for (const d of transportDates(t)) map.set(d, [...(map.get(d) ?? []), t])
    return map
  })

  const plansByDay = computed(() => {
    const map = new Map<string, typeof data.plans>()
    for (const p of scope.plans.value) if (p.day_id) map.set(p.day_id, [...(map.get(p.day_id) ?? []), p])
    for (const [k, v] of map) map.set(k, [...v].sort((a, b) => (a.start_time ?? '99').localeCompare(b.start_time ?? '99') || a.sort - b.sort))
    return map
  })

  const chapters = computed(() =>
    scope.chapters.value.map(c => ({
      chapter: c,
      days: data.days.filter(d => d.chapter_id === c.id),
      members: scope.membersOfChapter(c.id),
    })),
  )

  function nightLabel(day: Day): { text: string; warn: boolean } | null {
    if (day.night_override) return { text: day.night_override, warn: false }
    const s = stayForNight(day.date, scope.stays.value)
    if (s) return s.status === 'pending' ? { text: `${s.name} (pendiente)`, warn: true } : { text: s.name, warn: false }
    if (data.trip && day.date === data.trip.end_date) return { text: 'Último día del viaje', warn: false }
    return null
  }

  return { chapters, transportsByDate, plansByDay, nightLabel, chapterById }
}
