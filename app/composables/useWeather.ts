/**
 * Clima con Open-Meteo (gratis, sin API key). Queda guardado: sin señal se
 * muestra el último pronóstico con la hora en que se bajó.
 */
import type { Place } from '#shared/types/domain'
import { getMeta, setMeta } from '~/sync/db'

export interface Weather {
  fetchedAt: string
  current: { temp: number; code: number }
  daily: { date: string; max: number; min: number; code: number; rain: number }[]
}

const MAX_AGE_MS = 60 * 60 * 1000

export function weatherInfo(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: '☀️', label: 'Despejado' }
  if (code <= 2) return { emoji: '🌤️', label: 'Parcialmente nublado' }
  if (code === 3) return { emoji: '☁️', label: 'Nublado' }
  if (code <= 48) return { emoji: '🌫️', label: 'Niebla' }
  if (code <= 57) return { emoji: '🌦️', label: 'Llovizna' }
  if (code <= 67) return { emoji: '🌧️', label: 'Lluvia' }
  if (code <= 77) return { emoji: '🌨️', label: 'Nieve' }
  if (code <= 82) return { emoji: '🌧️', label: 'Chaparrones' }
  if (code <= 86) return { emoji: '🌨️', label: 'Nevadas' }
  return { emoji: '⛈️', label: 'Tormenta' }
}

export function useWeather(place: Ref<Place | null>) {
  const weather = ref<Weather | null>(null)
  const loading = ref(false)

  async function load() {
    const p = place.value
    if (!p || p.lat === null || p.lon === null) {
      weather.value = null
      return
    }
    const key = `weather:${p.id}`
    const cached = await getMeta<Weather>(key)
    weather.value = cached ?? null
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < MAX_AGE_MS) return
    if (!navigator.onLine) return
    loading.value = true
    try {
      const url = new URL('https://api.open-meteo.com/v1/forecast')
      url.search = new URLSearchParams({
        latitude: String(p.lat),
        longitude: String(p.lon),
        current: 'temperature_2m,weather_code',
        daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max',
        timezone: p.tz,
        forecast_days: '4',
      }).toString()
      const res = await fetch(url)
      if (!res.ok) return
      const j = await res.json()
      const w: Weather = {
        fetchedAt: new Date().toISOString(),
        current: { temp: Math.round(j.current.temperature_2m), code: j.current.weather_code },
        daily: j.daily.time.map((date: string, i: number) => ({
          date,
          max: Math.round(j.daily.temperature_2m_max[i]),
          min: Math.round(j.daily.temperature_2m_min[i]),
          code: j.daily.weather_code[i],
          rain: j.daily.precipitation_probability_max?.[i] ?? 0,
        })),
      }
      weather.value = w
      await setMeta(key, w)
    } catch {
      /* sin señal: queda lo guardado */
    } finally {
      loading.value = false
    }
  }

  watch(() => place.value?.id, load, { immediate: true })
  return { weather, loading, reload: load }
}
