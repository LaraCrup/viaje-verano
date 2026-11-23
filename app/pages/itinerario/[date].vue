<script setup lang="ts">
import { addDays, stayForNight } from '#shared/time/trip'
import type { Plan } from '#shared/types/domain'
import { formatDayLong } from '#shared/time/tz'

const route = useRoute()
const date = computed(() => String(route.params.date))
const { data, dayByDate, chapterById, placeById } = useTripData()
const { transportsByDate, plansByDay } = useItinerary()
const { show } = useToast()

const day = computed(() => dayByDate.value.get(date.value) ?? null)
const chapter = computed(() => (day.value?.chapter_id ? chapterById.value.get(day.value.chapter_id) : null))
const stay = computed(() => stayForNight(date.value, data.stays))
const plans = computed(() => (day.value ? plansByDay.value.get(day.value.id) ?? [] : []))
const transports = computed(() => transportsByDate.value.get(date.value) ?? [])
const prev = computed(() => (dayByDate.value.has(addDays(date.value, -1)) ? addDays(date.value, -1) : null))
const next = computed(() => (dayByDate.value.has(addDays(date.value, 1)) ? addDays(date.value, 1) : null))

// Deslizar de costado para pasar al día anterior / siguiente
const router = useRouter()
let touch: { x: number; y: number } | null = null
function onTouchStart(e: TouchEvent) {
  const t = e.target as HTMLElement
  if (editing.value || t.closest('input, textarea, select, dialog')) return
  touch = { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY }
}
function onTouchEnd(e: TouchEvent) {
  if (!touch) return
  const dx = e.changedTouches[0]!.clientX - touch.x
  const dy = e.changedTouches[0]!.clientY - touch.y
  touch = null
  if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return
  const to = dx < 0 ? next.value : prev.value
  if (!to) return
  haptic('light')
  router.replace(`/itinerario/${to}`)
}

// Editar el día
const editing = ref(false)
const form = reactive({ title: '', notes: '', night_override: '', place_id: '' })
function startEdit() {
  if (!day.value) return
  Object.assign(form, { title: day.value.title ?? '', notes: day.value.notes ?? '', night_override: day.value.night_override ?? '', place_id: day.value.place_id ?? '' })
  editing.value = true
}
async function saveDay() {
  if (!day.value) return
  await saveRow('days', { ...day.value, title: form.title.trim() || null, notes: form.notes.trim() || null, night_override: form.night_override.trim() || null, place_id: form.place_id || null })
  editing.value = false
  show('Día guardado ✓')
}

// Planes del día
const planOpen = ref(false)
const planForm = reactive({ id: '', title: '', start_time: '', notes: '', maps_url: '', date: '' })
function openPlan(p?: Plan) {
  Object.assign(planForm, { id: p?.id ?? '', title: p?.title ?? '', start_time: p?.start_time ?? '', notes: p?.notes ?? '', maps_url: p?.maps_url ?? '', date: date.value })
  planOpen.value = true
}
async function savePlan() {
  if (!planForm.title.trim()) return
  const existing = data.plans.find(p => p.id === planForm.id)
  const targetDay = dayByDate.value.get(planForm.date)
  await saveRow('plans', {
    ...(existing ?? { status: 'pending', sort: plans.value.length + 1 }),
    id: planForm.id || undefined,
    title: planForm.title.trim(),
    start_time: planForm.start_time || null,
    notes: planForm.notes.trim() || null,
    maps_url: planForm.maps_url.trim() || null,
    day_id: targetDay?.id ?? day.value?.id ?? null,
    chapter_id: targetDay?.chapter_id ?? day.value?.chapter_id ?? null,
  })
  planOpen.value = false
  show(planForm.date !== date.value ? 'Plan movido de día ✓' : 'Plan guardado ✓')
}
async function toggleDone(p: Plan) {
  haptic('light')
  await saveRow('plans', { ...p, status: p.status === 'done' ? 'pending' : 'done' })
}
async function unschedule(p: Plan) {
  await saveRow('plans', { ...p, day_id: null })
  planOpen.value = false
  show('Volvió a la lista de ideas', 'info', { label: 'Ver', to: '/planes' })
}
async function removePlan(p: Plan) {
  await deleteRow('plans', p)
  planOpen.value = false
  show('Plan borrado', 'info', { label: 'Deshacer', run: () => void restoreRow('plans', p) })
}
</script>

