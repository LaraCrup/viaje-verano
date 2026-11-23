import type { Place, Transport } from '#shared/types/domain'
import { defaultLeaveBufferMin, leaveAt } from '#shared/time/trip'

// Países del espacio Schengen (+ Mónaco) que nos importan: un vuelo entre ellos no pasa migraciones.
const SCHENGEN = new Set(['ES', 'FR', 'IT', 'MC', 'DE', 'PT', 'NL', 'BE', 'AT', 'CH', 'GR'])

export const KIND_LABEL: Record<string, string> = {
  flight: 'Vuelo',
  bus: 'Micro',
  train: 'Tren',
  car: 'Auto',
  ferry: 'Barco',
  other: 'Traslado',
}

export const KIND_ICON: Record<string, string> = {
  flight: 'plane',
  bus: 'bus',
  train: 'bus',
  car: 'bus',
  ferry: 'bus',
  other: 'map',
}

export function crossesSchengen(t: Transport, places: Map<string, Place>) {
  const o = t.origin_place_id ? places.get(t.origin_place_id)?.country : null
  const d = t.dest_place_id ? places.get(t.dest_place_id)?.country : null
  if (!o || !d) return true
  return !(SCHENGEN.has(o) && SCHENGEN.has(d))
}

/**
 * A qué hora hay que estar en el aeropuerto / la terminal: la salida menos la
 * anticipación (la cargada o la estimada según el tipo). No incluye el viaje
 * hasta ahí, porque depende de dónde esté cada una.
 */
export function beThereTime(t: Transport, places: Map<string, Place>): { at: Date; bufferMin: number } | null {
  if (!t.depart_at) return null
  const bufferMin = t.leave_buffer_min ?? defaultLeaveBufferMin(t.kind, crossesSchengen(t, places))
  return { at: leaveAt(new Date(t.depart_at), bufferMin), bufferMin }
}

/** "2 h", "45 min", "1 h 30 min". */
export function formatBuffer(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`
}

export function transportTitle(t: Transport) {
  const route = [t.origin_label, t.dest_label].filter(Boolean).join(' → ')
  return route || KIND_LABEL[t.kind] || 'Traslado'
}

/** Lo que le falta a un traslado para estar completo. */
export function transportMissing(t: Transport): string[] {
  const out: string[] = []
  if (t.status === 'pending') out.push('Sin reservar / sin cargar')
  if (!t.depart_at) out.push('Falta la salida')
  if (t.depart_at && !t.arrive_at) out.push('Falta la hora de llegada')
  return out
}
