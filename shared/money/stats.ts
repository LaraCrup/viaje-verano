/**
 * Estadísticas simples. La app las calcula de a una moneda por vez (sin convertir):
 * se le pasan solo los gastos de esa moneda y esa misma moneda como `base`.
 * Los gastos personales no cuentan para el total del grupo ni para "lo que consumió cada una"
 * (que es su parte de los gastos divididos); sí cuentan en lo que gastó en total (byMemberWithPersonal).
 */
import type { Minor } from './currency'
import { expenseInBase, type LedgerExpense } from './balances'

export interface StatsExpense extends LedgerExpense {
  category: string
  placeId: string | null
  chapterId: string | null
  personal: boolean
}

export interface TripStats {
  groupTotal: Minor
  /** Lo que consumió cada una: su parte de los gastos divididos (sin los personales). */
  byMember: Record<string, Minor>
  /** Lo que gastó cada una en total: su parte de todo, incluidos sus gastos personales. */
  byMemberWithPersonal: Record<string, Minor>
  byCategory: Record<string, Minor>
  byPlace: Record<string, Minor>
  byChapter: Record<string, Minor>
  /** Cuántas veces pagó cada una (para el Wrapped). */
  timesPaid: Record<string, number>
}

const bump = (m: Record<string, number>, k: string, v: number) => {
  m[k] = (m[k] ?? 0) + v
}

export function tripStats(expenses: StatsExpense[], base: string): TripStats {
  const s: TripStats = { groupTotal: 0, byMember: {}, byMemberWithPersonal: {}, byCategory: {}, byPlace: {}, byChapter: {}, timesPaid: {} }
  for (const e of expenses) {
    const inBase = expenseInBase(e, base)
    for (const [m, v] of Object.entries(inBase.shares)) bump(s.byMemberWithPersonal, m, v)
    if (e.personal) continue
    for (const [m, v] of Object.entries(inBase.shares)) bump(s.byMember, m, v)
    s.groupTotal += inBase.total
    bump(s.byCategory, e.category, inBase.total)
    bump(s.byPlace, e.placeId ?? 'sin-ciudad', inBase.total)
    bump(s.byChapter, e.chapterId ?? 'sin-capitulo', inBase.total)
    for (const p of Object.keys(e.payers)) bump(s.timesPaid, p, 1)
  }
  return s
}

/** Pares ordenados de mayor a menor, para listas y gráficos. */
export function ranked(map: Record<string, number>): [string, number][] {
  return Object.entries(map).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
}
