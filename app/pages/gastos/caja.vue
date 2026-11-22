<script setup lang="ts">
// Caja común: cada una pone plata, se pagan gastos desde la caja y se ve cuánto queda.
import { DEFAULT_CURRENCIES, formatMoney, parseAmount } from '#shared/money/currency'
import { convertMinor } from '#shared/money/fx'

const { data, me, memberById, chapterForDate } = useTripData()
const { pots } = useLedger()
const { today } = useNow()
const { show } = useToast()

const creating = ref(false)
const newName = ref('Caja común')
const newCurrency = ref(chapterForDate(today.value)?.currency ?? 'EUR')
const newHolder = ref<string[]>(me.value ? [me.value.id] : [])

async function createPot() {
  await saveRow('pots', { name: newName.value.trim() || 'Caja común', currency: newCurrency.value, holder_member_id: newHolder.value[0] ?? null })
  creating.value = false
  show('Caja creada 🫙', 'ok')
}

// Aportes rápidos: cada una pone X en la caja
const contribOpen = ref(false)
const contribPot = ref<string>('')
const contribWho = ref<string[]>([])
const contribText = ref('')
function openContrib(potId: string) {
  contribPot.value = potId
  contribWho.value = data.members.map(m => m.id)
  contribText.value = ''
  contribOpen.value = true
}
async function saveContrib() {
  const pot = data.pots.find(p => p.id === contribPot.value)
  if (!pot) return
  const amount = parseAmount(contribText.value, pot.currency)
  if (!amount || amount <= 0) return show('Poné cuánto pone cada una', 'warn')
  const q = await quoteRate(pot.currency, data.trip?.base_currency ?? 'USD')
  if (!q.rate) return show(`Falta el tipo de cambio de ${pot.currency}. Cargá un gasto en esa moneda primero para fijarlo.`, 'warn')
  for (const m of contribWho.value) {
    await saveRow('settlements', {
      from_id: m,
      to_id: pot.id,
      currency: pot.currency,
      amount_minor: amount,
      fx_rate: q.rate,
      base_amount_minor: convertMinor(amount, pot.currency, data.trip?.base_currency ?? 'USD', q.rate),
      date: today.value,
      note: 'Aporte a la caja',
    })
  }
  contribOpen.value = false
  show(`Listo: ${contribWho.value.length} aporte${contribWho.value.length > 1 ? 's' : ''} de ${formatMoney(amount, pot.currency)}`, 'ok')
}
</script>

<template>
  <div>
    <PageHeader title="Caja común" sticker="lemon" />
    <GastosTabs />

    <p class="mb-4 text-[15px] text-ink-soft">
      Cada una pone plata en un pozo y se pagan cosas desde ahí (súper, taxis…). Para pagar desde la caja,
      al cargar el gasto elegí la caja en “¿Quién pagó?”.
    </p>

    <EmptyState v-if="!data.pots.length" text="Todavía no hay ninguna caja." sticker="lemon">
      <button type="button" class="btn btn-primary mt-2" @click="creating = true">Crear una caja</button>
    </EmptyState>

    <section v-for="s in pots" :key="s.potId" class="card tape mb-5">
      <div class="flex items-start justify-between gap-2">
        <div>
          <h2>{{ data.pots.find(p => p.id === s.potId)?.name }}</h2>
          <p class="text-[14px] text-ink-soft">
            En {{ s.currency }}<template v-if="data.pots.find(p => p.id === s.potId)?.holder_member_id"> · la tiene {{ memberById.get(data.pots.find(p => p.id === s.potId)!.holder_member_id!)?.name }}</template>
          </p>
        </div>
        <span class="text-[28px]" aria-hidden="true">🫙</span>
      </div>
      <p class="mt-3 text-[14px] font-bold text-ink-soft">Queda en la caja</p>
      <p class="text-[20px] font-extrabold tabular" :class="s.remaining < 0 ? 'text-bad' : ''">{{ formatMoney(s.remaining, s.currency) }}</p>
      <p class="text-[14px] text-ink-soft tabular">Entró {{ formatMoney(s.contributed, s.currency) }} · se gastó {{ formatMoney(s.spent, s.currency) }}<template v-if="s.returned"> · se devolvió {{ formatMoney(s.returned, s.currency) }}</template></p>

      <table class="mt-4 w-full text-[15px]">
        <caption class="sr-only">Aportes y consumo por persona</caption>
        <thead>
          <tr class="text-left text-[13px] text-ink-soft">
            <th scope="col" class="pb-1 font-bold">Quién</th>
            <th scope="col" class="pb-1 text-right font-bold">Puso</th>
            <th scope="col" class="pb-1 text-right font-bold">Consumió</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in data.members" :key="m.id" class="border-t border-dashed border-line">
            <th scope="row" class="py-1.5 text-left font-bold">{{ m.name }}</th>
            <td class="text-right tabular">{{ formatMoney(s.contributedBy[m.id] ?? 0, s.currency) }}</td>
            <td class="text-right tabular">{{ formatMoney(s.consumedBy[m.id] ?? 0, s.currency) }}</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-4 flex flex-wrap gap-2">
        <button type="button" class="btn btn-primary flex-1" @click="openContrib(s.potId)">+ Aportes</button>
        <NuxtLink to="/gastos/nuevo" class="btn btn-secondary flex-1">Gasto desde la caja</NuxtLink>
      </div>
      <p class="mt-3 text-[13px] text-ink-soft">Al final, “Simplificar deudas” en Balances te dice cuánto le devuelve la caja a cada una.</p>
    </section>

    <button v-if="data.pots.length" type="button" class="btn btn-secondary btn-block" @click="creating = true">Crear otra caja</button>

    <BottomSheet v-model:open="creating" title="Nueva caja">
      <form class="space-y-4" @submit.prevent="createPot">
        <div>
          <label for="pot-name" class="field-label">Nombre</label>
          <input id="pot-name" v-model="newName" class="input" maxlength="40">
        </div>
        <div>
          <span class="field-label">Moneda</span>
          <div class="flex flex-wrap gap-2">
            <button v-for="c in DEFAULT_CURRENCIES" :key="c" type="button" class="chip" :aria-pressed="newCurrency === c" @click="newCurrency = c">{{ c }}</button>
          </div>
        </div>
        <MemberPicker v-model="newHolder" :members="data.members" label="¿Quién tiene la plata?" />
        <button type="submit" class="btn btn-primary btn-block">Crear caja</button>
      </form>
    </BottomSheet>

    <BottomSheet v-model:open="contribOpen" title="Aportes a la caja">
      <form class="space-y-4" @submit.prevent="saveContrib">
        <div>
          <label for="contrib" class="field-label">¿Cuánto pone cada una? ({{ data.pots.find(p => p.id === contribPot)?.currency }})</label>
          <input id="contrib" v-model="contribText" class="input text-[20px] font-extrabold tabular" inputmode="decimal" placeholder="0,00">
        </div>
        <MemberPicker v-model="contribWho" :members="data.members" multiple label="¿Quiénes ponen?" />
        <button type="submit" class="btn btn-primary btn-block">Guardar aportes</button>
      </form>
    </BottomSheet>
  </div>
</template>
