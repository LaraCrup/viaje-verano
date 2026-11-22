<script setup lang="ts">
// Pagos entre amigas ("Lara le pagó 40 USD a Juli") y movimientos de la caja.
import { DEFAULT_CURRENCIES, formatMoney, formatPlain, parseAmount } from '#shared/money/currency'
import { convertMinor, describeRate, invertRate, isValidRate } from '#shared/money/fx'
import type { Settlement } from '#shared/types/domain'

const route = useRoute()
const router = useRouter()
const { data, me, base, potById } = useTripData()
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
const fxRate = ref<string | null>(s?.fx_rate ?? null)
const fxText = ref('')

const parties = computed(() => [
  ...data.members.map(m => ({ id: m.id, name: m.name, member: m, pot: null })),
  ...data.pots.map(p => ({ id: p.id, name: p.name, member: null, pot: p })),
])
const amount = computed(() => parseAmount(amountText.value, currency.value))
const potInvolved = computed(() => potById.value.get(from.value) ?? potById.value.get(to.value) ?? null)

watch(currency, async c => {
  if (s && c === s.currency) return
  const r = await quoteRate(c, base.value)
  fxRate.value = r.rate
}, { immediate: !s })
watch(potInvolved, p => {
  if (p) currency.value = p.currency
}, { immediate: true })

function applyFx() {
  const raw = fxText.value.replace(',', '.')
  if (!isValidRate(raw)) return show('Tipo de cambio inválido', 'warn')
  fxRate.value = currency.value === 'ARS' ? invertRate(raw) : raw
}

const error = computed(() => {
  if (!from.value || !to.value) return 'Elegí quién pagó y a quién'
  if (from.value === to.value) return 'Tienen que ser dos personas distintas'
  if (!amountText.value) return null
  if (!amount.value || amount.value <= 0) return 'Poné un monto válido'
  if (!fxRate.value) return `Falta el tipo de cambio de ${currency.value} a ${base.value}`
  return null
})
const canSave = computed(() => !error.value && !!amount.value)

async function save() {
  if (!canSave.value || !amount.value || !fxRate.value) return
  const wasSettled = allSettled.value
  await saveRow('settlements', {
    ...(s ?? {}),
    id: s?.id,
    from_id: from.value,
    to_id: to.value,
    currency: currency.value,
    amount_minor: amount.value,
    fx_rate: fxRate.value,
    base_amount_minor: convertMinor(amount.value, currency.value, base.value, fxRate.value),
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
    <div v-if="!s" class="card mb-5 text-[14px]">
      <p>Para cuando una le devuelve plata a otra, por ejemplo: <strong>Lara le pasó US$ 40 a Juli</strong>.</p>
      <p class="mt-2 text-ink-soft">¿Pagaste algo para varias (una cena, entradas, el súper)? Eso es un gasto: ahí elegís entre quiénes se divide y cuánto le toca a cada una.</p>
      <NuxtLink to="/gastos/nuevo" class="btn btn-secondary btn-block mt-3">Cargarlo como gasto</NuxtLink>
    </div>
    <form class="space-y-5" @submit.prevent="save">
      <fieldset>
        <legend class="field-label">¿Quién pagó?</legend>
        <div class="flex flex-wrap gap-2">
          <button v-for="p in parties" :key="p.id" type="button" class="pick" :aria-pressed="from === p.id" @click="from = p.id">
            <MemberAvatar :member="p.member" :pot="p.pot" :size="38" />{{ p.name }}
          </button>
        </div>
      </fieldset>
      <fieldset>
        <legend class="field-label">¿A quién?</legend>
        <div class="flex flex-wrap gap-2">
          <button v-for="p in parties" :key="p.id" type="button" class="pick" :aria-pressed="to === p.id" :disabled="p.id === from" @click="to = p.id">
            <MemberAvatar :member="p.member" :pot="p.pot" :size="38" />{{ p.name }}
          </button>
        </div>
      </fieldset>

      <div class="card">
        <label for="pay-amount" class="field-label">Monto</label>
        <div class="flex items-center gap-2">
          <input id="pay-amount" v-model="amountText" class="input min-h-14 flex-1 text-[20px] font-extrabold tabular" inputmode="decimal" placeholder="0,00">
          <span class="text-[18px] font-extrabold">{{ currency }}</span>
        </div>
        <div v-if="!potInvolved" class="mt-3 flex flex-wrap gap-2">
          <button v-for="c in [...new Set([base, ...DEFAULT_CURRENCIES])]" :key="c" type="button" class="chip" :aria-pressed="currency === c" @click="currency = c">{{ c }}</button>
        </div>
        <p v-else class="mt-2 text-[14px] text-ink-soft">Los movimientos de la caja van en {{ potInvolved.currency }}.</p>
        <div v-if="currency !== base" class="mt-3 text-[14px]">
          <p v-if="fxRate" class="text-ink-soft">{{ describeRate(fxRate, currency, base) }}<template v-if="amount"> · ≈ {{ formatMoney(convertMinor(amount, currency, base, fxRate), base) }}</template></p>
          <div v-else class="flex gap-2">
            <label for="pay-fx" class="sr-only">Tipo de cambio</label>
            <input id="pay-fx" v-model="fxText" class="input flex-1" inputmode="decimal" :placeholder="currency === 'ARS' ? `${currency} por 1 ${base}` : `${base} por 1 ${currency}`">
            <button type="button" class="btn btn-secondary" @click="applyFx">Listo</button>
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

      <p v-if="error && amountText" class="rounded-xl border-2 border-bad bg-bad-soft p-3 font-bold text-bad" role="alert">{{ error }}</p>
      <button type="submit" class="btn btn-primary btn-block btn-big" :disabled="!canSave">Guardar pago</button>
      <button v-if="s" type="button" class="btn btn-secondary btn-block text-bad" @click="remove">Borrar pago</button>
    </form>
  </div>
</template>
