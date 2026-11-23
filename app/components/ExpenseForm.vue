<script setup lang="ts">
/**
 * Alta y edición de gastos.
 * Caso común: monto → (moneda) → categoría → en qué → Guardar. Pagó: yo. Partes iguales entre las 6.
 * Categoría y descripción son obligatorias para que los números se entiendan después.
 */
import { CATEGORIES } from '#shared/money/categories'
import { DEFAULT_CURRENCIES, formatMoney, formatPlain, isValidCurrency, parseAmount } from '#shared/money/currency'
import { computeExpense, formatPercent, parsePercent, parseShares, SPLIT_LABELS, type SplitEntry, type SplitMode } from '#shared/money/split'
import type { Expense } from '#shared/types/domain'
import { uuid } from '~/lib/supabase'
import { storeFile } from '~/sync/files'

const props = defineProps<{ expense?: Expense | null; preset?: { description?: string; category?: string; date?: string | null } }>()
const emit = defineEmits<{ saved: [Expense]; deleted: [] }>()

const { data, me, base, memberById, chapterForDate, placeForDate } = useTripData()
const { today } = useNow()
const { show } = useToast()
const { tripId } = useSession()

const e = props.expense
const id = e?.id ?? uuid()
const members = computed(() => data.members)
const allIds = computed(() => members.value.map(m => m.id))

// ---- Estado del formulario ----
const amountText = ref(e ? formatPlain(e.amount_minor, e.currency) : '')
const currency = ref(e?.currency ?? '')
const otherCurrency = ref('')
const description = ref(e?.description ?? props.preset?.description ?? '')
// Sin categoría por defecto en un gasto nuevo: hay que elegirla (sirve para los números).
const cat = ref<string>(e?.category ?? props.preset?.category ?? '')
const date = ref(e?.date ?? props.preset?.date ?? today.value)
const note = ref(e?.note ?? '')
const receiptPath = ref<string | null>(e?.receipt_path ?? null)
const showMore = ref(!!(e && (e.note || e.receipt_path || e.date !== today.value)))

const payerIds = Object.keys(e?.payers ?? {})
const multiPay = ref(payerIds.length > 1)
const singlePayer = ref<string>(payerIds.length === 1 ? payerIds[0]! : me.value?.id ?? '')
const multiPayText = ref<Record<string, string>>(
  Object.fromEntries(Object.entries(e?.payers ?? {}).map(([k, v]) => [k, formatPlain(v, e!.currency)])),
)

const mode = ref<SplitMode>(e?.split_mode ?? 'equal')
const included = ref<string[]>(e && (e.split_mode === 'equal') ? Object.keys(e.shares) : [...allIds.value])
const personalOf = ref<string>(e?.split_mode === 'personal' ? Object.keys(e.shares)[0]! : me.value?.id ?? '')
const valuesText = ref<Record<string, string>>({})
if (e && ['exact', 'percent', 'shares'].includes(e.split_mode)) {
  for (const [k, v] of Object.entries(e.split_inputs ?? {})) {
    valuesText.value[k] = e.split_mode === 'exact' ? formatPlain(v, e.currency) : formatPercent(v).replace(' %', '')
  }
}


// Si no hay miembros todavía al montar (primer render), completar.
watch(allIds, ids => {
  if (!e && included.value.length === 0) included.value = [...ids]
  if (!singlePayer.value && me.value) singlePayer.value = me.value.id
  if (!personalOf.value && me.value) personalOf.value = me.value.id
}, { immediate: true })

// Moneda por defecto: la base del viaje (USD). Se cambia con el selector de al lado del monto.
const chapter = computed(() => chapterForDate(date.value))
const place = computed(() => placeForDate(date.value))
onMounted(() => {
  if (!currency.value) currency.value = base.value
  if (!e) document.getElementById('amount')?.focus()
})

const currencyOptions = computed(() => {
  const set = new Set<string>([base.value, ...DEFAULT_CURRENCIES])
  if (currency.value) set.add(currency.value)
  return [...set].filter(Boolean)
})

// "Otra…" en el selector abre un campito para escribir el código (GBP, CHF…).
const OTHER = '__otra'
const otherOpen = ref(false)
function onCurrencyPick(ev: Event) {
  const el = ev.target as HTMLSelectElement
  if (el.value === OTHER) {
    otherOpen.value = true
    el.value = currency.value
    nextTick(() => document.getElementById('other-cur')?.focus())
  } else {
    currency.value = el.value
    otherOpen.value = false
  }
}
function pickOther() {
  const c = otherCurrency.value.trim().toUpperCase()
  if (isValidCurrency(c)) {
    currency.value = c
    otherCurrency.value = ''
    otherOpen.value = false
  } else show('Ese código de moneda no existe (ej.: GBP, CHF, JPY)', 'warn')
}

