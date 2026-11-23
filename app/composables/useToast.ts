export interface Toast {
  id: number
  text: string
  tone: 'ok' | 'info' | 'warn' | 'bad'
  action?: { label: string; to?: string; run?: () => void }
}

const toasts = ref<Toast[]>([])
let seq = 0

export function useToast() {
  function show(text: string, tone: Toast['tone'] = 'ok', action?: Toast['action'], ms = 3800) {
    const id = ++seq
    toasts.value = [...toasts.value.slice(-2), { id, text, tone, action }]
    haptic(tone === 'ok' ? 'success' : tone === 'info' ? 'light' : 'warn')
    setTimeout(() => dismiss(id), action ? ms + 3000 : ms)
  }
  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }
  return { toasts, show, dismiss }
}
