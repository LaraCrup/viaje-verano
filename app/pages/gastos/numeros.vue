<script setup lang="ts">
// Estadísticas simples + exportar a CSV.
import { category } from '#shared/money/categories'
import { formatMoney, formatPlain } from '#shared/money/currency'
import { toCsv } from '#shared/money/csv'
import { ranked } from '#shared/money/stats'
import { SPLIT_LABELS } from '#shared/money/split'

const { data, base, partyName, placeById, chapterById, memberById } = useTripData()
const { stats } = useLedger()

function bars(map: Record<string, number>) {
  const list = ranked(map)
  const max = Math.max(1, ...list.map(([, v]) => v))
  return list.map(([k, v]) => ({ k, v, pct: Math.round((v / max) * 100) }))
}

const byCategory = computed(() => bars(stats.value.byCategory))
const byMember = computed(() => bars(stats.value.byMember))
const byChapter = computed(() => bars(stats.value.byChapter))
const byPlace = computed(() => bars(stats.value.byPlace))

function exportCsv() {
  const header = ['Fecha', 'Descripción', 'Categoría', 'Moneda', 'Monto', 'Tipo de cambio', `Monto en ${base.value}`, 'Pagó', 'División', ...data.members.map(m => `Parte ${m.name}`), 'Ciudad', 'Capítulo', 'Nota']
  const rows = [...data.expenses]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map(e => [
      e.date,
      e.description,
      category(e.category).label,
      e.currency,
      formatPlain(e.amount_minor, e.currency),
      e.fx_rate.replace('.', ','),
      formatPlain(e.base_amount_minor, base.value),
      Object.entries(e.payers).map(([k, v]) => `${partyName(k)} ${formatPlain(v, e.currency)}`).join(' + '),
      SPLIT_LABELS[e.split_mode],
      ...data.members.map(m => (e.shares[m.id] ? formatPlain(e.shares[m.id]!, e.currency) : '')),
      e.place_id ? placeById.value.get(e.place_id)?.name ?? '' : '',
      e.chapter_id ? chapterById.value.get(e.chapter_id)?.name ?? '' : '',
      e.note ?? '',
    ])
  const pays = data.settlements.map(s => [s.date, `Pago: ${partyName(s.from_id)} → ${partyName(s.to_id)}`, 'Pago', s.currency, formatPlain(s.amount_minor, s.currency), s.fx_rate.replace('.', ','), formatPlain(s.base_amount_minor, base.value), partyName(s.from_id), '', ...data.members.map(() => ''), '', '', s.note ?? ''])
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

    <section class="card tape mb-4 text-center">
      <p class="text-[14px] font-bold text-ink-soft">Total del viaje (sin gastos personales)</p>
      <p class="text-[20px] font-extrabold tabular">{{ formatMoney(stats.groupTotal, base) }}</p>
      <p class="text-[14px] text-ink-soft">{{ data.expenses.length }} gastos · todo convertido a {{ base }}</p>
    </section>

    <section v-for="block in [
      { title: 'Por categoría', items: byCategory, label: (k: string) => `${category(k).emoji} ${category(k).label}` },
      { title: 'Lo que consumió cada una', items: byMember, label: (k: string) => memberById.get(k)?.name ?? k },
      { title: 'Por capítulo', items: byChapter, label: (k: string) => chapterById.get(k)?.name ?? 'Sin capítulo' },
      { title: 'Por ciudad', items: byPlace, label: (k: string) => placeById.get(k)?.name ?? 'Sin ciudad' },
    ]" :key="block.title" class="mb-5">
      <h2 class="section-title">{{ block.title }}</h2>
      <EmptyState v-if="!block.items.length" text="Sin datos todavía." />
      <ul v-else class="card space-y-2.5">
        <li v-for="it in block.items" :key="it.k">
          <div class="flex justify-between gap-2 text-[15px]">
            <span class="font-bold">{{ block.label(it.k) }}</span>
            <span class="font-extrabold tabular">{{ formatMoney(it.v, base) }}</span>
          </div>
          <div class="mt-1 h-2.5 rounded-full bg-paper-2" aria-hidden="true">
            <div class="h-2.5 rounded-full bg-primary" :style="{ width: `${it.pct}%` }" />
          </div>
        </li>
      </ul>
    </section>

    <button type="button" class="btn btn-secondary btn-block" @click="exportCsv">
      <NavIcon name="download" :size="20" /> Exportar a CSV (Excel / Sheets)
    </button>
  </div>
</template>
