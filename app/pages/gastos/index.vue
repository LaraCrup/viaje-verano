<script setup lang="ts">
import { category, CATEGORIES } from '#shared/money/categories'
import { formatMoney } from '#shared/money/currency'
import { formatDayLong } from '#shared/time/tz'

const { data, me, base, placeById, partyName } = useTripData()
const { inBase, stats } = useLedger()

// Filtros (se recuerdan en este celular)
const filters = reactive({ member: '', category: '', currency: '', place: '' })
const filtersOpen = ref(false)
onMounted(() => {
  try {
    Object.assign(filters, JSON.parse(localStorage.getItem('viaje-filtros-gastos') ?? '{}'))
  } catch {}
})
watch(filters, f => {
  try {
    localStorage.setItem('viaje-filtros-gastos', JSON.stringify(f))
  } catch {}
}, { deep: true })
const activeFilters = computed(() => Object.values(filters).filter(Boolean).length)
function clearFilters() {
  Object.assign(filters, { member: '', category: '', currency: '', place: '' })
}

const currencies = computed(() => [...new Set(data.expenses.map(e => e.currency))])
const places = computed(() => [...new Set(data.expenses.map(e => e.place_id).filter(Boolean) as string[])].map(id => placeById.value.get(id)).filter(Boolean))

type Item =
  | { kind: 'expense'; id: string; date: string; e: (typeof data.expenses)[number] }
  | { kind: 'settlement'; id: string; date: string; s: (typeof data.settlements)[number] }

const items = computed<Item[]>(() => {
  const exps = data.expenses.filter(e => {
    if (filters.member && !(filters.member in e.payers) && !(filters.member in e.shares)) return false
    if (filters.category && e.category !== filters.category) return false
    if (filters.currency && e.currency !== filters.currency) return false
    if (filters.place && e.place_id !== filters.place) return false
    return true
  }).map(e => ({ kind: 'expense' as const, id: e.id, date: e.date, e }))
  const sets = filters.category || filters.place
    ? []
    : data.settlements.filter(s => (!filters.member || s.from_id === filters.member || s.to_id === filters.member) && (!filters.currency || s.currency === filters.currency))
        .map(s => ({ kind: 'settlement' as const, id: s.id, date: s.date, s }))
  return [...exps, ...sets].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
})

const grouped = computed(() => {
  const out: { date: string; items: Item[] }[] = []
  for (const it of items.value) {
    const last = out[out.length - 1]
    if (last && last.date === it.date) last.items.push(it)
    else out.push({ date: it.date, items: [it] })
  }
  return out
})

const myBalance = computed(() => (me.value ? inBase.value[me.value.id] ?? 0 : 0))

function payersLabel(p: Record<string, number>) {
  const ids = Object.keys(p)
  return ids.length === 1 ? `Pagó ${partyName(ids[0]!)}` : `Pagaron ${ids.map(partyName).join(', ')}`
}
</script>

