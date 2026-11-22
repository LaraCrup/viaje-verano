export const CATEGORIES = [
  { id: 'comida', label: 'Comida', emoji: '🍝' },
  { id: 'super', label: 'Súper', emoji: '🛒' },
  { id: 'alojamiento', label: 'Alojamiento', emoji: '🛏️' },
  { id: 'transporte', label: 'Transporte', emoji: '🚌' },
  { id: 'salidas', label: 'Salidas', emoji: '🍹' },
  { id: 'actividades', label: 'Entradas y actividades', emoji: '🎟️' },
  { id: 'compras', label: 'Compras', emoji: '🛍️' },
  { id: 'otros', label: 'Otros', emoji: '✨' },
] as const

export type CategoryId = (typeof CATEGORIES)[number]['id']

export function category(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]!
}
