import confetti from 'canvas-confetti'

export function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const colors = ['#c62e65', '#f9b3d1', '#d63af9', '#eda6fc', '#624763', '#2f1847']
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.65 }, colors, disableForReducedMotion: true })
  setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, disableForReducedMotion: true }), 250)
  setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, disableForReducedMotion: true }), 400)
}
