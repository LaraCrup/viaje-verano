import { describe, expect, it } from 'vitest'
import { detectPlatform, extractUrl, linkLabel } from './video'

describe('links de videos', () => {
  it('reconoce la plataforma', () => {
    expect(detectPlatform('https://www.tiktok.com/@viajera/video/7312345678901234567')).toBe('tiktok')
    expect(detectPlatform('https://vm.tiktok.com/ZMabc123/')).toBe('tiktok')
    expect(detectPlatform('https://www.instagram.com/reel/C1abcDEF/?igsh=xyz')).toBe('instagram')
    expect(detectPlatform('https://youtu.be/dQw4w9WgXcQ')).toBe('youtube')
    expect(detectPlatform('https://m.youtube.com/shorts/abc')).toBe('youtube')
    expect(detectPlatform('https://example.com/video')).toBe('otro')
    expect(detectPlatform('no es un link')).toBe('otro')
    // Que "tiktok" en otro dominio no engañe
    expect(detectPlatform('https://nottiktok.com/x')).toBe('otro')
  })

  it('saca el link del texto que se comparte', () => {
    expect(extractUrl('Mirá este video de @viajera en TikTok! https://vm.tiktok.com/ZMabc123/ #roma')).toBe('https://vm.tiktok.com/ZMabc123/')
    expect(extractUrl('(https://www.instagram.com/reel/C1abc/).')).toBe('https://www.instagram.com/reel/C1abc/')
    expect(extractUrl('sin link')).toBeNull()
    expect(extractUrl(null)).toBeNull()
  })

  it('dice qué tipo de publicación es', () => {
    expect(linkLabel('https://www.instagram.com/p/C1abcDEF/')).toBe('Publicación de Instagram')
    expect(linkLabel('https://www.instagram.com/reel/C1abcDEF/?igsh=x')).toBe('Reel de Instagram')
    expect(linkLabel('https://www.instagram.com/lugaresroma/')).toBe('Instagram')
    expect(linkLabel('https://vm.tiktok.com/ZMabc123/')).toBe('TikTok')
    expect(linkLabel('https://youtube.com/shorts/abc')).toBe('YouTube Short')
    expect(linkLabel('https://www.tripadvisor.com/Restaurant_Review-x')).toBe('tripadvisor.com')
    expect(linkLabel('cualquier cosa')).toBe('Link')
  })
})
