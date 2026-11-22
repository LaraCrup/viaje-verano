/**
 * Zonas horarias. En la base todo se guarda en UTC + el nombre IANA del lugar
 * ("Europe/Madrid"); acá se convierte para mostrar y para cargar.
 */

export const TZ = {
  BUENOS_AIRES: 'America/Argentina/Buenos_Aires',
  ISRAEL: 'Asia/Jerusalem',
  MADRID: 'Europe/Madrid',
  NIZA: 'Europe/Paris',
  ROMA: 'Europe/Rome',
} as const

const partsCache = new Map<string, Intl.DateTimeFormat>()

function partsFormatter(tz: string) {
  let f = partsCache.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
    partsCache.set(tz, f)
  }
  return f
}

export interface LocalParts {
  date: string // YYYY-MM-DD
  time: string // HH:mm
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

export function localParts(at: Date, tz: string): LocalParts {
  const p = Object.fromEntries(partsFormatter(tz).formatToParts(at).map(x => [x.type, x.value]))
  const hour = Number(p.hour) % 24
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${String(hour).padStart(2, '0')}:${p.minute}`,
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour,
    minute: Number(p.minute),
    second: Number(p.second),
  }
}

/** Minutos que la zona está adelantada respecto de UTC en ese instante (Israel → 120). */
export function tzOffsetMinutes(at: Date, tz: string): number {
  const p = localParts(at, tz)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60000)
}

/** Hora local de un lugar → instante UTC. "2026-12-21", "22:15", Buenos Aires → 2026-12-22T01:15Z. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  const [hh, mm] = time.split(':').map(Number)
  const guess = Date.UTC(y!, m! - 1, d!, hh!, mm!)
  let result = guess - tzOffsetMinutes(new Date(guess), tz) * 60000
  // Segunda pasada por si el cambio de horario cae justo entre medio.
  result = guess - tzOffsetMinutes(new Date(result), tz) * 60000
  return new Date(result)
}

/** "UTC+2", "UTC−3". */
export function utcLabel(at: Date, tz: string): string {
  const off = tzOffsetMinutes(at, tz)
  const sign = off >= 0 ? '+' : '−'
  const h = Math.floor(Math.abs(off) / 60)
  const m = Math.abs(off) % 60
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`
}

export function formatTime(at: Date | string, tz: string): string {
  return localParts(new Date(at), tz).time
}

/** "lun 21 dic". */
export function formatDayShort(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  return new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(d)
    .replace(/\./g, '')
    .replace(',', '')
}

/** "lunes 21 de diciembre". */
export function formatDayLong(date: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  return new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(d)
    .replace(',', '')
}

/** "21/12". */
export function formatDayNumeric(date: string): string {
  const [, m, d] = date.split('-')
  return `${d}/${m}`
}
