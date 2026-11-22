/**
 * Quién está usando este celular.
 *
 * La sesión se guarda en el celular (localStorage) para que la app abra sin
 * señal. Entrar necesita conexión una sola vez, con
 * nombre + PIN del grupo.
 */
import { sb } from '~/lib/supabase'
import { getDb, wipeLocal } from '~/sync/db'

export interface LocalSession {
  tripId: string
  memberId: string
  slug: string
  joinedAt: string
}

export interface PublicMember {
  id: string
  name: string
  color: string
  emoji: string | null
}

const KEY = 'viaje-sesion'

function read(): LocalSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LocalSession) : null
  } catch {
    return null
  }
}

const session = ref<LocalSession | null>(typeof window !== 'undefined' ? read() : null)

function persist(s: LocalSession | null) {
  session.value = s
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s))
    else localStorage.removeItem(KEY)
  } catch {
    /* modo privado: la sesión dura lo que dure la pestaña */
  }
}

async function ensureAnonymous() {
  const client = sb()
  const { data } = await client.auth.getSession()
  if (data.session) return
  const { error } = await client.auth.signInAnonymously()
  if (error) throw new Error(error.message.includes('fetch') ? 'Necesitás conexión para entrar la primera vez.' : error.message)
}

type JoinResult = { trip_id: string; member_id: string } | { error: string }

function handle(slug: string, data: JoinResult | null, error: { message: string } | null): string | null {
  if (error) return error.message.includes('Demasiados') ? error.message : 'No se pudo entrar. ¿Tenés conexión?'
  if (!data) return 'No se pudo entrar.'
  if ('error' in data) return data.error
  persist({ tripId: data.trip_id, memberId: data.member_id, slug, joinedAt: new Date().toISOString() })
  return null
}

export function useSession() {
  const slug = useRuntimeConfig().public.tripSlug as string

  async function fetchPublicTrip(): Promise<{ id: string; name: string; members: PublicMember[] } | null> {
    try {
      await ensureAnonymous()
      const { data, error } = await sb().rpc('get_trip_public', { p_slug: slug })
      if (error || !data) return null
      localStorage.setItem('viaje-publico', JSON.stringify(data))
      return data
    } catch {
      const cached = localStorage.getItem('viaje-publico')
      return cached ? JSON.parse(cached) : null
    }
  }

  async function joinWithPin(memberId: string, pin: string): Promise<string | null> {
    try {
      await ensureAnonymous()
      const { data, error } = await sb().rpc('join_with_pin', { p_slug: slug, p_member_id: memberId, p_pin: pin.trim() })
      return handle(slug, data, error)
    } catch (e) {
      return (e as Error).message
    }
  }

  /** "Cambiar de persona": solo si no quedan cambios sin mandar (si no, se anotarían a nombre de otra). */
  async function canSwitch(): Promise<boolean> {
    return (await getDb().outbox.count()) === 0
  }

  async function signOut(opts: { wipe?: boolean } = {}) {
    persist(null)
    if (opts.wipe) await wipeLocal()
  }

  return {
    session: readonly(session),
    isLoggedIn: computed(() => !!session.value),
    memberId: computed(() => session.value?.memberId ?? ''),
    tripId: computed(() => session.value?.tripId ?? ''),
    fetchPublicTrip,
    joinWithPin,
    canSwitch,
    signOut,
  }
}
