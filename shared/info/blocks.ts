/**
 * Convierte el texto libre de una sección de "Info útil" en bloques con jerarquía,
 * sin cambiar cómo se escribe (sigue siendo un texto editable, una idea por renglón):
 *
 * - "Policía: 100"                     → fila corta (etiqueta a la izquierda, dato a la derecha)
 * - "Tarjeta Rav-Kav: se compra en…"   → ítem (título chico y el texto abajo)
 * - "Ojo: el vuelo sale…"              → aviso destacado
 * - cualquier otro renglón             → párrafo
 *
 * Los teléfonos (+54 9 11…, o números cortos de emergencia en una fila) quedan marcados para poder llamar.
 */

export type InfoBlock =
  | { kind: 'row'; label: string; value: string; tel: string | null; note: string }
  | { kind: 'item'; title: string; text: string }
  | { kind: 'note'; text: string }
  | { kind: 'text'; text: string }

export interface TextPart {
  text: string
  /** Número para el link tel: (sin espacios), si este pedazo es un teléfono. */
  tel?: string
}

const SEP = ': '
const MAX_LABEL = 40
const MAX_SHORT_VALUE = 36
/** Teléfono internacional dentro de un texto: +972 52-386-9501, +54 9 11 5040-7243… */
const PHONE_IN_TEXT = /\+\d[\d\s-]{6,}\d/g
/** Un valor que es solo un teléfono (internacional o corto como 112), con una aclaración opcional entre paréntesis. */
const PHONE_VALUE = /^(\+?\d[\d\s-]*\d|\d{2,4})\s*(\(.*\))?$/

export function telHref(phone: string): string {
  return phone.replace(/[^\d+]/g, '')
}

export function parseInfo(body: string): InfoBlock[] {
  const out: InfoBlock[] = []
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (/^ojo\s*:/i.test(line)) {
      out.push({ kind: 'note', text: line.replace(/^ojo\s*:\s*/i, '') })
      continue
    }
    const i = line.indexOf(SEP)
    let label = i > 0 ? line.slice(0, i).trim() : ''
    const value = i > 0 ? line.slice(i + SEP.length).trim() : ''
    const phone = value.match(PHONE_VALUE)
    // Un teléfono acepta una etiqueta más larga: lo que va entre paréntesis pasa a ser la aclaración.
    // "Guardia para emergencias graves (accidentes, internaciones): +972…" → etiqueta + aclaración + número.
    let labelNote = ''
    if (phone && label.length > MAX_LABEL) {
      const paren = label.match(/^(.*?)\s*\((.*)\)$/)
      if (paren) {
        label = paren[1]!.trim()
        labelNote = paren[2]!.trim()
      }
    }
    // "En Niza no hay consulado: …" sirve de título; una oración larga con dos puntos en el medio, no.
    if (!label || !value || label.length > MAX_LABEL || label.includes('.')) {
      out.push({ kind: 'text', text: line })
      continue
    }
    if (phone) {
      const note = [labelNote, (phone[2] ?? '').replace(/^\(|\)$/g, '')].filter(Boolean).join(' · ')
      out.push({ kind: 'row', label, value: phone[1]!.trim(), tel: telHref(phone[1]!), note })
    } else if (value.length <= MAX_SHORT_VALUE) {
      out.push({ kind: 'row', label, value, tel: null, note: '' })
    } else {
      out.push({ kind: 'item', title: label, text: value })
    }
  }
  return out
}

/** Parte un texto en pedazos, marcando los teléfonos para mostrarlos como links. */
export function splitPhones(text: string): TextPart[] {
  const parts: TextPart[] = []
  let last = 0
  for (const m of text.matchAll(PHONE_IN_TEXT)) {
    const at = m.index ?? 0
    if (at > last) parts.push({ text: text.slice(last, at) })
    parts.push({ text: m[0], tel: telHref(m[0]) })
    last = at + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}
