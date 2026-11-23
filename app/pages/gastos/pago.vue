<script setup lang="ts">
// Pagos entre amigas ("Lara le pagó 40 USD a Juli").
import { DEFAULT_CURRENCIES, formatPlain, parseAmount } from '#shared/money/currency'
import type { Settlement } from '#shared/types/domain'

const route = useRoute()
const router = useRouter()
const { data, me, base } = useTripData()
const { today } = useNow()
const { show } = useToast()
const { allSettled } = useLedger()

const existing = computed(() => data.settlements.find(s => s.id === route.query.id) ?? null)
const s = existing.value
const q = route.query

const from = ref<string>(s?.from_id ?? (q.from as string) ?? me.value?.id ?? '')
// Si la pantalla se abre antes de que carguen los datos, preseleccionar a quien la usa apenas aparezca.
watch(me, m => {
  if (!from.value && m) from.value = m.id
}, { immediate: true })
const to = ref<string>(s?.to_id ?? (q.to as string) ?? '')
const currency = ref<string>(s?.currency ?? (q.currency as string) ?? base.value)
const amountText = ref(s ? formatPlain(s.amount_minor, s.currency) : q.amount ? formatPlain(Number(q.amount), (q.currency as string) ?? base.value) : '')
const date = ref(s?.date ?? today.value)
const note = ref(s?.note ?? '')

const parties = computed(() => data.members.map(m => ({ id: m.id, name: m.name, member: m })))
const amount = computed(() => parseAmount(amountText.value, currency.value))

const error = computed(() => {
  if (!from.value || !to.value) return 'Elegí quién pagó y a quién'
  if (from.value === to.value) return 'Tienen que ser dos personas distintas'
  if (!amountText.value) return null
  if (!amount.value || amount.value <= 0) return 'Poné un monto válido'
  return null
})
const canSave = computed(() => !error.value && !!amount.value)

async function save() {
  if (!canSave.value || !amount.value) return
  const wasSettled = allSettled.value
  await saveRow('settlements', {
    ...(s ?? {}),
    id: s?.id,
    from_id: from.value,
    to_id: to.value,
    currency: currency.value,
    amount_minor: amount.value,
    // Sin conversión: el pago queda en su moneda (la base pide un tipo de cambio, va 1).
    fx_rate: '1',
    base_amount_minor: amount.value,
    date: date.value,
    note: note.value.trim() || null,
  } as Partial<Settlement>)
  show('Deuda saldada ✓', 'ok')
  // IndexedDB avisa el cambio enseguida; se espera un instante para ver si quedó todo saldado.
  await new Promise(r => setTimeout(r, 250))
  if (!wasSettled && allSettled.value) celebrate()
  router.replace('/gastos/balances')
}

async function remove() {
  if (!s || !confirm('¿Borrar este pago?')) return
  await deleteRow('settlements', s)
  show('Pago borrado', 'info', { label: 'Deshacer', run: () => void restoreRow('settlements', s) })
  router.replace('/gastos')
}
</script>

<template>
  <div>
    <PageHeader :title="s ? 'Editar deuda saldada' : 'Saldar una deuda'" back />
    <form class="space-y-5" @submit.prevent="save">
      <fieldset>
        <legend class="field-label">¿Quién pagó?</legend>
        <div class="flex flex-wrap gap-2">
          <button v-for="p in parties" :key="p.id" type="button" class="pick" :aria-pressed="from === p.id" @click="from = p.id">
            <MemberAvatar :member="p.member" :size="38" />{{ p.name }}
          </button>
        </div>
      </fieldset>
      <fieldset>
        <legend class="field-label">¿A quién?</legend>
        <div class="flex flex-wrap gap-2">
          <button v-for="p in parties" :key="p.id" type="button" class="pick" :aria-pressed="to === p.id" :disabled="p.id === from" @click="to = p.id">
            <MemberAvatar :member="p.member" :size="38" />{{ p.name }}
          </button>
        </div>
      </fieldset>

      <div>
        <label for="pay-amount" class="field-label">Monto</label>
        <div class="flex gap-2">
          <input id="pay-amount" v-model="amountText" class="input min-w-0 flex-1 text-[18px] font-bold tabular" inputmode="decimal" placeholder="0,00">
          <div class="relative shrink-0">
            <label for="pay-currency" class="sr-only">Moneda</label>
            <select id="pay-currency" v-model="currency" class="input w-[104px] appearance-none pr-9 font-semibold">
              <option v-for="c in [...new Set([base, ...DEFAULT_CURRENCIES, currency])]" :key="c" :value="c">{{ c }}</option>
            </select>
            <NavIcon name="chevron" :size="16" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-ink-soft" />
          </div>
        </div>
      </div>

      <div>
        <label for="pay-date" class="field-label">Fecha</label>
        <input id="pay-date" v-model="date" type="date" class="input">
      </div>
      <div>
        <label for="pay-note" class="field-label">Nota (opcional)</label>
        <input id="pay-note" v-model="note" class="input" maxlength="200" placeholder="ej.: transferencia, efectivo…">
      </div>

      <p v-if="error && amountText" class="rounded-xl border-2 border-bad bg-bad-soft p-3 font-semibold text-bad" role="alert">{{ error }}</p>
      <button type="submit" class="btn btn-primary btn-block btn-big" :disabled="!canSave">Guardar pago</button>
      <button v-if="s" type="button" class="btn btn-secondary btn-block text-bad" @click="remove">Borrar pago</button>
    </form>
  </div>
</template>
