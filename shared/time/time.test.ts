import { describe, expect, it } from 'vitest'
import { addDays, dateRange, formatCountdown, leaveAt, stayForNight, tripPhase } from './trip'
import { formatTime, localParts, TZ, utcLabel, zonedToUtc } from './tz'

describe('zonas horarias', () => {
  it('convierte hora local a UTC según el lugar', () => {
    // IB108 sale de EZE 21/12 22:15 (UTC−3) → 22/12 01:15 UTC
    expect(zonedToUtc('2026-12-21', '22:15', TZ.BUENOS_AIRES).toISOString()).toBe('2026-12-22T01:15:00.000Z')
    // Llega a MAD 22/12 14:00 (UTC+1) → 13:00 UTC
    expect(zonedToUtc('2026-12-22', '14:00', TZ.MADRID).toISOString()).toBe('2026-12-22T13:00:00.000Z')
    // IB1873 llega a TLV 23/12 04:30 (UTC+2) → 22/12 02:30 UTC
    expect(zonedToUtc('2026-12-23', '04:30', TZ.ISRAEL).toISOString()).toBe('2026-12-23T02:30:00.000Z')
    expect(zonedToUtc('2027-01-10', '23:45', TZ.NIZA).toISOString()).toBe('2027-01-10T22:45:00.000Z')
  })

  it('muestra la hora local de cada lugar y la etiqueta UTC', () => {
    const salida = new Date('2026-12-22T01:15:00Z')
    expect(formatTime(salida, TZ.BUENOS_AIRES)).toBe('22:15')
    expect(formatTime(salida, TZ.MADRID)).toBe('02:15')
    expect(utcLabel(salida, TZ.BUENOS_AIRES)).toBe('UTC−3')
    expect(utcLabel(salida, TZ.ISRAEL)).toBe('UTC+2')
    expect(utcLabel(salida, TZ.ROMA)).toBe('UTC+1')
    expect(localParts(salida, TZ.BUENOS_AIRES).date).toBe('2026-12-21')
  })

  it('la escala en Madrid dura unas 7 horas', () => {
    const llega = zonedToUtc('2026-12-22', '14:00', TZ.MADRID)
    const sale = zonedToUtc('2026-12-22', '21:25', TZ.MADRID)
    expect((sale.getTime() - llega.getTime()) / 3600000).toBeCloseTo(7.4, 1)
  })
})

describe('calendario del viaje', () => {
  const start = '2026-12-21'
  const end = '2027-01-14'

  it('el viaje dura 25 días', () => {
    expect(dateRange(start, end)).toHaveLength(25)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('antes, durante y después', () => {
    expect(tripPhase('2026-11-21', start, end)).toEqual({ phase: 'before', daysLeft: 30 })
    expect(tripPhase('2026-12-21', start, end)).toEqual({ phase: 'during', dayNumber: 1, totalDays: 25 })
    expect(tripPhase('2027-01-01', start, end)).toEqual({ phase: 'during', dayNumber: 12, totalDays: 25 })
    expect(tripPhase('2027-01-14', start, end)).toEqual({ phase: 'during', dayNumber: 25, totalDays: 25 })
    expect(tripPhase('2027-01-15', start, end)).toEqual({ phase: 'after', daysSince: 1 })
  })

  it('dónde dormimos: check-in ≤ noche < check-out', () => {
    const stays = [
      { id: 'airbnb', status: 'booked', check_in_date: '2026-12-30', check_out_date: '2027-01-01' },
      { id: 'ozz', status: 'booked', check_in_date: '2027-01-05', check_out_date: '2027-01-10' },
      { id: 'yellow', status: 'booked', check_in_date: '2027-01-11', check_out_date: '2027-01-14' },
    ]
    expect(stayForNight('2026-12-30', stays)?.id).toBe('airbnb')
    expect(stayForNight('2026-12-31', stays)?.id).toBe('airbnb')
    expect(stayForNight('2027-01-01', stays)).toBeNull()
    expect(stayForNight('2027-01-09', stays)?.id).toBe('ozz')
    expect(stayForNight('2027-01-10', stays)).toBeNull() // noche en el micro
    expect(stayForNight('2027-01-11', stays)?.id).toBe('yellow')
  })

  it('cuándo salir y cuenta regresiva', () => {
    const sale = new Date('2027-01-05T21:00:00Z')
    expect(leaveAt(sale, 120, 40).toISOString()).toBe('2027-01-05T18:20:00.000Z')
    expect(formatCountdown(3 * 86400000 + 4 * 3600000)).toBe('3 d 4 h')
    expect(formatCountdown(2 * 3600000 + 15 * 60000)).toBe('2 h 15 min')
    expect(formatCountdown(30000)).toBe('1 min')
    expect(formatCountdown(-1)).toBe('ya')
  })
})
