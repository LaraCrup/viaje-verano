<script setup lang="ts">
import { formatMoney } from '#shared/money/currency'
import type { Transfer } from '#shared/money/simplify'

const { data, me, base, memberById, potById, partyName } = useTripData()
const { inBase, byCurrency, transfersBase, transfersByCurrency, allSettled } = useLedger()

const view = ref<'base' | 'currency'>('base')
const hasExpenses = computed(() => data.expenses.length > 0)

const rows = computed(() => {
  const parties = [...data.members.map(m => m.id), ...data.pots.map(p => p.id)]
  const values = parties.map(id => ({ id, value: inBase.value[id] ?? 0 }))
  const max = Math.max(1, ...values.map(v => Math.abs(v.value)))
  return values.map(v => ({ ...v, pct: Math.round((Math.abs(v.value) / max) * 100) }))
})

// Confeti cuando todo queda saldado (una vez por celular).
watch(allSettled, (now, before) => {
  if (now && before === false && hasExpenses.value) celebrate()
})

function payLink(t: Transfer, currency: string) {
  // Una caja se salda en su propia moneda: no se prellena un monto convertido.
  const pot = potById.value.get(t.from) ?? potById.value.get(t.to)
  if (pot && pot.currency !== currency) return `/gastos/pago?from=${t.from}&to=${t.to}&currency=${pot.currency}`
  return `/gastos/pago?from=${t.from}&to=${t.to}&amount=${t.amount}&currency=${currency}`
}
</script>

<template>
  <div>
    <PageHeader title="Balances" sticker="star" />
    <GastosTabs />

    <div v-if="allSettled && hasExpenses" class="card tape mb-4 text-center">
      <Sticker name="confetti" :size="56" animate />
      <p class="mt-2 text-[17px] font-extrabold">¡Están todas saldadas!</p>
      <button type="button" class="btn btn-ghost mt-1" @click="celebrate">Otra vez 🎉</button>
    </div>

    <div class="mb-4 flex gap-2" role="radiogroup" aria-label="Ver balances">
      <button type="button" role="radio" class="chip" :aria-checked="view === 'base'" @click="view = 'base'">Todo en {{ base }}</button>
      <button type="button" role="radio" class="chip" :aria-checked="view === 'currency'" @click="view = 'currency'">Por moneda</button>
    </div>

    <!-- En moneda base -->
    <template v-if="view === 'base'">
      <ul class="card space-y-3">
        <li v-for="r in rows" :key="r.id" class="flex items-center gap-3">
          <MemberAvatar :member="memberById.get(r.id)" :pot="potById.get(r.id)" :size="36" :ring="r.id === me?.id" />
          <div class="min-w-0 flex-1">
            <div class="flex items-baseline justify-between gap-2">
              <span class="font-extrabold">{{ partyName(r.id) }}<span v-if="r.id === me?.id" class="font-normal text-ink-soft"> (vos)</span></span>
              <span class="font-extrabold tabular" :class="r.value > 0 ? 'text-ok' : r.value < 0 ? 'text-bad' : 'text-ink-soft'">
                {{ r.value === 0 ? 'al día' : formatMoney(r.value, base, { signed: true }) }}
              </span>
            </div>
            <div class="mt-1 h-2 rounded-full bg-paper-2" aria-hidden="true">
              <div class="h-2 rounded-full" :class="r.value >= 0 ? 'bg-ok' : 'bg-bad'" :style="{ width: `${r.pct}%` }" />
            </div>
            <p class="mt-0.5 text-[13px] text-ink-soft">
              {{ potById.get(r.id) ? (r.value < 0 ? `Quedan ${formatMoney(-r.value, base)} en la caja` : 'Caja vacía') : r.value > 0 ? 'Le deben' : r.value < 0 ? 'Debe' : '' }}
            </p>
          </div>
        </li>
      </ul>

      <h2 class="section-title">✂️ Simplificar deudas</h2>
      <p class="mb-2 text-[14px] text-ink-soft">El mínimo de transferencias para quedar todas a mano (en {{ base }}).</p>
      <EmptyState v-if="!transfersBase.length" text="No hace falta ninguna transferencia." sticker="heart" />
      <ul v-else class="space-y-2">
        <li v-for="(t, i) in transfersBase" :key="i" class="card flex items-center gap-3 p-3">
          <MemberAvatar :member="memberById.get(t.from)" :pot="potById.get(t.from)" :size="32" />
          <p class="flex-1 text-[15px]">
            <strong>{{ partyName(t.from) }}</strong> → <strong>{{ partyName(t.to) }}</strong><br>
            <span class="font-extrabold tabular">{{ formatMoney(t.amount, base) }}</span>
          </p>
          <NuxtLink :to="payLink(t, base)" class="btn btn-secondary min-h-11 px-3 text-[14px]">Ya pagó</NuxtLink>
        </li>
      </ul>
    </template>

    <!-- Por moneda -->
    <template v-else>
      <p class="mb-3 text-[14px] text-ink-soft">Sin convertir: cada moneda se salda en esa moneda.</p>
      <EmptyState v-if="!Object.keys(byCurrency).length" text="Todavía no hay gastos." />
      <section v-for="(balances, cur) in byCurrency" :key="cur" class="mb-5">
        <h2 class="section-title">{{ cur }}</h2>
        <ul class="card space-y-2">
          <li v-for="(v, id) in balances" :key="id" class="flex items-center justify-between gap-2">
            <span class="flex items-center gap-2 font-bold">
              <MemberAvatar :member="memberById.get(String(id))" :pot="potById.get(String(id))" :size="28" /> {{ partyName(String(id)) }}
            </span>
            <span class="font-extrabold tabular" :class="v > 0 ? 'text-ok' : v < 0 ? 'text-bad' : 'text-ink-soft'">{{ v === 0 ? 'al día' : formatMoney(v, String(cur), { signed: true }) }}</span>
          </li>
        </ul>
        <ul v-if="transfersByCurrency[cur]?.length" class="mt-2 space-y-2">
          <li v-for="(t, i) in transfersByCurrency[cur]" :key="i" class="flex items-center gap-3 rounded-xl border-2 border-dashed border-line px-3 py-2">
            <p class="flex-1 text-[15px]"><strong>{{ partyName(t.from) }}</strong> → <strong>{{ partyName(t.to) }}</strong> · <span class="font-extrabold tabular">{{ formatMoney(t.amount, String(cur)) }}</span></p>
            <NuxtLink :to="payLink(t, String(cur))" class="btn btn-secondary min-h-11 px-3 text-[14px]">Ya pagó</NuxtLink>
          </li>
        </ul>
      </section>
    </template>

    <NuxtLink to="/gastos/pago" class="btn btn-secondary btn-block mt-4">Saldar otra deuda</NuxtLink>
  </div>
</template>