// ---- Cálculo ----
const amount = computed(() => parseAmount(amountText.value, currency.value || 'USD'))

const payers = computed<Record<string, number>>(() => {
  if (!amount.value) return {}
  if (!multiPay.value) return singlePayer.value ? { [singlePayer.value]: amount.value } : {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(multiPayText.value)) {
    const n = parseAmount(v, currency.value)
    if (n) out[k] = n
  }
  return out
})

const entries = computed<SplitEntry[]>(() => {
  switch (mode.value) {
    case 'equal':
      return included.value.map(memberId => ({ memberId }))
    case 'personal':
      return personalOf.value ? [{ memberId: personalOf.value }] : []
    default:
      return allIds.value
        .map(memberId => {
          const t = valuesText.value[memberId] ?? ''
          const v = mode.value === 'exact' ? parseAmount(t, currency.value) : mode.value === 'percent' ? parsePercent(t) : parseShares(t)
          return { memberId, value: v ?? 0 }
        })
        .filter(x => x.value)
  }
})

const result = computed(() => {
  if (!amount.value || amount.value <= 0) return null
  return computeExpense({ id, amount: amount.value, currency: currency.value, payers: payers.value, split: { mode: mode.value, entries: entries.value } })
})

const error = computed(() => {
  if (!amountText.value) return null
  if (!amount.value) return 'No entiendo ese monto. Probá con algo como 12,50'
  if (result.value && !result.value.ok) return result.value.error
  return null
})
/** Lo obligatorio además del monto: categoría y en qué fue (para poder entender los números después). */
const missing = computed(() => {
  const out: string[] = []
  if (!cat.value) out.push('categoría')
  if (!description.value.trim()) out.push('en qué')
  return out
})
const canSave = computed(() => !!result.value?.ok && !missing.value.length && !saving.value)

// Totales parciales para guiar al cargar montos / porcentajes
const splitHint = computed(() => {
  if (!amount.value) return ''
  if (mode.value === 'exact') {
    const sum = entries.value.reduce((a, x) => a + (x.value ?? 0), 0)
    return `Repartido ${formatMoney(sum, currency.value)} de ${formatMoney(amount.value, currency.value)}`
  }
  if (mode.value === 'percent') {
    const sum = entries.value.reduce((a, x) => a + (x.value ?? 0), 0)
    return `Suma ${formatPercent(sum)} de 100 %`
  }
  return ''
})

function previewShare(memberId: string) {
  return result.value?.ok ? result.value.value.shares[memberId] ?? 0 : null
}

// ---- Foto del ticket ----
async function onReceipt(ev: Event) {
  const f = (ev.target as HTMLInputElement).files?.[0]
  if (!f) return
  const stored = await storeFile(tripId.value, 'receipts', f)
  receiptPath.value = stored.path
  show('Foto guardada', 'ok')
}

// ---- Guardar / borrar ----
const saving = ref(false)
async function save() {
  if (!result.value?.ok || !amount.value || missing.value.length) return
  saving.value = true
  const { payers: p, shares } = result.value.value
  const inputs: Record<string, number> =
    mode.value === 'equal' || mode.value === 'personal'
      ? Object.fromEntries(Object.keys(shares).map(k => [k, 1]))
      : Object.fromEntries(entries.value.map(x => [x.memberId, x.value ?? 0]))
  const row = {
    ...(e ?? {}),
    id,
    description: description.value.trim(),
    category: cat.value as Expense['category'],
    currency: currency.value,
    amount_minor: amount.value,
    // Sin conversión: cada gasto queda en su moneda (la base pide un tipo de cambio, va 1).
    fx_rate: '1',
    fx_source: 'same' as const,
    base_amount_minor: amount.value,
    date: date.value,
    chapter_id: chapter.value?.id ?? null,
    place_id: place.value?.id ?? null,
    split_mode: mode.value,
    payers: p,
    shares,
    split_inputs: inputs,
    receipt_path: receiptPath.value,
    note: note.value.trim() || null,
  }
  const saved = (await saveRow('expenses', row)) as unknown as Expense
  saving.value = false
  emit('saved', saved)
}