<template>
  <div @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
    <PageHeader :title="formatDayLong(date)" back="/itinerario" :subtitle="chapter ? `${chapter.emoji ?? ''} ${chapter.name}` : undefined" />

    <EmptyState v-if="!day" text="Este día no es parte del viaje." />

    <template v-else>
      <section class="card tape" :style="{ '--tape': chapter?.accent }">
        <template v-if="!editing">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-[17px] font-bold leading-snug">{{ day.title || 'Día libre' }}</p>
              <p v-if="day.place_id && placeById.get(day.place_id)?.name !== chapter?.name" class="mt-0.5 text-[13px] text-ink-soft">📍 {{ placeById.get(day.place_id)?.name }}</p>
            </div>
            <button type="button" class="-mr-1 -mt-1 flex min-h-11 shrink-0 items-center gap-1 rounded-full px-3 text-[14px] font-semibold text-primary-dark hover:bg-paper-2" @click="startEdit"><NavIcon name="edit" :size="16" /> Editar</button>
          </div>
          <p v-if="day.notes" class="mt-3 whitespace-pre-line border-t border-dashed border-line pt-3 text-[14px] text-ink-soft">{{ day.notes }}</p>
        </template>
        <form v-else class="space-y-3" @submit.prevent="saveDay">
          <div>
            <label for="d-title" class="field-label">Título del día</label>
            <input id="d-title" v-model="form.title" class="input" maxlength="120">
          </div>
          <div>
            <label for="d-place" class="field-label">Ciudad (para el clima y la hora)</label>
            <select id="d-place" v-model="form.place_id" class="input">
              <option value="">—</option>
              <option v-for="p in data.places" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
          </div>
          <div>
            <label for="d-notes" class="field-label">Notas</label>
            <textarea id="d-notes" v-model="form.notes" class="input" rows="4" />
          </div>
          <div>
            <label for="d-night" class="field-label">¿Dónde dormimos? (si no es un alojamiento cargado)</label>
            <input id="d-night" v-model="form.night_override" class="input" placeholder="ej.: En el avión, Taglit…">
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn btn-secondary flex-1" @click="editing = false">Cancelar</button>
            <button type="submit" class="btn btn-primary flex-1">Guardar</button>
          </div>
        </form>
      </section>

      <h2 class="section-title"><NavIcon name="star" :size="18" /> Planes</h2>
      <ul v-if="plans.length" class="card divide-y divide-line/70 px-3 py-1">
        <li v-for="p in plans" :key="p.id" class="flex items-center gap-2 py-2">
          <button type="button" class="tick" :aria-label="p.status === 'done' ? `Marcar ${p.title} como pendiente` : `Marcar ${p.title} como hecho`" :aria-pressed="p.status === 'done'" @click="toggleDone(p)">
            <Transition name="pop"><NavIcon v-if="p.status === 'done'" name="check" :size="20" /></Transition>
          </button>
          <button type="button" class="min-h-11 flex-1 text-left" @click="openPlan(p)">
            <span v-if="p.start_time" class="block text-[13px] text-ink-soft tabular">{{ p.start_time }}</span>
            <span class="text-[15px]" :class="p.status === 'done' ? 'text-ink-soft line-through decoration-ink-soft/50' : 'font-semibold'">{{ p.title }}</span>
            <span v-if="p.notes && p.status !== 'done'" class="block text-[13px] text-ink-soft">{{ p.notes }}</span>
          </button>
          <a :href="p.maps_url || mapsUrl({ query: `${p.title} ${placeById.get(day.place_id ?? '')?.name ?? ''}` })" target="_blank" rel="noopener" class="grid h-11 w-11 place-items-center rounded-full hover:bg-paper-2" :aria-label="`Ver ${p.title} en el mapa`">
            <NavIcon name="pin" :size="18" class="text-ink-soft" />
          </a>
        </li>
      </ul>
      <p v-else class="px-1 text-[14px] text-ink-soft">Todavía no hay planes para este día.</p>
      <div class="mt-2 flex items-center gap-3">
        <button type="button" class="btn btn-secondary flex-1" @click="openPlan()"><NavIcon name="plus" :size="18" /> Agregar plan</button>
        <NuxtLink to="/planes" class="shrink-0 px-1 text-[14px] font-semibold text-primary-dark">Traer una idea</NuxtLink>
      </div>

      <h2 class="section-title"><NavIcon name="plane" :size="18" /> Traslados</h2>
      <div class="space-y-2">
        <TransportCard v-for="t in transports" :key="t.id" :t="t" compact />
        <p v-if="!transports.length" class="px-1 text-[14px] text-ink-soft">Ninguno este día.</p>
      </div>

      <h2 class="section-title"><NavIcon name="bed" :size="18" /> Esta noche</h2>
      <div v-if="day.night_override" class="card text-[15px] font-semibold">{{ day.night_override }}</div>
      <StayCard v-else-if="stay" :s="stay" />
      <div v-else class="card">
        <p class="font-semibold text-warn">Sin alojamiento cargado para esta noche.</p>
        <NuxtLink to="/alojamientos" class="link text-[14px]">Ver alojamientos</NuxtLink>
      </div>

      <nav class="mt-8 flex justify-between gap-2" aria-label="Otros días">
        <NuxtLink v-if="prev" :to="`/itinerario/${prev}`" class="flex min-h-11 items-center px-1 text-[14px] font-semibold text-primary-dark">← Día anterior</NuxtLink>
        <span v-else />
        <NuxtLink v-if="next" :to="`/itinerario/${next}`" class="flex min-h-11 items-center px-1 text-[14px] font-semibold text-primary-dark">Día siguiente →</NuxtLink>
      </nav>
    </template>

    <BottomSheet v-model:open="planOpen" :title="planForm.id ? 'Editar plan' : 'Nuevo plan'">
      <form class="space-y-3" @submit.prevent="savePlan">
        <div>
          <label for="p-title" class="field-label">¿Qué?</label>
          <input id="p-title" v-model="planForm.title" class="input" maxlength="120" required>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="min-w-0">
            <label for="p-time" class="field-label">Hora (opcional)</label>
            <input id="p-time" v-model="planForm.start_time" type="time" class="input">
          </div>
          <div class="min-w-0">
            <label for="p-date" class="field-label">Día</label>
            <select id="p-date" v-model="planForm.date" class="input">
              <option v-for="d in data.days" :key="d.id" :value="d.date">{{ d.date.slice(8, 10) }}/{{ d.date.slice(5, 7) }}</option>
            </select>
          </div>
        </div>
        <div>
          <label for="p-notes" class="field-label">Notas</label>
          <textarea id="p-notes" v-model="planForm.notes" class="input" rows="2" />
        </div>
        <div>
          <label for="p-maps" class="field-label">Link de Maps (opcional)</label>
          <input id="p-maps" v-model="planForm.maps_url" class="input" type="url" inputmode="url">
        </div>
        <button type="submit" class="btn btn-primary btn-block">Guardar</button>
        <template v-if="planForm.id">
          <button type="button" class="btn btn-secondary btn-block" @click="unschedule(data.plans.find(p => p.id === planForm.id)!)">Sacar del día (volver a ideas)</button>
          <button type="button" class="btn btn-secondary btn-block text-bad" @click="removePlan(data.plans.find(p => p.id === planForm.id)!)">Borrar</button>
        </template>
      </form>
    </BottomSheet>
  </div>
</template>
