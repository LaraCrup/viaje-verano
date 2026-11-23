/**
 * Vibración corta para confirmar un toque ("háptico").
 *
 * - Android: navigator.vibrate.
 * - iPhone: Safari no tiene vibrate, pero desde iOS 18 un <input type="checkbox" switch>
 *   vibra al tocarlo. Se usa uno invisible y se "toca" por código.
 * - Si el celular no soporta ninguna de las dos, no hace nada.
 */
type Kind = 'light' | 'success' | 'warn'

const PATTERN: Record<Kind, number | number[]> = {
  light: 8,
  success: [10, 40, 14],
  warn: [20, 60, 20],
}

let iosSwitch: HTMLLabelElement | null = null

function iosTap() {
  if (!iosSwitch) {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-99px;top:0'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    label.appendChild(input)
    document.body.appendChild(label)
    iosSwitch = label
  }
  iosSwitch.click()
}

const isIOS = typeof navigator !== 'undefined' && /iP(hone|ad|od)/.test(navigator.userAgent)

export function haptic(kind: Kind = 'light') {
  if (typeof window === 'undefined') return
  try {
    if (!isIOS && 'vibrate' in navigator) {
      navigator.vibrate(PATTERN[kind])
      return
    }
    if (isIOS) {
      iosTap()
      // En iPhone el patrón se arma con dos toques seguidos
      if (kind !== 'light') setTimeout(iosTap, 90)
    }
  } catch {
    /* sin vibración */
  }
}