async function remove() {
  if (!e) return
  if (!confirm('¿Borrar este gasto? Queda en el historial y se puede deshacer.')) return
  await deleteRow('expenses', e)
  show('Gasto borrado', 'info', { label: 'Deshacer', run: () => void restoreRow('expenses', e) })
  emit('deleted')
}

const payerOptions = computed(() => members.value.map(m => ({ id: m.id, name: m.name, member: m })))
</script>

<template>
  <form class="space-y-5" @submit.prevent="save">
    <!-- Monto + moneda -->
    <section class="card tape">
      <label for="amount" class="field-label">¿Cuánto?</label>
      <div class="flex gap-2">
        <input
          id="amount"
          v-model="amountText"
          class="input min-w-0 flex-1 text-[18px] font-bold tabular"
          inputmode="decimal"
          autocomplete="off"
          placeholder="0,00"
          required
        >
        <div class="relative shrink-0">
          <label for="currency" class="sr-only">Moneda</label>
          <select id="currency" :value="currency" class="input w-[104px] appearance-none pr-9 font-semibold" @change="onCurrencyPick">
            <option v-for="c in currencyOptions" :key="c" :value="c">{{ c }}</option>
            <option :value="OTHER">Otra…</option>
          </select>
          <NavIcon name="chevron" :size="16" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-ink-soft" />
        </div>
      </div>
      <div v-if="otherOpen" class="mt-2 flex items-center gap-2">
        <label for="other-cur" class="sr-only">Código de otra moneda</label>
        <input id="other-cur" v-model="otherCurrency" class="input flex-1 uppercase" maxlength="3" placeholder="Código, ej.: GBP" @keydown.enter.prevent="pickOther">
        <button type="button" class="btn btn-secondary" :disabled="otherCurrency.length !== 3" @click="pickOther">Usar</button>
      </div>

    </section>

    <!-- Categoría -->
    <section>
      <span id="cat-label" class="field-label">Categoría</span>
      <div class="flex flex-wrap gap-2" role="radiogroup" aria-labelledby="cat-label">
        <button
          v-for="c in CATEGORIES"
          :key="c.id"
          type="button"
          role="radio"
          class="chip"
          :aria-checked="cat === c.id"
          @click="cat = c.id"
        ><span aria-hidden="true">{{ c.emoji }}</span> {{ c.label }}</button>
      </div>
    </section>

    <!-- Qué fue -->
    <section>
      <label for="desc" class="field-label">¿En qué?</label>
      <input id="desc" v-model="description" class="input" maxlength="200" required placeholder="ej.: Cena en Jaffa, taxi al hostel…">
    </section>

    <!-- Quién pagó -->
    <section>
      <div class="mb-1 flex items-center justify-between">
        <span class="field-label mb-0">¿Quién pagó?</span>
        <button type="button" class="btn btn-ghost min-h-10 px-1 text-[14px]" @click="multiPay = !multiPay">
          {{ multiPay ? 'Pagó una sola' : 'Pagaron varias' }}
        </button>
      </div>
      <div v-if="!multiPay" class="flex flex-wrap gap-2" role="radiogroup" aria-label="Quién pagó">
        <button
          v-for="o in payerOptions"
          :key="o.id"
          type="button"
          role="radio"
          class="pick"
          :aria-checked="singlePayer === o.id"
          @click="singlePayer = o.id"
        >
          <MemberAvatar :member="o.member" :size="38" />{{ o.name }}
        </button>
      </div>
      <div v-else class="card space-y-2 p-3">
        <div v-for="o in payerOptions" :key="o.id" class="flex items-center gap-2">
          <MemberAvatar :member="o.member" :size="32" />
          <label :for="`pay-${o.id}`" class="flex-1 font-semibold">{{ o.name }}</label>
          <input :id="`pay-${o.id}`" v-model="multiPayText[o.id]" class="input w-32 text-right tabular" inputmode="decimal" placeholder="0">
        </div>
      </div>
    </section>

    <!-- Cómo se divide -->
    <section>
      <span class="field-label">¿Cómo se divide?</span>
      <div class="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Forma de dividir">
        <button
          v-for="(label, m) in SPLIT_LABELS"
          :key="m"
          type="button"
          role="radio"
          class="chip shrink-0"
          :aria-checked="mode === m"
          @click="mode = m as SplitMode"
        >{{ label }}</button>
      </div>

      <div v-if="mode === 'equal'">
        <MemberPicker v-model="included" :members="members" multiple label="Entre quiénes (tocá para excluir)" />
        <p v-if="amount && included.length" class="mt-2 text-[14px] text-ink-soft tabular">
          {{ formatMoney(Math.floor(amount / included.length), currency) }} c/u aprox.
        </p>
      </div>

      <div v-else-if="mode === 'personal'">
        <MemberPicker
          :model-value="[personalOf]"
          :members="members"
          label="¿De quién es? (no se divide: es para el control de cada una)"
          @update:model-value="v => (personalOf = v[0] ?? '')"
        />
      </div>

      <div v-else class="card space-y-2 p-3">
        <div v-for="m in members" :key="m.id" class="flex items-center gap-2">
          <MemberAvatar :member="m" :size="32" />
          <label :for="`split-${m.id}`" class="flex-1 font-semibold">{{ m.name }}</label>
          <span v-if="mode !== 'exact' && previewShare(m.id)" class="text-[13px] text-ink-soft tabular">{{ formatMoney(previewShare(m.id)!, currency) }}</span>
          <div class="flex items-center gap-1">
            <input
              :id="`split-${m.id}`"
              v-model="valuesText[m.id]"
              class="input w-24 text-right tabular"
              inputmode="decimal"
              :placeholder="mode === 'shares' ? '0' : '0'"
            >
            <span class="w-10 text-[14px] text-ink-soft">{{ mode === 'percent' ? '%' : mode === 'shares' ? 'partes' : '' }}</span>
          </div>
        </div>
        <p v-if="splitHint" class="pt-1 text-[14px] text-ink-soft tabular">{{ splitHint }}</p>
      </div>
    </section>

    <!-- Más opciones -->
    <section>
      <button type="button" class="min-h-11 px-1 text-[14px] font-semibold text-primary-dark" :aria-expanded="showMore" @click="showMore = !showMore">
        {{ showMore ? 'Menos opciones' : 'Fecha, nota y foto del ticket' }}
      </button>
      <div v-if="showMore" class="mt-2 space-y-3">
        <div>
          <label for="date" class="field-label">Fecha</label>
          <input id="date" v-model="date" type="date" class="input" :min="data.trip?.start_date ? undefined : undefined">
          <p class="mt-1 text-[13px] text-ink-soft">
            {{ chapter ? `Capítulo ${chapter.name}` : 'Fuera del viaje' }}<template v-if="place"> · {{ place.name }}</template>
          </p>
        </div>
        <div>
          <label for="note" class="field-label">Nota</label>
          <textarea id="note" v-model="note" class="input" rows="2" maxlength="500" />
        </div>
        <div>
          <span class="field-label">Foto del ticket</span>
          <div class="flex items-center gap-2">
            <label class="btn btn-secondary cursor-pointer">
              📷 {{ receiptPath ? 'Cambiar foto' : 'Sacar / elegir foto' }}
              <input type="file" accept="image/*" class="sr-only" @change="onReceipt">
            </label>
            <FileThumb v-if="receiptPath" :path="receiptPath" />
          </div>
        </div>
      </div>
    </section>

    <!-- Error + guardar -->
    <p v-if="error" class="rounded-xl border-2 border-bad bg-bad-soft p-3 text-[15px] font-semibold text-bad" role="alert">{{ error }}</p>

    <div class="sticky bottom-[calc(env(safe-area-inset-bottom)+76px)] z-10 -mx-4 bg-gradient-to-t from-paper via-paper to-transparent px-4 pb-2 pt-4">
      <button type="submit" class="btn btn-primary btn-block btn-big" :disabled="!canSave">
        {{ saving ? 'Guardando…' : amount && missing.length ? `Falta: ${missing.join(' y ')}` : e ? 'Guardar cambios' : amount ? `Guardar ${formatMoney(amount, currency)}` : 'Guardar' }}
      </button>
    </div>

    <div v-if="e" class="border-t border-dashed border-line pt-2">
      <p v-if="memberById.get(e.created_by ?? '')" class="px-1 pt-1 text-[13px] text-ink-soft">
        Lo cargó {{ memberById.get(e.created_by ?? '')?.name }}
        <template v-if="e.updated_by && e.version && e.version > 1"> · última edición: {{ memberById.get(e.updated_by)?.name ?? '—' }}</template>
      </p>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <ActivityHistory entity="expenses" :entity-id="e.id" />
        <button type="button" class="min-h-11 px-1 text-[14px] font-semibold text-bad" @click="remove">Borrar gasto</button>
      </div>
    </div>
  </form>
</template>
