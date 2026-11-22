import { describe, expect, it } from 'vitest'
import { closestPoll, isPollOpen, tally, toggleVote } from './polls'

describe('votaciones', () => {
  it('cuenta votos, ignora borrados y opciones que ya no existen', () => {
    const t = tally(['monaco', 'tropez'], [
      { member_id: 'lara', option_ids: ['monaco'] },
      { member_id: 'juli', option_ids: ['tropez'] },
      { member_id: 'ivi', option_ids: ['monaco', 'monaco'] },
      { member_id: 'meli', option_ids: ['opcion-borrada'] },
      { member_id: 'wile', option_ids: ['tropez'], deleted_at: '2027-01-01' },
    ])
    expect(t.counts).toEqual({ monaco: 2, tropez: 1 })
    expect(t.voters.monaco).toEqual(['lara', 'ivi'])
    expect(t.totalVoters).toBe(3)
    expect(t.leaders).toEqual(['monaco'])
    expect(t.margin).toBe(1)
  })

  it('empate y sin votos', () => {
    expect(tally(['a', 'b'], [{ member_id: 'x', option_ids: ['a'] }, { member_id: 'y', option_ids: ['b'] }]).leaders).toEqual(['a', 'b'])
    expect(tally(['a', 'b'], []).leaders).toEqual([])
  })

  it('voto único y múltiple', () => {
    expect(toggleVote([], 'a', false)).toEqual(['a'])
    expect(toggleVote(['a'], 'b', false)).toEqual(['b'])
    expect(toggleVote(['a'], 'a', false)).toEqual([])
    expect(toggleVote(['a'], 'b', true)).toEqual(['a', 'b'])
    expect(toggleVote(['a', 'b'], 'a', true)).toEqual(['b'])
  })

  it('cierre manual o por fecha', () => {
    const now = new Date('2027-01-07T10:00:00Z')
    expect(isPollOpen({ closed: false, closes_at: null }, now)).toBe(true)
    expect(isPollOpen({ closed: true, closes_at: null }, now)).toBe(false)
    expect(isPollOpen({ closed: false, closes_at: '2027-01-07T09:00:00Z' }, now)).toBe(false)
  })

  it('la votación más peleada', () => {
    const mk = (id: string, votes: string[][]) => ({ poll: { id }, tally: tally(['a', 'b'], votes.map((o, i) => ({ member_id: `m${i}`, option_ids: o }))) })
    expect(closestPoll([mk('facil', [['a'], ['a'], ['a']]), mk('reñida', [['a'], ['b'], ['a'], ['b']]), mk('sola', [['a']])])?.id).toBe('reñida')
    expect(closestPoll([mk('sola', [['a']])])).toBeNull()
  })
})
