/**
 * Conteo de votaciones. Funciones puras.
 */

export interface VoteLike {
  member_id: string
  option_ids: string[]
  deleted_at?: string | null
}

export interface Tally {
  counts: Record<string, number>
  voters: Record<string, string[]>
  totalVoters: number
  /** Opciones con más votos (puede haber empate). Vacío si nadie votó. */
  leaders: string[]
  /** Diferencia de votos entre la primera y la segunda (0 = empate). */
  margin: number
}

export function tally(optionIds: string[], votes: VoteLike[]): Tally {
  const counts: Record<string, number> = Object.fromEntries(optionIds.map(id => [id, 0]))
  const voters: Record<string, string[]> = Object.fromEntries(optionIds.map(id => [id, []]))
  const valid = new Set(optionIds)
  let totalVoters = 0
  for (const v of votes) {
    if (v.deleted_at) continue
    const chosen = [...new Set(v.option_ids)].filter(id => valid.has(id))
    if (!chosen.length) continue
    totalVoters++
    for (const id of chosen) {
      counts[id]!++
      voters[id]!.push(v.member_id)
    }
  }
  const sorted = Object.values(counts).sort((a, b) => b - a)
  const top = sorted[0] ?? 0
  const leaders = top > 0 ? optionIds.filter(id => counts[id] === top) : []
  const margin = top - (sorted[1] ?? 0)
  return { counts, voters, totalVoters, leaders, margin }
}

/** Alterna una opción en el voto de una persona (única o múltiple). */
export function toggleVote(current: string[], optionId: string, multiple: boolean): string[] {
  if (multiple) return current.includes(optionId) ? current.filter(x => x !== optionId) : [...current, optionId]
  return current.includes(optionId) ? [] : [optionId]
}

export function isPollOpen(p: { closed: boolean; closes_at: string | null }, now: Date): boolean {
  return !p.closed && (!p.closes_at || new Date(p.closes_at) > now)
}

/** La votación más peleada: la de menor diferencia entre las dos primeras, con al menos 2 votantes. */
export function closestPoll<T extends { id: string }>(polls: { poll: T; tally: Tally }[]): T | null {
  const candidates = polls.filter(p => p.tally.totalVoters >= 2)
  if (!candidates.length) return null
  candidates.sort((a, b) => a.tally.margin - b.tally.margin || b.tally.totalVoters - a.tally.totalVoters)
  return candidates[0]!.poll
}
