import { describe, expect, it } from 'vitest'
import { haversineKm, topEntry, totalKm, visited } from './wrapped'

const P = new Map([
  ['ba', { name: 'Buenos Aires', country: 'AR', lat: -34.6037, lon: -58.3816 }],
  ['mad', { name: 'Madrid', country: 'ES', lat: 40.4168, lon: -3.7038 }],
  ['tlv', { name: 'Tel Aviv', country: 'IL', lat: 32.0853, lon: 34.7818 }],
  ['nce', { name: 'Niza', country: 'FR', lat: 43.7102, lon: 7.262 }],
  ['rom', { name: 'Roma', country: 'IT', lat: 41.9028, lon: 12.4964 }],
  ['x', { name: 'Sin coords', country: 'IT', lat: null, lon: null }],
])

describe('wrapped', () => {
  it('distancias aproximadas razonables', () => {
    expect(Math.round(haversineKm(P.get('ba')!, P.get('mad')!)!)).toBeGreaterThan(9900)
    expect(Math.round(haversineKm(P.get('ba')!, P.get('mad')!)!)).toBeLessThan(10200)
    expect(Math.round(haversineKm(P.get('mad')!, P.get('tlv')!)!)).toBeGreaterThan(3500)
    expect(haversineKm(P.get('mad')!, P.get('x')!)).toBeNull()
  })

  it('suma km de los traslados y saltea los incompletos o cancelados', () => {
    const km = totalKm([
      { origin_place_id: 'ba', dest_place_id: 'mad', status: 'booked' },
      { origin_place_id: 'mad', dest_place_id: 'tlv', status: 'booked' },
      { origin_place_id: 'rom', dest_place_id: null, status: 'pending' },
      { origin_place_id: 'nce', dest_place_id: 'rom', status: 'cancelled' },
    ], P)
    expect(km).toBeGreaterThan(13500)
    expect(km).toBeLessThan(14000)
  })

  it('países y ciudades sin contar Argentina', () => {
    const v = visited([{ place_id: 'ba' }, { place_id: 'mad' }, { place_id: 'tlv' }, { place_id: 'tlv' }, { place_id: 'nce' }, { place_id: null }], P)
    expect(v.countries.sort()).toEqual(['ES', 'FR', 'IL'])
    expect(v.cities).toEqual(['Madrid', 'Tel Aviv', 'Niza'])
  })

  it('el primero de un ranking (filtrando)', () => {
    expect(topEntry({ a: 3, b: 5, caja: 9 }, new Set(['a', 'b']))).toEqual(['b', 5])
    expect(topEntry({})).toBeNull()
  })
})
