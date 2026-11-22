<script setup lang="ts">
import { formatMoney } from '#shared/money/currency'
import type { Stay } from '#shared/types/domain'
import { formatDayLong } from '#shared/time/tz'

const route = useRoute()
const router = useRouter()
const { data, chapterById, partyName } = useTripData()
const { show } = useToast()

const isNew = computed(() => route.params.id === 'nuevo')
const s = computed(() => data.stays.find(x => x.id === route.params.id) ?? null)
const chapter = computed(() => (s.value?.chapter_id ? chapterById.value.get(s.value.chapter_id) : null))
const expense = computed(() => (s.value?.expense_id ? data.expenses.find(e => e.id === s.value!.expense_id) ?? null : null))
const editing = ref(isNew.value)

const FIELDS = ['name', 'kind', 'address', 'check_in_date', 'check_in_time', 'check_out_date', 'check_out_time', 'booking_url', 'contact', 'wifi_name', 'wifi_pass', 'door_code', 'notes'] as const
const form = reactive<Record<string, any>>({ status: 'booked', chapter_id: '', guests: 6 })
function fill(x: Stay | null) {
  for (const f of FIELDS) form[f] = x?.[f] ?? ''
  form.status = x?.status ?? 'booked'
  form.chapter_id = x?.chapter_id ?? ''
  form.guests = x?.guests ?? 6
}
watch(s, x => !editing.value && fill(x), { immediate: true })
if (isNew.value) fill(null)

async function save() {
  if (!String(form.name).trim()) return show('Poné un nombre', 'warn')
  const row: Record<string, any> = { ...(s.value ?? {}), id: s.value?.id, status: form.status, chapter_id: form.chapter_id || null, guests: form.guests ? Number(form.guests) : null }
  for (const f of FIELDS) row[f] = String(form[f] ?? '').trim() || null
  const saved = await saveRow('stays', row)
  editing.value = false
  show('Alojamiento guardado ✓')
  if (isNew.value) router.replace(`/alojamientos/${saved.id}`)
}

async function remove() {
  if (!s.value || !confirm('¿Borrar este alojamiento?')) return
  const x = s.value
  await deleteRow('stays', x)
  show('Alojamiento borrado', 'info', { label: 'Deshacer', run: () => void restoreRow('stays', x) })
  router.replace('/alojamientos')
}
</script>

