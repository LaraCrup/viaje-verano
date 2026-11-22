<script setup lang="ts">
// Historial de cambios de un registro (quién creó, editó o borró, y cómo estaba antes).
import { formatMoney } from '#shared/money/currency'
import type { ActivityEntry } from '#shared/types/domain'
import { sb } from '~/lib/supabase'
import type { SyncTable } from '~/sync/db'

const props = defineProps<{ entity: SyncTable; entityId: string }>()
const { memberById } = useTripData()
const { show } = useToast()
const open = ref(false)
const loading = ref(false)
const entries = ref<ActivityEntry[] | null>(null)

const ACTION: Record<string, string> = { insert: 'creó', update: 'editó', delete: 'borró', restore: 'recuperó' }

async function load() {
  open.value = !open.value
  if (!open.value || entries.value) return
  loading.value = true
  const { data, error } = await sb()
    .from('activity_log')
    .select('*')
    .eq('entity', props.entity)
    .eq('entity_id', props.entityId)
    .order('at', { ascending: false })
    .limit(30)
  loading.value = false
  if (error) {
    show('El historial se ve con señal', 'warn')
    open.value = false
    return
  }
  entries.value = data as ActivityEntry[]
}

function summary(row: Record<string, any> | null) {
  if (!row) return ''
  if ('amount_minor' in row && row.currency) return `${row.description ?? ''} · ${formatMoney(Number(row.amount_minor), row.currency)}`
  return row.title ?? row.name ?? row.description ?? ''
}

async function revertTo(entry: ActivityEntry) {
  if (!entry.before) return
  if (!confirm('¿Volver a como estaba antes de este cambio?')) return
  const { created_at, created_by, updated_at, updated_by, version, ...rest } = entry.before as Record<string, any>
  await saveRow(props.entity, rest as any)
  show('Listo, quedó como estaba', 'ok')
  entries.value = null
  open.value = false
}
</script>

<template>
  <div>
    <button type="button" class="btn btn-ghost px-0" :aria-expanded="open" @click="load">
      {{ open ? 'Ocultar historial' : 'Ver historial de cambios' }}
    </button>
    <p v-if="loading" class="text-[14px]">Cargando…</p>
    <ol v-if="open && entries" class="mt-2 space-y-2">
      <li v-for="en in entries" :key="en.id" class="rounded-xl bg-paper-2 p-3 text-[14px]">
        <div class="font-bold text-ink">
          {{ memberById.get(en.actor_member_id ?? '')?.name ?? 'Carga inicial' }} {{ ACTION[en.action] }}
          · {{ new Date(en.at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
        </div>
        <div v-if="en.action === 'update' && en.before" class="mt-0.5">Antes: {{ summary(en.before) }}</div>
        <div v-else class="mt-0.5">{{ summary(en.after) }}</div>
        <button v-if="en.action === 'update' && en.before" type="button" class="link mt-1 min-h-10 text-[14px]" @click="revertTo(en)">Volver a esta versión</button>
      </li>
    </ol>
  </div>
</template>
