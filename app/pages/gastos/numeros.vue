<script setup lang="ts">
// Estadísticas simples por moneda (sin convertir) + exportar a CSV.
import { category } from '#shared/money/categories'
import { formatMoney, formatPlain } from '#shared/money/currency'
import { toCsv } from '#shared/money/csv'
import { ranked } from '#shared/money/stats'
import { SPLIT_LABELS } from '#shared/money/split'

const { data, partyName, placeById, chapterById, memberById } = useTripData()
const { currencies, statsByCurrency } = useLedger()
const scope = useScope()

// Moneda que se está mirando: arranca en la más usada.
const picked = ref('')
const cur = computed(() => (currencies.value.includes(picked.value) ? picked.value : currencies.value[0] ?? ''))
const empty = { groupTotal: 0, byMember: {}, byMemberWithPersonal: {}, byCategory: {}, byPlace: {}, byChapter: {}, timesPaid: {} }
const stats = computed(() => statsByCurrency.value[cur.value] ?? empty)
const count = computed(() => scope.expenses.value.filter(e => e.currency === cur.value).length)

function bars(map: Record<string, number>) {
  const list = ranked(map)
  const max = Math.max(1, ...list.map(([, v]) => v))
  return list.map(([k, v]) => ({ k, v, pct: Math.round((v / max) * 100) }))
}

const byCategory = computed(() => bars(stats.value.byCategory))
const byMember = computed(() => bars(stats.value.byMember))

function exportCsv() {
  const header = ['Fecha', 'Descripción', 'Categoría', 'Moneda', 'Monto', 'Pagó', 'División', ...data.members.map(m => `Parte ${m.name}`), 'Ciudad', 'Capítulo', 'Nota']
  const rows = [...scope.expenses.value]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map(e => [
      e.date,
      e.description,
      category(e.category).label,
      e.currency,
      formatPlain(e.amount_minor, e.currency),
      Object.entries(e.payers).map(([k, v]) => `${partyName(k)} ${formatPlain(v, e.currency)}`).join(' + '),
      SPLIT_LABELS[e.split_mode],
      ...data.members.map(m => (e.shares[m.id] ? formatPlain(e.shares[m.id]!, e.currency) : '')),
      e.place_id ? placeById.value.get(e.place_id)?.name ?? '' : '',
      e.chapter_id ? chapterById.value.get(e.chapter_id)?.name ?? '' : '',
      e.note ?? '',
    ])
  const pays = data.settlements.map(s => [s.date, `Pago: ${partyName(s.from_id)} → ${partyName(s.to_id)}`, 'Pago', s.currency, formatPlain(s.amount_minor, s.currency), partyName(s.from_id), '', ...data.members.map(() => ''), '', '', s.note ?? ''])
  const blob = new Blob([toCsv([header, ...rows, ...pays])], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `gastos-viaje-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
</script>

<template>
  <div>
    <PageHeader title="Números" sticker="sun" />
    <GastosTabs />

    <!-- Cada moneda por separado: no se convierte nada -->
    <div v-if="currencies.length > 1" class="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Moneda">
      <button v-for="c in currencies" :key="c" type="button" role="radio" class="chip shrink-0" :aria-checked="cur === c" @click="picked = c">{{ c }}</button>
    </div>

    <EmptyState v-if="!cur" text="Todavía no hay gastos." />
    <template v-else>
    <section class="card tape mb-4 text-center">
      <p class="text-[13px] text-ink-soft">Total del viaje en {{ cur }} (sin gastos personales)</p>
      <p class="text-[20px] font-bold tabular">{{ formatMoney(stats.groupTotal, cur) }}</p>
      <p class="text-[13px] text-ink-soft">{{ count }} gasto{{ count === 1 ? '' : 's' }} en {{ cur }}</p>
    </section>

    <section v-for="block in [
      { title: 'Por categoría', items: byCategory, label: (k: string) => `${category(k).emoji} ${category(k).label}` },
      { title: 'Lo que consumió cada una', items: byMember, label: (k: string) => memberById.get(k)?.name ?? k },
    ]" :key="block.title">
      <h2 class="section-title">{{ block.title }}</h2>
      <EmptyState v-if="!block.items.length" text="Sin datos todavía." />
      <ul v-else class="card space-y-3">
        <li v-for="it in block.items" :key="it.k">
          <div class="flex justify-between gap-2 text-[14px]">
            <span>{{ block.label(it.k) }}</span>
            <span class="font-semibold tabular">{{ formatMoney(it.v, cur) }}</span>
          </div>
          <div class="mt-1 h-1.5 rounded-full bg-paper-2" aria-hidden="true">
            <div class="h-1.5 rounded-full bg-primary" :style="{ width: `${it.pct}%` }" />
          </div>
        </li>
      </ul>
    </section>
    </template>

    <button type="button" class="btn btn-secondary btn-block mt-8" @click="exportCsv">
      <NavIcon name="download" :size="18" /> Exportar a CSV (Excel / Sheets)
    </button>
  </div>
</template>