<template>
  <div>
    <PageHeader :title="isNew ? 'Nuevo alojamiento' : s?.name ?? 'Alojamiento'" back="/alojamientos" />
    <EmptyState v-if="!isNew && !s && data.loaded" text="No encontramos este alojamiento." />

    <template v-else-if="s && !editing">
      <section class="card tape" :style="{ '--tape': chapter?.accent }">
        <p class="text-[13px] font-bold uppercase tracking-wide text-ink-soft">{{ chapter?.name }}<template v-if="s.kind"> · {{ s.kind }}</template></p>
        <p class="text-[18px] font-extrabold">{{ s.name }}</p>
        <span v-if="s.status === 'pending'" class="badge badge-pending mt-1">Pendiente: sin reservar</span>
        <p v-if="s.address" class="mt-2 text-[15px]">{{ s.address }}</p>
        <p v-else class="mt-2 text-[14px] font-bold text-warn">Falta la dirección</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <a :href="mapsUrl({ query: s.address || s.name, lat: s.lat, lon: s.lon })" target="_blank" rel="noopener" class="btn btn-secondary flex-1"><NavIcon name="pin" :size="20" /> Mapa</a>
          <a v-if="s.booking_url" :href="s.booking_url" target="_blank" rel="noopener" class="btn btn-secondary flex-1">Reserva ↗</a>
        </div>
      </section>

      <section class="card mt-4 grid grid-cols-2 gap-3 text-[15px]">
        <div>
          <p class="text-[13px] font-bold text-ink-soft">Check-in</p>
          <p class="font-extrabold">{{ s.check_in_date ? formatDayLong(s.check_in_date) : '—' }}</p>
          <p class="tabular">{{ s.check_in_time ? `desde ${s.check_in_time}` : 'Horario sin cargar' }}</p>
        </div>
        <div>
          <p class="text-[13px] font-bold text-ink-soft">Check-out</p>
          <p class="font-extrabold">{{ s.check_out_date ? formatDayLong(s.check_out_date) : '—' }}</p>
          <p class="tabular">{{ s.check_out_time ? `hasta ${s.check_out_time}` : 'Horario sin cargar' }}</p>
        </div>
      </section>

      <section class="card mt-4">
        <CopyValue label="Wifi" :value="s.wifi_name" />
        <CopyValue label="Contraseña del wifi" :value="s.wifi_pass" secret />
        <CopyValue label="Código de la puerta" :value="s.door_code" secret />
        <CopyValue label="Contacto" :value="s.contact" />
      </section>

      <section class="card mt-4">
        <p class="text-[13px] font-bold text-ink-soft">Monto</p>
        <template v-if="expense">
          <p class="text-[18px] font-extrabold tabular">{{ formatMoney(expense.amount_minor, expense.currency) }}</p>
          <p class="text-[15px]">Pagó {{ Object.keys(expense.payers).map(partyName).join(' y ') }} · {{ s.guests ?? 6 }} huéspedes</p>
          <NuxtLink :to="`/gastos/${expense.id}`" class="link mt-1 inline-block text-[15px]">Editar monto o quién pagó</NuxtLink>
        </template>
        <template v-else>
          <p class="text-[15px] text-ink-soft">Sin gasto cargado.</p>
          <NuxtLink :to="`/gastos/nuevo?stay=${s.id}`" class="link text-[15px]">Cargar el pago del alojamiento</NuxtLink>
        </template>
      </section>

      <p v-if="s.notes" class="card mt-4 whitespace-pre-line text-[15px]">{{ s.notes }}</p>

      <button type="button" class="btn btn-secondary btn-block mt-4" @click="fill(s); editing = true"><NavIcon name="edit" :size="20" /> Editar</button>
      <AttachmentList owner-type="stay" :owner-id="s.id" title="Reserva y comprobantes" />
      <ActivityHistory class="mt-4" entity="stays" :entity-id="s.id" />
      <button type="button" class="btn btn-secondary btn-block mt-2 text-bad" @click="remove">Borrar alojamiento</button>
    </template>

    <form v-else class="space-y-4" @submit.prevent="save">
      <div class="flex gap-2" role="radiogroup" aria-label="Estado">
        <button type="button" role="radio" class="chip" :aria-checked="form.status === 'booked'" @click="form.status = 'booked'">Reservado</button>
        <button type="button" role="radio" class="chip" :aria-checked="form.status === 'pending'" @click="form.status = 'pending'">Pendiente</button>
      </div>
      <div><label for="s-name" class="field-label">Nombre</label><input id="s-name" v-model="form.name" class="input" required></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label for="s-kind" class="field-label">Tipo</label><input id="s-kind" v-model="form.kind" class="input" placeholder="Hostel, Airbnb…"></div>
        <div>
          <label for="s-chapter" class="field-label">Capítulo</label>
          <select id="s-chapter" v-model="form.chapter_id" class="input"><option value="">—</option><option v-for="c in data.chapters" :key="c.id" :value="c.id">{{ c.name }}</option></select>
        </div>
      </div>
      <div><label for="s-addr" class="field-label">Dirección</label><input id="s-addr" v-model="form.address" class="input" autocomplete="street-address"></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label for="s-in" class="field-label">Check-in</label><input id="s-in" v-model="form.check_in_date" type="date" class="input"></div>
        <div><label for="s-in-t" class="field-label">Desde las</label><input id="s-in-t" v-model="form.check_in_time" type="time" class="input"></div>
        <div><label for="s-out" class="field-label">Check-out</label><input id="s-out" v-model="form.check_out_date" type="date" class="input"></div>
        <div><label for="s-out-t" class="field-label">Hasta las</label><input id="s-out-t" v-model="form.check_out_time" type="time" class="input"></div>
      </div>
      <div><label for="s-url" class="field-label">Link de la reserva</label><input id="s-url" v-model="form.booking_url" type="url" class="input" inputmode="url"></div>
      <div><label for="s-contact" class="field-label">Contacto (teléfono, anfitrión)</label><input id="s-contact" v-model="form.contact" class="input"></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label for="s-wifi" class="field-label">Wifi</label><input id="s-wifi" v-model="form.wifi_name" class="input"></div>
        <div><label for="s-pass" class="field-label">Contraseña</label><input id="s-pass" v-model="form.wifi_pass" class="input"></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label for="s-door" class="field-label">Código de puerta</label><input id="s-door" v-model="form.door_code" class="input"></div>
        <div><label for="s-guests" class="field-label">Huéspedes</label><input id="s-guests" v-model="form.guests" type="number" min="1" class="input"></div>
      </div>
      <div><label for="s-notes" class="field-label">Notas</label><textarea id="s-notes" v-model="form.notes" class="input" rows="3" /></div>
      <div class="flex gap-2">
        <button v-if="!isNew" type="button" class="btn btn-secondary flex-1" @click="editing = false">Cancelar</button>
        <button type="submit" class="btn btn-primary flex-1">Guardar</button>
      </div>
    </form>
  </div>
</template>
