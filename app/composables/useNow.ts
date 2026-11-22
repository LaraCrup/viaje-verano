/**
 * "Ahora" reactivo, con la posibilidad de simular una fecha para probar
 * cómo se ve la app durante el viaje: /?fecha=2027-01-06 (se recuerda hasta
 * cerrar la pestaña; /?fecha=hoy vuelve a la fecha real).
 */
const tick = ref(Date.now())
let started = false

function override(): string | null {
  try {
    return sessionStorage.getItem('viaje-fecha')
  } catch {
    return null
  }
}

export function setSimulatedDate(date: string | null) {
  try {
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) sessionStorage.setItem('viaje-fecha', date)
    else sessionStorage.removeItem('viaje-fecha')
  } catch {
    /* sin storage */
  }
  tick.value = Date.now()
}

export function useNow() {
  if (!started && typeof window !== 'undefined') {
    started = true
    setInterval(() => (tick.value = Date.now()), 20_000)
  }
  const simulated = computed(() => {
    void tick.value
    return override()
  })
  const now = computed(() => {
    const real = new Date(tick.value)
    const sim = simulated.value
    if (!sim) return real
    const [y, m, d] = sim.split('-').map(Number)
    const out = new Date(real)
    out.setFullYear(y!, m! - 1, d!)
    return out
  })
  /** Fecha local del celular (el celular cambia de zona horaria solo al viajar). */
  const today = computed(() => {
    const n = now.value
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
  })
  return { now, today, simulated }
}
