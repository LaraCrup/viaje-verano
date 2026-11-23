<script setup lang="ts">
// "Tu balance": una línea por moneda, sin convertir ("Te deben 42,50 EUR" · "Debés 120,00 ILS").
import { formatMoney } from '#shared/money/currency'

const props = defineProps<{ memberId: string }>()
const { balancesOf } = useLedger()
const list = computed(() => balancesOf(props.memberId))
</script>

<template>
  <div>
    <p v-if="!list.length" class="text-[16px] font-bold">Estás al día ✨</p>
    <p
      v-for="b in list"
      :key="b.currency"
      class="text-[16px] font-bold tabular"
      :class="b.value > 0 ? 'text-ok' : 'text-bad'"
    >
      {{ b.value > 0 ? 'Te deben' : 'Debés' }} {{ formatMoney(Math.abs(b.value), b.currency) }}
    </p>
  </div>
</template>
