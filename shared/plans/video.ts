/**
 * "Guardados": links de TikTok, Instagram (Reels o publicaciones), YouTube o cualquier página
 * con lugares para ir. De qué plataforma son, qué tipo de publicación, y cómo sacar el link
 * del texto que arma la app al compartir ("Mirá este video… https://vm.tiktok.com/…").
 */
import type { VideoPlatform } from '../types/domain'

export const PLATFORM_LABEL: Record<VideoPlatform, string> = {
  tiktok: 'TikTok',
  instagram: 'Instagram',
  youtube: 'YouTube',
  otro: 'Link',
}

/** El primer link http(s) que aparezca en un texto (o null). */
export function extractUrl(text: string | null | undefined): string | null {
  if (!text) return null
  const m = text.match(/https?:\/\/[^\s<>"']+/i)
  if (!m) return null
  // Sacar signos de puntuación pegados al final ("…/video/123).")
  return m[0].replace(/[)\].,;!?]+$/, '')
}

export function detectPlatform(url: string): VideoPlatform {
  let host = ''
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return 'otro'
  }
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok'
  if (host === 'instagram.com' || host.endsWith('.instagram.com') || host === 'instagr.am') return 'instagram'
  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) return 'youtube'
  return 'otro'
}

/** Qué es, para mostrarlo debajo del título: "Reel de Instagram", "Publicación de Instagram", "tripadvisor.com"… */
export function linkLabel(url: string): string {
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return 'Link'
  }
  const path = u.pathname.toLowerCase()
  switch (detectPlatform(url)) {
    case 'tiktok':
      return 'TikTok'
    case 'instagram':
      if (path.startsWith('/p/')) return 'Publicación de Instagram'
      if (path.startsWith('/reel')) return 'Reel de Instagram'
      if (path.startsWith('/stories')) return 'Historia de Instagram'
      return 'Instagram'
    case 'youtube':
      return path.startsWith('/shorts') ? 'YouTube Short' : 'YouTube'
    default:
      return u.hostname.replace(/^www\./, '') || 'Link'
  }
}
