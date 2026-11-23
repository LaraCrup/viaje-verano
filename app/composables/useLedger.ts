/**
 * Une los datos en vivo con la lógica pura de gastos (shared/money).
 *
 * Todo va por moneda, sin convertir: las deudas se pagan en la moneda en que
 * se generaron (lo que se pase de una moneda a otra se arregla por fuera).
 */
import { balancesByCurrency, type LedgerSettlement } from '#shared/money/balances'
import { simplifyByCurrency } from '#shared/money/simplify'
import { tripStats, type StatsExpense, type TripStats } from '#shared/money/stats'
import type { Expense, Settlement } from '#shared/types/domain'

export function toLedgerExpense(e: Expense): StatsExpense {
  return {
    id: e.id,
    currency: e.currency,
    amount: e.amount_minor,
    fxRate: e.fx_rate,
    payers: e.payers,
    shares: e.shares,
    category: e.category,
    placeId: e.place_id,
    chapterId: e.chapter_id,
    personal: e.split_mode === 'personal',
  }
}

export function toLedgerSettlement(s: Settlement): LedgerSettlement {
  return { id: s.id, currency: s.currency, amount: s.amount_minor, fxRate: s.fx_rate, fromId: s.from_id, toId: s.to_id }
}

export function useLedger() {
  const { data } = useTripData()

  const expenses = computed(() => data.expenses.map(toLedgerExpense))
  const settlements = computed(() => data.settlements.map(toLedgerSettlement))

  /** Saldo de cada una en cada moneda: positivo = le deben, negativo = debe. */
  const byCurrency = computed(() => balancesByCurrency(expenses.value, settlements.value))
  const transfersByCurrency = computed(() => simplifyByCurrency(byCurrency.value))
  const allSettled = computed(() => Object.values(byCurrency.value).every(b => Object.values(b).every(v => v === 0)))

  /** Monedas usadas en gastos, de la más usada a la menos usada. */
  const currencies = computed(() => {
    const count: Record<string, number> = {}
    for (const e of data.expenses) count[e.currency] = (count[e.currency] ?? 0) + 1
    return Object.keys(count).sort((a, b) => count[b]! - count[a]! || a.localeCompare(b))
  })

  /** Totales y rankings de cada moneda por separado. */
  const statsByCurrency = computed<Record<string, TripStats>>(() =>
    Object.fromEntries(currencies.value.map(c => [c, tripStats(expenses.value.filter(e => e.currency === c), c)])),
  )

  /** Lo que le deben o debe una persona, una línea por moneda (sin las que están en cero). */
  function balancesOf(memberId: string): { currency: string; value: number }[] {
    return Object.entries(byCurrency.value)
      .map(([currency, b]) => ({ currency, value: b[memberId] ?? 0 }))
      .filter(x => x.value !== 0)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  }

  return { expenses, settlements, byCurrency, transfersByCurrency, allSettled, currencies, statsByCurrency, balancesOf }
}
