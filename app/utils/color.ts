/**
 * Texto legible sobre un color de fondo: blanco o amatista, el que dé más contraste.
 * Sirve para capítulos y avatares (Roma y Meli son blush: van con texto amatista).
 */
const INK = '#2f1847'

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h.slice(0, 6)
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!)
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m)
  return (x! + 0.05) / (y! + 0.05)
}

export function textOn(bg: string | null | undefined): string {
  if (!bg || !/^#[0-9a-f]{3,8}$/i.test(bg)) return '#ffffff'
  return contrast(bg, '#ffffff') >= contrast(bg, INK) ? '#ffffff' : INK
}

/** Color de un capítulo usado como TEXTO sobre el papel: si es muy claro (Roma), amatista. */
export function inkFor(color: string | null | undefined): string {
  if (!color || !/^#[0-9a-f]{3,8}$/i.test(color)) return INK
  return contrast(color, '#fbf5ec') >= 4.5 ? color : INK
}
