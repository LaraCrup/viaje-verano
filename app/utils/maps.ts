/** Link a Google Maps (abre la app en el celular). */
export function mapsUrl(opts: { query?: string | null; lat?: number | null; lon?: number | null }) {
  const q = opts.lat != null && opts.lon != null ? `${opts.lat},${opts.lon}` : opts.query ?? ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

/** "Cómo llegar" a un alojamiento: el link cargado a mano o, si no hay, la búsqueda de la dirección. */
export function stayMapsUrl(s: { maps_url?: string | null; address: string | null; name: string; lat: number | null; lon: number | null }) {
  return s.maps_url?.trim() || mapsUrl({ query: s.address || s.name, lat: s.lat, lon: s.lon })
}

export function directionsUrl(destination: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
