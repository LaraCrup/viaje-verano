/**
 * Caja común (fondo/pozo).
 *
 * La caja es una "parte" más en los balances (ver balances.ts). Acá están los
 * números que se muestran en la pantalla de la caja: cuánto queda, cuánto puso
 * y cuánto consumió cada una.
 */
import { allocate } from './allocate'
import type { Minor } from './currency'
import type { LedgerExpense, LedgerSettlement } from './balances'
import { type Result } from './split'

export interface PotSummary {
  potId: string
  currency: string
  /** Lo que entró a la caja (aportes). */
  contributed: Minor
  /** Lo que la caja pagó en gastos. */
  spent: Minor
  /** Lo que la caja devolvió a alguien (reparto del sobrante). */
  returned: Minor
  /** Plata que tiene que haber hoy en la caja. */
  remaining: Minor
  /** memberId → cuánto puso (neto de lo que le devolvieron). */
  contributedBy: Record<string, Minor>
  /** memberId → cuánto consumió de lo que pagó la caja. */
  consumedBy: Record<string, Minor>
}

export function potSummary(
  potId: string,
  currency: string,
  expenses: LedgerExpense[],
  settlements: LedgerSettlement[],
): PotSummary {
  const contributedBy: Record<string, Minor> = {}
  const consumedBy: Record<string, Minor> = {}
  let contributed = 0
  let returned = 0
  let spent = 0

  for (const s of settlements) {
    if (s.currency !== currency) continue
    if (s.toId === potId) {
      contributed += s.amount
      contributedBy[s.fromId] = (contributedBy[s.fromId] ?? 0) + s.amount
    } else if (s.fromId === potId) {
      returned += s.amount
      contributedBy[s.toId] = (contributedBy[s.toId] ?? 0) - s.amount
    }
  }

  for (const e of expenses) {
    const paidByPot = e.payers[potId]
    if (!paidByPot || e.currency !== currency) continue
    spent += paidByPot
    // Si la caja pagó solo una parte del gasto, se reparte esa parte según la división.
    const portion = paidByPot === e.amount ? e.shares : allocate(paidByPot, e.shares, `${e.id}:pot:${potId}`)
    for (const [m, v] of Object.entries(portion)) consumedBy[m] = (consumedBy[m] ?? 0) + v
  }

  return {
    potId,
    currency,
    contributed,
    spent,
    returned,
    remaining: contributed - spent - returned,
    contributedBy,
    consumedBy,
  }
}

/** Una caja solo paga gastos en su moneda y no puede quedar en negativo. */
export function validatePotPayment(
  pot: { id: string; currency: string; remaining: Minor },
  expenseCurrency: string,
  amountFromPot: Minor,
): Result<true> {
  if (pot.currency !== expenseCurrency) {
    return { ok: false, error: `La caja es en ${pot.currency}: cargá el gasto en ${pot.currency} para pagarlo desde la caja` }
  }
  if (amountFromPot > pot.remaining) {
    return { ok: false, error: 'En la caja no hay suficiente plata para este gasto' }
  }
  return { ok: true, value: true }
}
