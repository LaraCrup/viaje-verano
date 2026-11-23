import { describe, expect, it } from 'vitest'
import { parseInfo, splitPhones, telHref } from './blocks'

describe('info útil: texto → bloques', () => {
  it('números de emergencia como filas con link para llamar', () => {
    const b = parseInfo('Policía: 100\nGuardia consular argentina: +972 52-386-9501 (también WhatsApp)')
    expect(b[0]).toEqual({ kind: 'row', label: 'Policía', value: '100', tel: '100', note: '' })
    expect(b[1]).toEqual({ kind: 'row', label: 'Guardia consular argentina', value: '+972 52-386-9501', tel: '+972523869501', note: 'también WhatsApp' })
  })

  it('dato corto como fila y explicación larga como ítem con título', () => {
    const b = parseInfo('Pases: 24 h 8,50 € · 48 h 15 €\nTarjeta Rav-Kav: se compra en el aeropuerto Ben Gurion y se le carga plata.')
    expect(b[0]).toMatchObject({ kind: 'row', label: 'Pases', tel: null })
    expect(b[1]).toMatchObject({ kind: 'item', title: 'Tarjeta Rav-Kav' })
  })

  it('"Ojo:" es un aviso y los renglones sin etiqueta son párrafos', () => {
    const b = parseInfo('Paseo de la Castellana 16, Madrid.\nOjo: el vuelo sale en pleno Shabat.')
    expect(b[0]).toEqual({ kind: 'text', text: 'Paseo de la Castellana 16, Madrid.' })
    expect(b[1]).toEqual({ kind: 'note', text: 'el vuelo sale en pleno Shabat.' })
  })

  it('las horas (16:20) no cortan el renglón y las oraciones largas no se vuelven títulos', () => {
    const b = parseInfo('Viernes 25/12: empieza ≈ 16:20 · termina ≈ 17:25\nMuchos restaurantes cobran «coperto» (cubierto, por persona) y a veces «servizio»: los vas a ver en la cuenta.')
    expect(b[0]).toMatchObject({ kind: 'row', label: 'Viernes 25/12' })
    expect(b[1]!.kind).toBe('text')
  })

  it('una guardia con aclaración larga entre paréntesis sigue siendo una fila para llamar', () => {
    const [b] = parseInfo('Guardia para emergencias graves (accidentes, internaciones, detenciones): +972 52-386-9501 (también WhatsApp)')
    expect(b).toEqual({ kind: 'row', label: 'Guardia para emergencias graves', value: '+972 52-386-9501', tel: '+972523869501', note: 'accidentes, internaciones, detenciones · también WhatsApp' })
  })

  it('teléfonos dentro de un texto', () => {
    const parts = splitPhones('Si no contestan: +54 9 11 5040-7243 (llamadas) o +54 9 11 5061-5903 (WhatsApp).')
    expect(parts.filter(p => p.tel).map(p => p.tel)).toEqual(['+5491150407243', '+5491150615903'])
    expect(parts.map(p => p.text).join('')).toBe('Si no contestan: +54 9 11 5040-7243 (llamadas) o +54 9 11 5061-5903 (WhatsApp).')
    expect(telHref('+39 06 4287 0023')).toBe('+390642870023')
  })
})
