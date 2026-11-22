/**
 * Números del "Wrapped" del viaje. Funciones puras.
 */

export interface LatLon {
  lat: number | null
  lon: number | null
}

/** Distancia en km entre dos puntos (fórmula del haversine). */
export function haversineKm(a: LatLon, b: LatLon): number | null {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null) return null
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export interface TransportLike {
  origin_place_id: string | null
  dest_place_id: string | null
  status: string
}

/** Km aproximados en línea recta sumando los traslados con origen y destino conocidos. */
export function totalKm(transports: TransportLike[], places: Map<string, LatLon>): number {
  let km = 0
  for (const t of transports) {
    if (t.status === 'cancelled' || !t.origin_place_id || !t.dest_place_id) continue
    const d = haversineKm(places.get(t.origin_place_id) ?? { lat: null, lon: null }, places.get(t.dest_place_id) ?? { lat: null, lon: null })
    if (d) km += d
  }
  return Math.round(km)
}

/** Países y ciudades visitados (sin contar el de origen). */
export function visited(
  days: { place_id: string | null }[],
  places: Map<string, { name: string; country: string | null }>,
  homeCountry = 'AR',
): { countries: string[]; cities: string[] } {
  const countries = new Set<string>()
  const cities = new Set<string>()
  for (const d of days) {
    const p = d.place_id ? places.get(d.place_id) : null
    if (!p || p.country === homeCountry) continue
    if (p.country) countries.add(p.country)
    cities.add(p.name)
  }
  return { countries: [...countries], cities: [...cities] }
}

export function topEntry(map: Record<string, number>, allowed?: Set<string>): [string, number] | null {
  const list = Object.entries(map).filter(([k, v]) => v > 0 && (!allowed || allowed.has(k)))
  list.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  return list[0] ?? null
}

export const COUNTRY_NAMES: Record<string, string> = {
  IL: 'Israel', ES: 'España', FR: 'Francia', IT: 'Italia', MC: 'Mónaco', AR: 'Argentina',
}
export const COUNTRY_FLAGS: Record<string, string> = {
  IL: '🇮🇱', ES: '🇪🇸', FR: '🇫🇷', IT: '🇮🇹', MC: '🇲🇨', AR: '🇦🇷',
}
