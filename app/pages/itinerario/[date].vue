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
  <div>
    <PageHeader :title="formatDayLong(date)" back="/itinerario" :subtitle="chapter ? `${chapter.emoji ?? ''} ${chapter.name}` : undefined" />

    <EmptyState v-if="!day" text="Este día no es parte del viaje." />

    <template v-else>
      <section class="card tape" :style="{ '--tape': chapter?.accent }">
        <template v-if="!editing">
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-[18px] font-extrabold">{{ day.title || 'Día libre' }}</p>
              <p v-if="day.place_id" class="text-[14px] text-ink-soft">📍 {{ placeById.get(day.place_id)?.name }}</p>
            </div>
            <button type="button" class="btn btn-secondary min-h-11 px-3" @click="startEdit"><NavIcon name="edit" :size="18" /> Editar</button>
          </div>
          <p v-if="day.notes" class="mt-2 whitespace-pre-line text-[15px]">{{ day.notes }}</p>
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

      <h2 class="section-title">★ Planes</h2>
      <ul class="space-y-2">
        <li v-for="p in plans" :key="p.id" class="card flex items-center gap-2 p-2 pl-3">
          <button type="button" class="tick" :aria-label="p.status === 'done' ? `Marcar ${p.title} como pendiente` : `Marcar ${p.title} como hecho`" :aria-pressed="p.status === 'done'" @click="toggleDone(p)">
            <NavIcon v-if="p.status === 'done'" name="check" :size="20" />
          </button>
          <button type="button" class="min-h-11 flex-1 text-left" @click="openPlan(p)">
            <span v-if="p.start_time" class="mr-1 font-bold text-ink-soft tabular">{{ p.start_time }}</span>
            <span class="font-bold" :class="p.status === 'done' ? 'line-through opacity-60' : ''">{{ p.title }}</span>
            <span v-if="p.notes" class="block text-[14px] text-ink-soft">{{ p.notes }}</span>
          </button>
          <a :href="p.maps_url || mapsUrl({ query: `${p.title} ${placeById.get(day.place_id ?? '')?.name ?? ''}` })" target="_blank" rel="noopener" class="grid h-11 w-11 place-items-center rounded-full hover:bg-paper-2" :aria-label="`Ver ${p.title} en el mapa`">
            <NavIcon name="pin" :size="20" />
          </a>
        </li>
      </ul>
      <button type="button" class="btn btn-secondary btn-block mt-2" @click="openPlan()"><NavIcon name="plus" :size="20" /> Agregar plan</button>
      <NuxtLink to="/planes" class="link mt-2 inline-block text-[15px]">Traer una idea de la lista de planes</NuxtLink>

      <h2 class="section-title"><NavIcon name="plane" :size="20" /> Traslados</h2>
      <div class="space-y-2">
        <TransportCard v-for="t in transports" :key="t.id" :t="t" compact />
        <p v-if="!transports.length" class="text-[15px] text-ink-soft">Ninguno este día.</p>
      </div>

      <h2 class="section-title"><NavIcon name="bed" :size="20" /> Esta noche</h2>
      <div v-if="day.night_override" class="card font-bold">{{ day.night_override }}</div>
      <StayCard v-else-if="stay" :s="stay" />
      <div v-else class="card">
        <p class="font-bold text-warn">Sin alojamiento cargado para esta noche.</p>
        <NuxtLink to="/alojamientos" class="link text-[15px]">Ver alojamientos</NuxtLink>
      </div>

      <nav class="mt-6 flex justify-between gap-2" aria-label="Otros días">
        <NuxtLink v-if="prev" :to="`/itinerario/${prev}`" class="btn btn-secondary">← Día anterior</NuxtLink>
        <span v-else />
        <NuxtLink v-if="next" :to="`/itinerario/${next}`" class="btn btn-secondary">Día siguiente →</NuxtLink>
      </nav>
    </template>

    <BottomSheet v-model:open="planOpen" :title="planForm.id ? 'Editar plan' : 'Nuevo plan'">
      <form class="space-y-3" @submit.prevent="savePlan">
        <div>
          <label for="p-title" class="field-label">¿Qué?</label>
          <input id="p-title" v-model="planForm.title" class="input" maxlength="120" required>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label for="p-time" class="field-label">Hora (opcional)</label>
            <input id="p-time" v-model="planForm.start_time" type="time" class="input">
          </div>
          <div>
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