<template>
  <div>
    <PageHeader title="Gastos" sticker="heart" />
    <GastosTabs />

    <section class="mb-4 grid grid-cols-2 gap-3">
      <div class="card p-3">
        <p class="text-[13px] font-bold text-ink-soft">Total del grupo</p>
        <p class="text-[18px] font-extrabold tabular">{{ formatMoney(stats.groupTotal, base) }}</p>
      </div>
      <NuxtLink to="/gastos/balances" class="card block p-3">
        <p class="text-[13px] font-bold text-ink-soft">Tu balance</p>
        <p class="text-[18px] font-extrabold tabular" :class="myBalance > 0 ? 'text-ok' : myBalance < 0 ? 'text-bad' : ''">
          {{ myBalance === 0 ? 'Al día' : formatMoney(myBalance, base, { signed: true }) }}
        </p>
      </NuxtLink>
    </section>

    <div class="mb-3 flex items-center justify-between gap-2">
      <button type="button" class="btn btn-secondary min-h-11 px-3 text-[15px]" @click="filtersOpen = true">
        <NavIcon name="filter" :size="20" /> Filtrar<template v-if="activeFilters"> ({{ activeFilters }})</template>
      </button>
      <button v-if="activeFilters" type="button" class="btn btn-ghost px-2 text-[15px]" @click="clearFilters">Quitar filtros</button>
      <NuxtLink to="/gastos/pago" class="btn btn-ghost px-2 text-[15px]">Saldar una deuda</NuxtLink>
    </div>

    <EmptyState v-if="!items.length" :text="activeFilters ? 'No hay gastos con esos filtros.' : 'Todavía no hay gastos. ¡Cargá el primero!'" sticker="star" />

    <div v-for="g in grouped" :key="g.date" class="mb-4">
      <h2 class="mb-2 font-sans text-[14px] font-extrabold uppercase tracking-wide text-ink-soft">{{ formatDayLong(g.date) }}</h2>
      <ul class="space-y-2">
        <li v-for="it in g.items" :key="it.id">
          <NuxtLink v-if="it.kind === 'expense'" :to="`/gastos/${it.id}`" class="card flex items-center gap-3 p-3">
            <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-paper-2 text-[22px]" aria-hidden="true">{{ category(it.e.category).emoji }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-extrabold">{{ it.e.description }}</p>
              <p class="truncate text-[14px] text-ink-soft">
                {{ payersLabel(it.e.payers) }}
                <template v-if="it.e.split_mode === 'personal'"> · personal</template>
                <template v-if="it.e.receipt_path"> · 🧾</template>
              </p>
            </div>
            <div class="text-right">
              <p class="font-extrabold tabular">{{ formatMoney(it.e.amount_minor, it.e.currency) }}</p>
              <p v-if="me && it.e.shares[me.id]" class="text-[13px] text-ink-soft tabular">vos {{ formatMoney(it.e.shares[me.id]!, it.e.currency) }}</p>
              <p v-else-if="it.e.currency !== base" class="text-[13px] text-ink-soft tabular">≈ {{ formatMoney(it.e.base_amount_minor, base) }}</p>
            </div>
          </NuxtLink>
          <NuxtLink v-else :to="`/gastos/pago?id=${it.id}`" class="flex min-h-12 items-center gap-3 rounded-xl border-2 border-dashed border-line px-3 py-2">
            <span aria-hidden="true" class="text-[20px]">💸</span>
            <p class="flex-1 text-[15px]">
              <strong>{{ partyName(it.s.from_id) }}</strong> le pagó a <strong>{{ partyName(it.s.to_id) }}</strong>
            </p>
            <p class="font-extrabold tabular">{{ formatMoney(it.s.amount_minor, it.s.currency) }}</p>
          </NuxtLink>
        </li>
      </ul>
    </div>

    <NuxtLink
      to="/gastos/nuevo"
      class="btn btn-primary fixed bottom-[calc(env(safe-area-inset-bottom)+84px)] right-4 z-20 min-h-14 px-5 text-[17px]"
    >
      <NavIcon name="plus" /> Gasto
    </NuxtLink>

    <BottomSheet v-model:open="filtersOpen" title="Filtrar gastos">
      <div class="space-y-4">
        <div>
          <span class="field-label">Persona</span>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="chip" :aria-pressed="!filters.member" @click="filters.member = ''">Todas</button>
            <button v-for="m in data.members" :key="m.id" type="button" class="chip" :aria-pressed="filters.member === m.id" @click="filters.member = m.id">{{ m.name }}</button>
          </div>
        </div>
        <div>
          <span class="field-label">Categoría</span>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="chip" :aria-pressed="!filters.category" @click="filters.category = ''">Todas</button>
            <button v-for="c in CATEGORIES" :key="c.id" type="button" class="chip" :aria-pressed="filters.category === c.id" @click="filters.category = c.id">{{ c.emoji }} {{ c.label }}</button>
          </div>
        </div>
        <div v-if="currencies.length > 1">
          <span class="field-label">Moneda</span>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="chip" :aria-pressed="!filters.currency" @click="filters.currency = ''">Todas</button>
            <button v-for="c in currencies" :key="c" type="button" class="chip" :aria-pressed="filters.currency === c" @click="filters.currency = c">{{ c }}</button>
          </div>
        </div>
        <div v-if="places.length">
          <span class="field-label">Ciudad</span>
          <div class="flex flex-wrap gap-2">
            <button type="button" class="chip" :aria-pressed="!filters.place" @click="filters.place = ''">Todas</button>
            <button v-for="p in places" :key="p!.id" type="button" class="chip" :aria-pressed="filters.place === p!.id" @click="filters.place = p!.id">{{ p!.name }}</button>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-block" @click="filtersOpen = false">Ver {{ items.length }} resultado{{ items.length === 1 ? '' : 's' }}</button>
      </div>
    </BottomSheet>
  </div>
</template>
