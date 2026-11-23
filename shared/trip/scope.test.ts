import { describe, expect, it } from 'vitest'
import { chapterMembers, expenseVisible, personalWindow, visibleChapterIds } from './scope'

const ALL = ['wile', 'lara', 'juli', 'ivi', 'meli', 'solcha']
const SIN_MELI = ['wile', 'lara', 'juli', 'ivi', 'solcha']
const ch = (id: string, start: string, end: string, member_ids: string[] | null) => ({ id, start_date: start, end_date: end, place_id: null, member_ids })
const CHAPTERS = [
  ch('ida', '2026-12-21', '2026-12-22', null),
  ch('israel', '2026-12-23', '2027-01-01', null),
  ch('madrid', '2027-01-02', '2027-01-05', SIN_MELI),
  ch('niza', '2027-01-06', '2027-01-10', SIN_MELI),
  ch('roma', '2027-01-11', '2027-01-14', ['wile', 'lara', 'juli', 'ivi']),
]
const TRIP = { start_date: '2026-12-21', end_date: '2027-01-14' }

describe('alcance de cada etapa', () => {
  it('cada una ve solo sus capítulos', () => {
    expect([...visibleChapterIds(CHAPTERS, 'meli')]).toEqual(['ida', 'israel'])
    expect([...visibleChapterIds(CHAPTERS, 'solcha')]).toEqual(['ida', 'israel', 'madrid', 'niza'])
    expect(visibleChapterIds(CHAPTERS, 'lara').size).toBe(5)
    expect(visibleChapterIds(CHAPTERS, null).size).toBe(5) // cargando: se ve todo
  })

  it('las integrantes de cada capítulo (null = todas)', () => {
    expect(chapterMembers(CHAPTERS[1], ALL)).toEqual(ALL)
    expect(chapterMembers(CHAPTERS[4], ALL)).toEqual(['wile', 'lara', 'juli', 'ivi'])
    expect(chapterMembers(null, ALL)).toEqual(ALL)
  })

  it('el viaje de cada una empieza y termina con sus capítulos', () => {
    expect(personalWindow(CHAPTERS, 'meli', TRIP)).toEqual({ start: '2026-12-21', end: '2027-01-01' })
    expect(personalWindow(CHAPTERS, 'solcha', TRIP)).toEqual({ start: '2026-12-21', end: '2027-01-10' })
    expect(personalWindow(CHAPTERS, 'lara', TRIP)).toEqual({ start: '2026-12-21', end: '2027-01-14' })
  })

  it('un gasto de otra etapa se ve solo si participa', () => {
    const visible = visibleChapterIds(CHAPTERS, 'meli')
    const roma = { chapter_id: 'roma', payers: { lara: 100 }, shares: { lara: 50, juli: 50 } }
    expect(expenseVisible(roma, visible, 'meli')).toBe(false)
    expect(expenseVisible({ ...roma, shares: { lara: 50, meli: 50 } }, visible, 'meli')).toBe(true)
    expect(expenseVisible({ ...roma, chapter_id: null }, visible, 'meli')).toBe(true)
  })
})
