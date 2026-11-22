/**
 * Motor de sincronización: manda la cola, baja cambios y escucha Realtime.
 *
 * Cuándo sincroniza: al abrir la app, al volver la señal, al volver a la app
 * (iPhone no tiene sincronización en segundo plano), después de cada cambio
 * y cada 30 segundos.
 */
import type { RealtimeChannel } from '@supabase/supabase-js'
import { liveQuery } from 'dexie'
import { sb } from '~/lib/supabase'
import { getDb, SYNC_TABLES } from '~/sync/db'
import { uploadPendingFiles } from '~/sync/files'
import { flush } from '~/sync/outbox'
import { applyRemoteRows, pullAll } from '~/sync/pull'
import { abortInflight, supabaseRemote } from '~/sync/remote'

export const syncState = reactive({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  syncing: false,
  pending: 0,
  failed: 0,
  lastSync: null as string | null,
  realtime: 'off' as 'off' | 'on' | 'error',
  started: false,
})

let tripIdActive = ''
let channel: RealtimeChannel | null = null
let timer: ReturnType<typeof setInterval> | null = null
let soon: ReturnType<typeof setTimeout> | null = null
let needsPull = false

const LABELS: Record<string, string> = {
  expenses: 'gasto',
  settlements: 'pago',
  transports: 'traslado',
  stays: 'alojamiento',
  plans: 'plan',
  days: 'día',
}

let again = false

async function syncNow(): Promise<void> {
  if (!tripIdActive) return
  // Si ya hay una sincronización corriendo, se repite apenas termine (no se pierde el pedido).
  if (syncState.syncing) {
    again = true
    return
  }
  syncState.syncing = true
  again = false
  const { show } = useToast()
  try {
    const remote = supabaseRemote(sb())
    await uploadPendingFiles()
    const pushed = await flush(remote, {
      onConcurrentEdit: item => {
        const what = LABELS[item.table]
        if (what) show(`Alguien más también había editado este ${what}. Quedó tu versión; la anterior está en el historial.`, 'info')
      },
      onSuperseded: item => {
        const what = LABELS[item.table]
        if (what) show(`Alguien editó este ${what} después que vos: quedó su versión.`, 'info')
      },
      onRejected: (_item, message) => show(`No se pudo guardar: ${message}`, 'bad'),
    })
    syncState.online = pushed !== 'offline'
    if (pushed === 'done' && navigator.onLine) {
      const pulled = await pullAll(remote, tripIdActive)
      syncState.online = pulled === 'done'
      if (pulled === 'done') {
        syncState.lastSync = new Date().toISOString()
        needsPull = false
      }
    }
  } finally {
    syncState.syncing = false
    if (again) void syncNow()
  }
}

/** Después de guardar algo: sincroniza enseguida (agrupando cambios seguidos). */
export function syncSoon(ms = 400) {
  if (soon) clearTimeout(soon)
  soon = setTimeout(() => void syncNow(), ms)
}

function subscribeRealtime(tripId: string) {
  channel?.unsubscribe()
  let ch = sb().channel(`trip:${tripId}`)
  for (const table of SYNC_TABLES) {
    ch = ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `trip_id=eq.${tripId}` }, payload => {
      if (payload.new && 'id' in payload.new) void applyRemoteRows(table, [payload.new as Record<string, any>])
    })
  }
  channel = ch.subscribe(status => {
    if (status === 'SUBSCRIBED') {
      syncState.realtime = 'on'
      // Lo que pasó mientras no estábamos conectadas no llega por Realtime: se baja.
      if (needsPull) syncSoon(0)
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      syncState.realtime = 'error'
      needsPull = true
    }
  })
}

export function startSync(tripId: string) {
  if (syncState.started && tripIdActive === tripId) return
  tripIdActive = tripId
  syncState.started = true

  const db = getDb()
  liveQuery(() => db.outbox.count()).subscribe(n => (syncState.pending = n))
  liveQuery(() => db.failed.count()).subscribe(n => (syncState.failed = n))

  window.addEventListener('online', () => {
    syncState.online = true
    abortInflight()
    syncSoon(0)
  })
  window.addEventListener('offline', () => {
    syncState.online = false
    abortInflight()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncSoon(0)
  })
  timer = setInterval(() => void syncNow(), 30_000)

  // Que el navegador no borre los datos guardados (clave en iPhone).
  void navigator.storage?.persist?.()

  needsPull = true
  subscribeRealtime(tripId)
  void syncNow()
}

export function stopSync() {
  channel?.unsubscribe()
  channel = null
  if (timer) clearInterval(timer)
  syncState.started = false
  tripIdActive = ''
}

export function useSync() {
  return { state: syncState, syncNow, syncSoon }
}
