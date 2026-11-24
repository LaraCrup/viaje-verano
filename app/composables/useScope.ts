/**
 * Lo que le toca ver a la integrante de este celular: solo las etapas del viaje donde está
 * (días, traslados, alojamientos, planes, votaciones, diario, info por país y gastos de esas etapas).
 * Los balances NO pasan por acá: se calculan con todos los gastos para que las cuentas den.
 * Es una cuestión de qué se muestra, no de permisos de la base.
 */
import type { Member, Transport } from '#shared/types/domain'
import { localParts } from '#shared/time/tz'
import { chapterMembers, expenseVisible, personalWindow, visibleChapterIds } from '#shared/trip/scope'

export function useScope() {
  const { data, me, chapterForDate, placeById, chapterById, memberById } = useTripData()

  const meId = computed(() => me.value?.id ?? null)
  const allIds = computed(() => data.members.map(m => m.id))
  const visibleIds = computed(() => visibleChapterIds(data.chapters, meId.value))

  const chapterOk = (id: string | null | undefined) => !id || visibleIds.value.has(id)
  const dateOk = (date: string) => chapterOk(chapterForDate(date)?.id)

  /** Capítulo de un traslado: por la fecha de salida; si no tiene, por la ciudad de origen. */
  function transportChapterId(t: Transport): string | null {
    if (t.depart_at) return chapterForDate(localParts(new Date(t.depart_at), t.depart_tz ?? 'UTC').date)?.id ?? null
    if (t.origin_place_id) return data.chapters.find(c => c.place_id === t.origin_place_id)?.id ?? null
    return null
  }

  const chapters = computed(() => data.chapters.filter(c => chapterOk(c.id)))
  const days = computed(() => data.days.filter(d => chapterOk(d.chapter_id ?? chapterForDate(d.date)?.id)))
  const stays = computed(() => data.stays.filter(s => chapterOk(s.chapter_id)))
  const transports = computed(() => data.transports.filter(t => chapterOk(transportChapterId(t))))
  const plans = computed(() => data.plans.filter(p => chapterOk(p.chapter_id)))
  const polls = computed(() => data.polls.filter(p => chapterOk(p.chapter_id)))
  const expenses = computed(() => data.expenses.filter(e => expenseVisible(e, visibleIds.value, meId.value)))
  const journal = computed(() => data.journal_entries.filter(j => dateOk(j.date)))
  const videos = computed(() => data.videos.filter(v => chapterOk(v.chapter_id)))

  /** Países que le tocan (por las ciudades de sus días y capítulos), para Info útil. */
  const countries = computed(() => {
    const out = new Set<string>()
    for (const d of days.value) {
      const c = d.place_id ? placeById.value.get(d.place_id)?.country : null
      if (c) out.add(c)
    }
    for (const ch of chapters.value) {
      const c = ch.place_id ? placeById.value.get(ch.place_id)?.country : null
      if (c) out.add(c)
    }
    return out
  })

  /** Su viaje: del primer día de su primera etapa al último de la última. */
  const window = computed(() => (data.trip ? personalWindow(data.chapters, meId.value, data.trip) : null))

  /** Quiénes van a una etapa (todas, si no tiene lista). */
  function membersOfChapter(chapterId: string | null | undefined): Member[] {
    const ids = chapterMembers(chapterId ? chapterById.value.get(chapterId) : null, allIds.value)
    return ids.map(id => memberById.value.get(id)).filter(Boolean) as Member[]
  }
  function membersOnDate(date: string): Member[] {
    return membersOfChapter(chapterForDate(date)?.id)
  }

  return { chapters, days, stays, transports, plans, polls, expenses, journal, videos, countries, window, chapterOk, dateOk, membersOfChapter, membersOnDate }
}
