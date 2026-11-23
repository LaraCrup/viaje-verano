<script setup lang="ts">
// Balances por moneda: cada deuda se salda en la moneda en que se generó (sin convertir).
import { formatMoney } from '#shared/money/currency'
import type { Transfer } from '#shared/money/simplify'

const { data, me, memberById, partyName } = useTripData()
const { byCurrency, transfersByCurrency, allSettled } = useLedger()

const hasExpenses = computed(() => data.expenses.length > 0)

/** Una sección por moneda, solo con quienes no están en cero. */
const sections = computed(() =>
  Object.entries(byCurrency.value)
    .map(([currency, balances]) => {
      const rows = data.members
        .map(m => ({ id: m.id, value: balances[m.id] ?? 0 }))
        .filter(r => r.value !== 0)
        .sort((a, b) => b.value - a.value)
      const max = Math.max(1, ...rows.map(r => Math.abs(r.value)))
      return {
        currency,
        rows: rows.map(r => ({ ...r, pct: Math.round((Math.abs(r.value) / max) * 100) })),
        transfers: transfersByCurrency.value[currency] ?? [],
      }
    })
    // Primero las monedas donde hay algo para saldar
    .sort((a, b) => Number(b.rows.length > 0) - Number(a.rows.length > 0) || a.currency.localeCompare(b.currency)),
)

// Confeti cuando todo queda saldado (una vez por celular).
watch(allSettled, (now, before) => {
  if (now && before === false && hasExpenses.value) celebrate()
})

function payLink(t: Transfer, currency: string) {
  return `/gastos/pago?from=${t.from}&to=${t.to}&amount=${t.amount}&currency=${currency}`
}
</script>

<template>
  <div>
    <PageHeader title="Balances" sticker="star" />
    <GastosTabs />

    <div v-if="allSettled && hasExpenses" class="card tape mb-4 text-center">
      <Sticker name="confetti" :size="56" animate />
      <p class="mt-2 text-[17px] font-bold">¡Están todas saldadas!</p>
      <button type="button" class="btn btn-ghost mt-1" @click="celebrate">Otra vez 🎉</button>
    </div>

    <p class="px-1 text-[13px] text-ink-soft">Cada moneda se salda en esa misma moneda.</p>
    <EmptyState v-if="!sections.length" text="Todavía no hay gastos." />

    <section v-for="s in sections" :key="s.currency">
      <h2 class="section-title">{{ s.currency }}</h2>

      <p v-if="!s.rows.length" class="card text-[14px] text-ink-soft">Todas al día en {{ s.currency }} ✨</p>
      <template v-else>
        <ul class="card divide-y divide-line/70 py-1">
          <li v-for="r in s.rows" :key="r.id" class="flex items-center gap-3 py-2.5">
            <MemberAvatar :member="memberById.get(r.id)" :size="36" :ring="r.id === me?.id" />
            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <span class="text-[15px] font-semibold">{{ partyName(r.id) }}<span v-if="r.id === me?.id" class="font-normal text-ink-soft"> (vos)</span></span>
                <span class="text-[15px] font-bold tabular" :class="r.value > 0 ? 'text-ok' : 'text-bad'">
                  {{ formatMoney(r.value, s.currency, { signed: true }) }}
                </span>
              </div>
              <div class="mt-1 h-1.5 rounded-full bg-paper-2" aria-hidden="true">
                <div class="h-1.5 rounded-full" :class="r.value > 0 ? 'bg-ok' : 'bg-bad'" :style="{ width: `${r.pct}%` }" />
              </div>
              <p class="mt-0.5 text-[12px] text-ink-soft">{{ r.value > 0 ? 'Le deben' : 'Debe' }}</p>
            </div>
          </li>
        </ul>

        <p class="mb-2 mt-4 px-1 text-[13px] font-semibold text-ink-soft">Para quedar a mano en {{ s.currency }}</p>
        <ul class="card divide-y divide-line/70 py-1">
          <li v-for="(t, i) in s.transfers" :key="i" class="flex items-center gap-3 py-2.5">
            <MemberAvatar :member="memberById.get(t.from)" :size="32" />
            <p class="min-w-0 flex-1">
              <span class="block text-[14px]" :class="t.from === me?.id || t.to === me?.id ? 'font-semibold' : 'text-ink-soft'">{{ t.from === me?.id ? 'Vos' : partyName(t.from) }} → {{ t.to === me?.id ? 'vos' : partyName(t.to) }}</span>
              <span class="block text-[15px] font-bold tabular">{{ formatMoney(t.amount, s.currency) }}</span>
            </p>
            <NuxtLink :to="payLink(t, s.currency)" class="flex min-h-11 shrink-0 items-center rounded-full px-3 text-[14px] font-semibold text-primary-dark hover:bg-paper-2">Ya pagó</NuxtLink>
          </li>
        </ul>
      </template>
    </section>

    <NuxtLink to="/gastos/pago" class="btn btn-secondary btn-block mt-8">Saldar otra deuda</NuxtLink>
  </div>
</template>
