<script setup lang="ts">
import { category, CATEGORIES } from '#shared/money/categories'
import { formatMoney } from '#shared/money/currency'
import { formatDayLong } from '#shared/time/tz'

const { data, me, placeById, partyName } = useTripData()
const scope = useScope()
const { currencies, statsByCurrency } = useLedger()

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

const places = computed(() => [...new Set(scope.expenses.value.map(e => e.place_id).filter(Boolean) as string[])].map(id => placeById.value.get(id)).filter(Boolean))

type Item =
  | { kind: 'expense'; id: string; date: string; e: (typeof data.expenses)[number] }
  | { kind: 'settlement'; id: string; date: string; s: (typeof data.settlements)[number] }

const items = computed<Item[]>(() => {
  const exps = scope.expenses.value.filter(e => {
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

/** Total del grupo de cada moneda, sin convertir ("1.200,00 EUR · 3.400,00 ILS"). */
const groupTotals = computed(() =>
  currencies.value
    .map(c => ({ c, v: statsByCurrency.value[c]?.groupTotal ?? 0 }))
    .filter(x => x.v > 0)
    .map(x => formatMoney(x.v, x.c))
    .join(' · '),
)

/** ¿Participa la integrante de este celular? (pagó algo o le toca una parte) */
function mine(e: { payers: Record<string, number>; shares: Record<string, number> }) {
  return !me.value || me.value.id in e.payers || (e.shares[me.value.id] ?? 0) > 0
}

function payersLabel(p: Record<string, number>) {
  const ids = Object.keys(p)
  return ids.length === 1 ? `Pagó ${partyName(ids[0]!)}` : `Pagaron ${ids.map(partyName).join(', ')}`
}
</script>

<template>
  <div>
    <PageHeader title="Gastos" sticker="heart" />
    <GastosTabs />

    <!-- Lo tuyo primero; el total del grupo es contexto -->
    <NuxtLink to="/gastos/balances" class="card mb-4 flex items-center justify-between gap-3">
      <div class="min-w-0">
        <p class="text-[12px] text-ink-soft">Tu balance</p>
        <MyBalances v-if="me" :member-id="me.id" />
        <p v-if="groupTotals" class="mt-0.5 text-[13px] text-ink-soft tabular">Total del grupo: {{ groupTotals }}</p>
      </div>
      <NavIcon name="chevron" :size="18" class="shrink-0 text-ink-soft" />
    </NuxtLink>

    <div class="mb-1 flex items-center justify-between gap-2">
      <button type="button" class="chip min-h-10 px-3" :class="activeFilters ? 'is-on' : ''" @click="filtersOpen = true">
        <NavIcon name="filter" :size="16" /> Filtrar<template v-if="activeFilters"> ({{ activeFilters }})</template>
      </button>
      <button v-if="activeFilters" type="button" class="min-h-11 px-1 text-[14px] font-semibold text-ink-soft underline underline-offset-4" @click="clearFilters">Quitar filtros</button>
      <NuxtLink to="/gastos/pago" class="flex min-h-11 items-center px-1 text-[14px] font-semibold text-primary-dark">Saldar una deuda</NuxtLink>
    </div>

    <EmptyState v-if="!items.length" :text="activeFilters ? 'No hay gastos con esos filtros.' : 'Todavía no hay gastos. ¡Cargá el primero!'" sticker="star" />

    <div v-for="g in grouped" :key="g.date" class="mt-5">
      <h2 class="eyebrow mb-2 px-1 font-sans first-letter:uppercase">{{ formatDayLong(g.date) }}</h2>
      <ul class="card divide-y divide-line/70 px-3 py-0">
        <li v-for="it in g.items" :key="it.id">
          <!-- Los gastos donde no participás (ni pagaste ni te toca parte) quedan en segundo plano -->
          <NuxtLink
            v-if="it.kind === 'expense'"
            :to="`/gastos/${it.id}`"
            class="flex items-center gap-3"
            :class="mine(it.e) ? 'py-2.5' : 'py-2 opacity-55'"
          >
            <span
              class="grid shrink-0 place-items-center rounded-full bg-paper-2"
              :class="mine(it.e) ? 'h-10 w-10 text-[20px]' : 'h-8 w-8 text-[16px] grayscale'"
              aria-hidden="true"
            >{{ category(it.e.category).emoji }}</span>
            <div class="min-w-0 flex-1">
              <p class="truncate" :class="mine(it.e) ? 'text-[15px] font-semibold' : 'text-[14px]'">{{ it.e.description }}</p>
              <p class="truncate text-[13px] text-ink-soft">
                {{ payersLabel(it.e.payers) }}
                <template v-if="it.e.split_mode === 'personal'"> · personal</template>
                <template v-if="it.e.receipt_path"> · 🧾</template>
              </p>
            </div>
            <div class="shrink-0 text-right">
              <p class="tabular" :class="mine(it.e) ? 'text-[15px] font-bold' : 'text-[14px] font-semibold'">{{ formatMoney(it.e.amount_minor, it.e.currency) }}</p>
              <p v-if="me && it.e.shares[me.id]" class="text-[13px] text-ink-soft tabular">vos {{ formatMoney(it.e.shares[me.id]!, it.e.currency) }}</p>
              <p v-else-if="!mine(it.e)" class="text-[12px] text-ink-soft">no participás</p>
            </div>
          </NuxtLink>
          <NuxtLink v-else :to="`/gastos/pago?id=${it.id}`" class="flex min-h-12 items-center gap-3 py-2 text-ink-soft">
            <span aria-hidden="true" class="grid w-10 shrink-0 place-items-center text-[18px]">💸</span>
            <p class="min-w-0 flex-1 text-[14px]">
              {{ partyName(it.s.from_id) }} le pagó a {{ partyName(it.s.to_id) }}
            </p>
            <p class="shrink-0 text-[14px] font-semibold tabular">{{ formatMoney(it.s.amount_minor, it.s.currency) }}</p>
          </NuxtLink>
        </li>
      </ul>
    </div>

    <div class="h-16" aria-hidden="true" />
    <NuxtLink
      to="/gastos/nuevo"
      class="btn btn-primary fixed bottom-[calc(env(safe-area-inset-bottom)+84px)] right-4 z-20 px-5"
    >
      <NavIcon name="plus" :size="20" /> Gasto
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
