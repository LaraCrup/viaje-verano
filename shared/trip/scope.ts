/**
 * Alcance de cada etapa del viaje: quiénes van a cada capítulo.
 *
 * - Un capítulo con member_ids vacío o null es de todas.
 * - A cada una se le muestran solo los capítulos donde está (y lo que cuelga de ellos).
 * - Su "viaje" va del primer día de su primer capítulo al último día del último.
 */

export interface ScopeChapter {
  id: string
  start_date: string
  end_date: string
  place_id: string | null
  member_ids: string[] | null
}

export function chapterIncludes(c: Pick<ScopeChapter, 'member_ids'>, memberId: string): boolean {
  return !c.member_ids || c.member_ids.length === 0 || c.member_ids.includes(memberId)
}

/** Las integrantes de un capítulo (si no tiene lista, todas). */
export function chapterMembers(c: Pick<ScopeChapter, 'member_ids'> | null | undefined, allIds: string[]): string[] {
  if (!c || !c.member_ids || c.member_ids.length === 0) return allIds
  return allIds.filter(id => c.member_ids!.includes(id))
}

/** Capítulos visibles para una integrante. Sin integrante (todavía cargando), se ven todos. */
export function visibleChapterIds(chapters: ScopeChapter[], memberId: string | null): Set<string> {
  return new Set(chapters.filter(c => !memberId || chapterIncludes(c, memberId)).map(c => c.id))
}

/** Desde y hasta cuándo es el viaje para una integrante (sus capítulos). */
export function personalWindow(
  chapters: ScopeChapter[],
  memberId: string | null,
  trip: { start_date: string; end_date: string },
): { start: string; end: string } {
  const mine = chapters.filter(c => !memberId || chapterIncludes(c, memberId))
  if (!mine.length) return { start: trip.start_date, end: trip.end_date }
  return {
    start: mine.reduce((m, c) => (c.start_date < m ? c.start_date : m), mine[0]!.start_date),
    end: mine.reduce((m, c) => (c.end_date > m ? c.end_date : m), mine[0]!.end_date),
  }
}

/** Un gasto se ve si es de un capítulo visible, no tiene capítulo, o la integrante participa (pagó o le toca parte). */
export function expenseVisible(
  e: { chapter_id: string | null; payers: Record<string, number>; shares: Record<string, number> },
  visible: Set<string>,
  memberId: string | null,
): boolean {
  if (!e.chapter_id || visible.has(e.chapter_id)) return true
  return !!memberId && (memberId in e.payers || memberId in e.shares)
}
