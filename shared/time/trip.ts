/**
 * Cálculos de calendario del viaje: qué día es, dónde dormimos, cuándo salir.
 * Las fechas de día van como texto "YYYY-MM-DD" (fecha local del lugar).
 */

export function toDayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.round(Date.UTC(y!, m! - 1, d!) / 86400000)
}

export function daysBetween(from: string, to: string): number {
  return toDayNumber(to) - toDayNumber(from)
}

export function addDays(date: string, n: number): string {
  const ms = (toDayNumber(date) + n) * 86400000
  return new Date(ms).toISOString().slice(0, 10)
}

export function dateRange(from: string, to: string): string[] {
  const n = daysBetween(from, to)
  return Array.from({ length: n + 1 }, (_, i) => addDays(from, i))
}

export type TripPhase =
  | { phase: 'before'; daysLeft: number }
  | { phase: 'during'; dayNumber: number; totalDays: number }
  | { phase: 'after'; daysSince: number }

export function tripPhase(today: string, start: string, end: string): TripPhase {
  const totalDays = daysBetween(start, end) + 1
  if (today < start) return { phase: 'before', daysLeft: daysBetween(today, start) }
  if (today > end) return { phase: 'after', daysSince: daysBetween(end, today) }
  return { phase: 'during', dayNumber: daysBetween(start, today) + 1, totalDays }
}

export interface StayLike {
  id: string
  status: string
  check_in_date: string | null
  check_out_date: string | null
}

/** Alojamiento de la noche que empieza en `date` (check-in ≤ fecha < check-out). */
export function stayForNight<T extends StayLike>(date: string, stays: T[]): T | null {
  return (
    stays.find(
      s => s.status !== 'cancelled' && s.check_in_date && s.check_out_date && s.check_in_date <= date && date < s.check_out_date,
    ) ?? null
  )
}

export type TransportKind = 'flight' | 'bus' | 'train' | 'car' | 'ferry' | 'other'

/**
 * Cuánto antes salir hacia el aeropuerto/terminal (estimación editable por traslado).
 * Vuelo internacional fuera de Schengen 3 h, vuelo dentro de Europa 2 h, micro 45 min, tren 30 min.
 */
export function defaultLeaveBufferMin(kind: TransportKind, crossesSchengen: boolean): number {
  switch (kind) {
    case 'flight':
      return crossesSchengen ? 180 : 120
    case 'bus':
      return 45
    case 'train':
      return 30
    default:
      return 30
  }
}

export function leaveAt(departAt: Date, bufferMin: number, travelMin = 0): Date {
  return new Date(departAt.getTime() - (bufferMin + travelMin) * 60000)
}

/** "3 d 4 h", "2 h 15 min", "12 min", "ya". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return 'ya'
  const totalMin = Math.floor(ms / 60000)
  const d = Math.floor(totalMin / 1440)
  const h = Math.floor((totalMin % 1440) / 60)
  const m = totalMin % 60
  if (d > 0) return h ? `${d} d ${h} h` : `${d} d`
  if (h > 0) return m ? `${h} h ${m} min` : `${h} h`
  return `${Math.max(m, 1)} min`
}
