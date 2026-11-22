import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function sb(): SupabaseClient {
  if (!client) {
    const cfg = useRuntimeConfig().public
    if (!cfg.supabaseUrl || !cfg.supabaseKey) {
      throw new Error('Faltan NUXT_PUBLIC_SUPABASE_URL y NUXT_PUBLIC_SUPABASE_KEY en el .env')
    }
    client = createClient(cfg.supabaseUrl, cfg.supabaseKey, {
      auth: {
        // La sesión anónima queda guardada en el celular y se renueva sola.
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'viaje-auth',
        detectSessionInUrl: false,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  }
  return client
}

export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Fallback (http en red local, navegadores viejos)
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** Id fijo para "un registro por persona" (voto, momento del diario): evita duplicados entre dispositivos. */
export function pairId(baseUuid: string, memberUuid: string): string {
  return `${baseUuid.slice(0, 24)}${memberUuid.replace(/-/g, '').slice(-12)}`
}
