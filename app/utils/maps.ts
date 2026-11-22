/** Link a Google Maps (abre la app en el celular). */
export function mapsUrl(opts: { query?: string | null; lat?: number | null; lon?: number | null }) {
  const q = opts.lat != null && opts.lon != null ? `${opts.lat},${opts.lon}` : opts.query ?? ''
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export function directionsUrl(destination: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`
}
