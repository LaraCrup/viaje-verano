<script setup lang="ts">
// Valija y documentos de cada una + lista compartida del grupo.
import type { ChecklistItem } from '#shared/types/domain'

const route = useRoute()
const router = useRouter()
const { data, me } = useTripData()
const { show } = useToast()

type ListId = ChecklistItem['list']
const tab = computed<ListId>({
  get: () => (['valija', 'documentos', 'grupo'].includes(route.query.l as string) ? (route.query.l as ListId) : 'valija'),
  set: v => router.replace({ query: { l: v } }),
})

// Sugerencias genéricas para arrancar (cada una las edita/borra).
const SUGGESTIONS: Record<ListId, string[]> = {
  valija: ['Cargador del celular', 'Adaptador de enchufe', 'Ropa de abrigo', 'Calzado cómodo', 'Traje de baño', 'Remedios personales', 'Lentes de sol', 'Candado'],
  documentos: ['Pasaporte', 'Seguro de viaje', 'Tarjetas de embarque', 'Documentación de Taglit', 'Tarjeta de crédito / débito', 'Copia digital del pasaporte'],
  grupo: ['Botiquín', 'Adaptadores de enchufe', 'Zapatilla / alargue', 'Parlante', 'Bolsas para ropa sucia'],
}

const items = computed(() =>
  data.checklist_items.filter(i => i.list === tab.value && (tab.value === 'grupo' || i.owner_member_id === me.value?.id)),
)
const done = computed(() => items.value.filter(i => i.done).length)
const newText = ref('')

async function add(text = newText.value) {
  const t = text.trim()
  if (!t) return
  await saveRow('checklist_items', {
    list: tab.value,
    owner_member_id: tab.value === 'grupo' ? null : me.value?.id ?? null,
    text: t,
    done: false,
    sort: items.value.length + 1,
  })
  newText.value = ''
}
async function addSuggestions() {
  const existing = new Set(items.value.map(i => i.text.toLowerCase()))
  for (const s of SUGGESTIONS[tab.value]) if (!existing.has(s.toLowerCase())) await add(s)
  show('Sugerencias agregadas: borrá las que no te sirvan')
}
async function toggle(i: ChecklistItem) {
  haptic('light')
  const completes = !i.done && items.value.length >= 2 && done.value === items.value.length - 1
  await saveRow('checklist_items', { ...i, done: !i.done })
  // Se terminó la lista: festejo
  if (completes) {
    celebrate()
    show('¡Lista completa! 🎉')
  }
}
async function remove(i: ChecklistItem) {
  await deleteRow('checklist_items', i)
  show('Ítem borrado', 'info', { label: 'Deshacer', run: () => void restoreRow('checklist_items', i) })
}
async function assign(i: ChecklistItem, memberId: string) {
  await saveRow('checklist_items', { ...i, owner_member_id: memberId || null })
}
</script>

<template>
  <div>
    <PageHeader title="Listas" back="/mas" sticker="heart" />

    <div class="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="Listas">
      <button v-for="[id, label] in [['valija', 'Mi valija'], ['documentos', 'Mis documentos'], ['grupo', 'Del grupo']] as const" :key="id" type="button" role="tab" class="chip shrink-0 whitespace-nowrap" :class="tab === id ? 'is-on' : ''" :aria-selected="tab === id" @click="tab = id">{{ label }}</button>
    </div>

    <p class="mb-2 px-1 text-[13px] text-ink-soft">
      <template v-if="tab === 'grupo'">Lo que llevamos entre todas. Asigná quién lo lleva.</template>
      <template v-else>Tu lista personal ({{ done }} de {{ items.length }} listos).</template>
    </p>

    <div v-if="items.length" class="mb-3 h-1.5 rounded-full bg-paper-2" aria-hidden="true">
      <div class="h-1.5 rounded-full bg-primary transition-all" :style="{ width: `${Math.round((done / items.length) * 100)}%` }" />
    </div>

    <ul class="card mb-4 divide-y divide-dashed divide-line p-0">
      <li v-for="i in items" :key="i.id" class="flex items-center gap-1 py-0.5 pl-1 pr-2">
        <!-- Casilla chica (24 px) dentro de un área de 44 px, para que siga siendo fácil de tocar -->
        <button type="button" class="grid h-11 w-11 shrink-0 place-items-center" :aria-pressed="i.done" :aria-label="`${i.text}: ${i.done ? 'listo' : 'pendiente'}`" @click="toggle(i)">
          <span
            class="grid h-6 w-6 place-items-center rounded-md transition-colors"
            :class="i.done ? 'bg-primary text-white' : 'bg-white shadow-[inset_0_0_0_2px_var(--color-line)]'"
          >
            <Transition name="pop"><NavIcon v-if="i.done" name="check" :size="15" /></Transition>
          </span>
        </button>
        <span class="flex-1 text-[15px]" :class="i.done ? 'text-ink-soft line-through decoration-ink-soft/50' : 'font-semibold'">{{ i.text }}</span>
        <template v-if="tab === 'grupo'">
          <label :for="`who-${i.id}`" class="sr-only">Quién lleva {{ i.text }}</label>
          <select :id="`who-${i.id}`" :value="i.owner_member_id ?? ''" class="input w-28 text-[14px]" @change="assign(i, ($event.target as HTMLSelectElement).value)">
            <option value="">¿Quién?</option>
            <option v-for="m in data.members" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </template>
        <button type="button" class="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-paper-2" :aria-label="`Borrar ${i.text}`" @click="remove(i)"><NavIcon name="trash" :size="16" class="text-ink-soft" /></button>
      </li>
      <li v-if="!items.length" class="p-4 text-center text-[14px] text-ink-soft">Vacía por ahora.</li>
    </ul>

    <form class="flex gap-2" @submit.prevent="add()">
      <label for="new-item" class="sr-only">Nuevo ítem</label>
      <input id="new-item" v-model="newText" class="input flex-1" maxlength="200" placeholder="Agregar…">
      <button type="submit" class="btn btn-primary" :disabled="!newText.trim()">Agregar</button>
    </form>
    <button type="button" class="mt-1 min-h-11 px-1 text-[14px] font-semibold text-primary-dark" @click="addSuggestions">Sumar sugerencias</button>
  </div>
</template>
