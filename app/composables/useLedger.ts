/**
 * Une los datos en vivo con la lógica pura de gastos (shared/money).
 */
import { balancesByCurrency, balancesInBase, withAll, type LedgerExpense, type LedgerSettlement } from '#shared/money/balances'
import { potSummary } from '#shared/money/pots'
import { simplifyByCurrency, simplifyDebts } from '#shared/money/simplify'
import { tripStats, type StatsExpense } from '#shared/money/stats'
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
  const { data, base } = useTripData()

  const expenses = computed(() => data.expenses.map(toLedgerExpense))
  const settlements = computed(() => data.settlements.map(toLedgerSettlement))
  const partyIds = computed(() => [...data.members.map(m => m.id), ...data.pots.map(p => p.id)])

  const inBase = computed(() => withAll(balancesInBase(expenses.value, settlements.value, base.value), partyIds.value))
  const byCurrency = computed(() => balancesByCurrency(expenses.value, settlements.value))
  const transfersBase = computed(() => simplifyDebts(inBase.value))
  const transfersByCurrency = computed(() => simplifyByCurrency(byCurrency.value))
  const allSettled = computed(() => Object.values(inBase.value).every(v => v === 0) && Object.values(byCurrency.value).every(b => Object.values(b).every(v => v === 0)))
  const stats = computed(() => tripStats(expenses.value, base.value))
  const pots = computed(() => data.pots.map(p => potSummary(p.id, p.currency, expenses.value, settlements.value)))

  return { expenses, settlements, inBase, byCurrency, transfersBase, transfersByCurrency, allSettled, stats, pots }
}
