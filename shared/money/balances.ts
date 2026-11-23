/**
 * Balances: cuánto le deben o debe cada una.
 *
 * "Parte" (party) es cualquiera que pone o recibe plata: cada una de las integrantes.
 *
 * Convención: neto > 0 → le deben; neto < 0 → debe.
 */
import { allocate } from './allocate'
import type { Minor } from './currency'
import { convertMinor } from './fx'

export interface LedgerExpense {
  id: string
  currency: string
  amount: Minor
  /** Base por 1 unidad de la moneda del gasto (texto decimal). */
  fxRate: string
  /** partyId → cuánto puso (moneda del gasto). */
  payers: Record<string, Minor>
  /** memberId → cuánto le toca (moneda del gasto). */
  shares: Record<string, Minor>
}

export interface LedgerSettlement {
  id: string
  currency: string
  amount: Minor
  fxRate: string
  fromId: string
  toId: string
}

export type Balances = Record<string, Minor>

function add(map: Balances, key: string, value: Minor) {
  map[key] = (map[key] ?? 0) + value
}

/** Balance por moneda, sin convertir nada: currency → partyId → neto. */
export function balancesByCurrency(
  expenses: LedgerExpense[],
  settlements: LedgerSettlement[],
): Record<string, Balances> {
  const out: Record<string, Balances> = {}
  const bucket = (c: string) => (out[c] ??= {})
  for (const e of expenses) {
    const b = bucket(e.currency)
    for (const [p, v] of Object.entries(e.payers)) add(b, p, v)
    for (const [m, v] of Object.entries(e.shares)) add(b, m, -v)
  }
  for (const s of settlements) {
    const b = bucket(s.currency)
    add(b, s.fromId, s.amount)
    add(b, s.toId, -s.amount)
  }
  return out
}

/**
 * Lo que vale un gasto en la moneda base, ya repartido entre pagadoras y división.
 * Se convierte el total con el tipo de cambio del gasto y después se reparte con el
 * mayor resto en proporción a lo original: así los netos de cada gasto suman 0 exacto.
 */
export function expenseInBase(e: LedgerExpense, base: string): { total: Minor; payers: Balances; shares: Balances } {
  const total = convertMinor(e.amount, e.currency, base, e.fxRate)
  if (e.currency.toUpperCase() === base.toUpperCase()) {
    return { total, payers: { ...e.payers }, shares: { ...e.shares } }
  }
  return {
    total,
    payers: allocate(total, e.payers, `${e.id}:payers`),
    shares: allocate(total, e.shares, `${e.id}:shares`),
  }
}

/** Balance total en la moneda base del viaje (cada gasto con su propio tipo de cambio). */
export function balancesInBase(expenses: LedgerExpense[], settlements: LedgerSettlement[], base: string): Balances {
  const out: Balances = {}
  for (const e of expenses) {
    const { payers, shares } = expenseInBase(e, base)
    for (const [p, v] of Object.entries(payers)) add(out, p, v)
    for (const [m, v] of Object.entries(shares)) add(out, m, -v)
  }
  for (const s of settlements) {
    const v = convertMinor(s.amount, s.currency, base, s.fxRate)
    add(out, s.fromId, v)
    add(out, s.toId, -v)
  }
  return out
}

/** Asegura que estén todas las partes (con 0) para mostrarlas aunque no tengan movimientos. */
export function withAll(balances: Balances, partyIds: string[]): Balances {
  const out: Balances = {}
  for (const id of partyIds) out[id] = balances[id] ?? 0
  for (const [id, v] of Object.entries(balances)) if (!(id in out)) out[id] = v
  return out
}

export function isAllSettled(balances: Balances | Record<string, Balances>): boolean {
  const values = Object.values(balances).flatMap(v => (typeof v === 'number' ? [v] : Object.values(v)))
  return values.every(v => v === 0)
}
