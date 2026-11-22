/**
 * Exportar a CSV pensado para Excel/Sheets en español:
 * separador ";", decimales con coma y BOM para que los acentos se vean bien.
 */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[";\n\r]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n')
}
