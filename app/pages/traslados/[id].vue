<script setup lang="ts">
import type { Transport } from '#shared/types/domain'
import { formatDayLong, formatTime, localParts, utcLabel, zonedToUtc } from '#shared/time/tz'

const route = useRoute()
const router = useRouter()
const { data, placeById, memberById } = useTripData()
const { show } = useToast()

const isNew = computed(() => route.params.id === 'nuevo')
const t = computed(() => data.transports.find(x => x.id === route.params.id) ?? null)
const editing = ref(isNew.value)

const ZONES = [
  { tz: 'America/Argentina/Buenos_Aires', label: 'Argentina' },
  { tz: 'Europe/Madrid', label: 'España' },
  { tz: 'Asia/Jerusalem', label: 'Israel' },
  { tz: 'Europe/Paris', label: 'Francia' },
  { tz: 'Europe/Rome', label: 'Italia' },
  { tz: 'Europe/Monaco', label: 'Mónaco' },
]

const form = reactive({
  kind: 'flight' as Transport['kind'],
  status: 'booked' as Transport['status'],
  code: '', carrier: '',
  origin_label: '', origin_place_id: '',
  dest_label: '', dest_place_id: '',
  depart_date: '', depart_time: '', depart_tz: 'Europe/Madrid',
  arrive_date: '', arrive_time: '', arrive_tz: 'Europe/Madrid',
  terminal: '', booking_ref: '', purchased_by: '',
  leave_buffer_min: '' as string | number, travel_to_min: '' as string | number,
  notes: '',
})

function fill(x: Transport | null) {
  if (!x) return
  const dep = x.depart_at && x.depart_tz ? localParts(new Date(x.depart_at), x.depart_tz) : null
  const arr = x.arrive_at && x.arrive_tz ? localParts(new Date(x.arrive_at), x.arrive_tz) : null
  Object.assign(form, {
    kind: x.kind, status: x.status, code: x.code ?? '', carrier: x.carrier ?? '',
    origin_label: x.origin_label ?? '', origin_place_id: x.origin_place_id ?? '',
    dest_label: x.dest_label ?? '', dest_place_id: x.dest_place_id ?? '',
    depart_date: dep?.date ?? '', depart_time: dep?.time ?? '', depart_tz: x.depart_tz ?? 'Europe/Madrid',
    arrive_date: arr?.date ?? '', arrive_time: arr?.time ?? '', arrive_tz: x.arrive_tz ?? x.depart_tz ?? 'Europe/Madrid',
    terminal: x.terminal ?? '', booking_ref: x.booking_ref ?? '', purchased_by: x.purchased_by ?? '',
    leave_buffer_min: x.leave_buffer_min ?? '', travel_to_min: x.travel_to_min ?? '', notes: x.notes ?? '',
  })
}
watch(t, x => !editing.value && fill(x), { immediate: true })

// Al elegir la ciudad, sugerir su zona horaria.
watch(() => form.origin_place_id, id => {
  const p = id ? placeById.value.get(id) : null
  if (p) form.depart_tz = p.tz
})
watch(() => form.dest_place_id, id => {
  const p = id ? placeById.value.get(id) : null
  if (p) form.arrive_tz = p.tz
})

const error = computed(() => {
  if ((form.depart_date && !form.depart_time) || (!form.depart_date && form.depart_time)) return 'Completá fecha y hora de salida'
  if ((form.arrive_date && !form.arrive_time) || (!form.arrive_date && form.arrive_time)) return 'Completá fecha y hora de llegada'
  if (form.depart_date && form.arrive_date) {
    const d = zonedToUtc(form.depart_date, form.depart_time, form.depart_tz)
    const a = zonedToUtc(form.arrive_date, form.arrive_time, form.arrive_tz)
    if (a <= d) return 'La llegada es antes que la salida: revisá fechas y zonas horarias'
  }
  return null
})

async function save() {
  if (error.value) return
  const num = (v: string | number) => (v === '' || v === null ? null : Number(v))
  const saved = await saveRow('transports', {
    ...(t.value ?? {}),
    id: t.value?.id,
    kind: form.kind, status: form.status,
    code: form.code.trim().toUpperCase() || null, carrier: form.carrier.trim() || null,
    origin_label: form.origin_label.trim() || null, origin_place_id: form.origin_place_id || null,
    dest_label: form.dest_label.trim() || null, dest_place_id: form.dest_place_id || null,
    depart_at: form.depart_date ? zonedToUtc(form.depart_date, form.depart_time, form.depart_tz).toISOString() : null,
    depart_tz: form.depart_tz,
    arrive_at: form.arrive_date ? zonedToUtc(form.arrive_date, form.arrive_time, form.arrive_tz).toISOString() : null,
    arrive_tz: form.arrive_tz,
    terminal: form.terminal.trim() || null, booking_ref: form.booking_ref.trim() || null,
    purchased_by: form.purchased_by || null,
    leave_buffer_min: num(form.leave_buffer_min), travel_to_min: num(form.travel_to_min),
    notes: form.notes.trim() || null,
  } as Partial<Transport>)
  editing.value = false
  show('Traslado guardado ✓')
  if (isNew.value) router.replace(`/traslados/${saved.id}`)
}

async function remove() {
  if (!t.value || !confirm('¿Borrar este traslado?')) return
  const x = t.value
  await deleteRow('transports', x)
  show('Traslado borrado', 'info', { label: 'Deshacer', run: () => void restoreRow('transports', x) })
  router.replace('/traslados')
}

function show2(at: string | null, tz: string | null) {
  if (!at) return null
  const d = new Date(at)
  const zone = tz ?? 'UTC'
  return { day: formatDayLong(localParts(d, zone).date), time: formatTime(d, zone), utc: utcLabel(d, zone) }
}
const leave = computed(() => (t.value ? leaveTime(t.value, placeById.value) : null))
</script>

<template>
  <div>
    <PageHeader :title="isNew ? 'Nuevo traslado' : t?.code ? `${KIND_LABEL[t.kind]} ${t.code}` : 'Traslado'" back="/traslados" />

    <EmptyState v-if="!isNew && !t && data.loaded" text="No encontramos este traslado." />

    <!-- Ver -->
    <template v-else-if="t && !editing">
      <section class="card tape">
        <p class="text-[18px] font-extrabold">{{ transportTitle(t) }}</p>
        <p v-if="t.carrier" class="text-[15px] text-ink-soft">{{ t.carrier }}</p>
        <span v-if="t.status === 'pending'" class="badge badge-pending mt-1">Pendiente</span>
        <dl class="mt-3 grid grid-cols-1 gap-3 text-[15px]">
          <div>
            <dt class="text-[13px] font-bold text-ink-soft">Sale</dt>
            <dd v-if="show2(t.depart_at, t.depart_tz)" class="font-extrabold">{{ show2(t.depart_at, t.depart_tz)!.day }} · <span class="tabular">{{ show2(t.depart_at, t.depart_tz)!.time }}</span> <span class="text-[13px] text-ink-soft">({{ show2(t.depart_at, t.depart_tz)!.utc }})</span></dd>
            <dd v-else class="font-bold text-warn">Pendiente</dd>
          </div>
          <div>
            <dt class="text-[13px] font-bold text-ink-soft">Llega</dt>
            <dd v-if="show2(t.arrive_at, t.arrive_tz)" class="font-extrabold">{{ show2(t.arrive_at, t.arrive_tz)!.day }} · <span class="tabular">{{ show2(t.arrive_at, t.arrive_tz)!.time }}</span> <span class="text-[13px] text-ink-soft">({{ show2(t.arrive_at, t.arrive_tz)!.utc }})</span></dd>
            <dd v-else class="font-bold text-warn">Pendiente</dd>
          </div>
          <div v-if="leave">
            <dt class="text-[13px] font-bold text-ink-soft">Salir hacia allá (estimado)</dt>
            <dd class="font-extrabold tabular">{{ formatTime(leave, t.depart_tz ?? 'UTC') }}</dd>
          </div>
        </dl>
      </section>

      <section class="card mt-4">
        <CopyValue label="Código de reserva" :value="t.booking_ref" />
        <CopyValue label="Terminal" :value="t.terminal" />
        <div class="py-2 text-[15px]"><span class="font-bold text-ink-soft">Lo compró:</span> {{ t.purchased_by ? memberById.get(t.purchased_by)?.name : '—' }}</div>
        <NuxtLink v-if="t.expense_id" :to="`/gastos/${t.expense_id}`" class="link text-[15px]">Ver el gasto</NuxtLink>
        <p v-if="t.notes" class="mt-2 whitespace-pre-line text-[15px]">{{ t.notes }}</p>
      </section>

      <button type="button" class="btn btn-secondary btn-block mt-4" @click="fill(t); editing = true"><NavIcon name="edit" :size="20" /> Editar</button>

      <AttachmentList owner-type="transport" :owner-id="t.id" title="Pasajes y tarjetas de embarque" />

      <ActivityHistory class="mt-4" entity="transports" :entity-id="t.id" />
      <button type="button" class="btn btn-secondary btn-block mt-2 text-bad" @click="remove">Borrar traslado</button>
    </template>

    <!-- Editar / crear -->
    <form v-else class="space-y-4" @submit.prevent="save">
      <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Tipo">
        <button v-for="(label, k) in KIND_LABEL" :key="k" type="button" role="radio" class="chip" :aria-checked="form.kind === k" @click="form.kind = k as Transport['kind']">{{ label }}</button>
      </div>
      <div class="flex gap-2" role="radiogroup" aria-label="Estado">
        <button type="button" role="radio" class="chip" :aria-checked="form.status === 'booked'" @click="form.status = 'booked'">Reservado</button>
        <button type="button" role="radio" class="chip" :aria-checked="form.status === 'pending'" @click="form.status = 'pending'">Pendiente</button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label for="t-code" class="field-label">Número</label><input id="t-code" v-model="form.code" class="input uppercase" placeholder="IB1234"></div>
        <div><label for="t-carrier" class="field-label">Empresa</label><input id="t-carrier" v-model="form.carrier" class="input"></div>
      </div>

      <fieldset class="card space-y-3 p-3">
        <legend class="px-1 font-extrabold">Salida</legend>
        <div><label for="t-orig" class="field-label">Desde</label><input id="t-orig" v-model="form.origin_label" class="input" placeholder="Roma (FCO)"></div>
        <div>
          <label for="t-orig-place" class="field-label">Ciudad</label>
          <select id="t-orig-place" v-model="form.origin_place_id" class="input"><option value="">—</option><option v-for="p in data.places" :key="p.id" :value="p.id">{{ p.name }}</option></select>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div><label for="t-dd" class="field-label">Fecha</label><input id="t-dd" v-model="form.depart_date" type="date" class="input"></div>
          <div><label for="t-dt" class="field-label">Hora local</label><input id="t-dt" v-model="form.depart_time" type="time" class="input"></div>
        </div>
        <div>
          <label for="t-dtz" class="field-label">Zona horaria</label>
          <select id="t-dtz" v-model="form.depart_tz" class="input"><option v-for="z in ZONES" :key="z.tz" :value="z.tz">{{ z.label }}</option></select>
        </div>
      </fieldset>

      <fieldset class="card space-y-3 p-3">
        <legend class="px-1 font-extrabold">Llegada</legend>
        <div><label for="t-dest" class="field-label">Hasta</label><input id="t-dest" v-model="form.dest_label" class="input" placeholder="Buenos Aires (EZE)"></div>
        <div>
          <label for="t-dest-place" class="field-label">Ciudad</label>
          <select id="t-dest-place" v-model="form.dest_place_id" class="input"><option value="">—</option><option v-for="p in data.places" :key="p.id" :value="p.id">{{ p.name }}</option></select>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div><label for="t-ad" class="field-label">Fecha</label><input id="t-ad" v-model="form.arrive_date" type="date" class="input"></div>
          <div><label for="t-at" class="field-label">Hora local</label><input id="t-at" v-model="form.arrive_time" type="time" class="input"></div>
        </div>
        <div>
          <label for="t-atz" class="field-label">Zona horaria</label>
          <select id="t-atz" v-model="form.arrive_tz" class="input"><option v-for="z in ZONES" :key="z.tz" :value="z.tz">{{ z.label }}</option></select>
        </div>
      </fieldset>

      <div class="grid grid-cols-2 gap-2">
        <div><label for="t-term" class="field-label">Terminal</label><input id="t-term" v-model="form.terminal" class="input"></div>
        <div><label for="t-ref" class="field-label">Código de reserva</label><input id="t-ref" v-model="form.booking_ref" class="input uppercase"></div>
      </div>
      <div>
        <label for="t-buyer" class="field-label">¿Quién lo compró?</label>
        <select id="t-buyer" v-model="form.purchased_by" class="input"><option value="">—</option><option v-for="m in data.members" :key="m.id" :value="m.id">{{ m.name }}</option></select>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label for="t-buf" class="field-label">Llegar antes (min)</label><input id="t-buf" v-model="form.leave_buffer_min" type="number" min="0" class="input" placeholder="auto"></div>
        <div><label for="t-trav" class="field-label">Viaje hasta ahí (min)</label><input id="t-trav" v-model="form.travel_to_min" type="number" min="0" class="input" placeholder="0"></div>
      </div>
      <div><label for="t-notes" class="field-label">Notas</label><textarea id="t-notes" v-model="form.notes" class="input" rows="3" /></div>

      <p v-if="error" class="rounded-xl border-2 border-bad bg-bad-soft p-3 font-bold text-bad" role="alert">{{ error }}</p>
      <div class="flex gap-2">
        <button v-if="!isNew" type="button" class="btn btn-secondary flex-1" @click="editing = false">Cancelar</button>
        <button type="submit" class="btn btn-primary flex-1" :disabled="!!error">Guardar</button>
      </div>
    </form>
  </div>
</template>
