<script setup lang="ts">
import type { Expense } from '#shared/types/domain'

const route = useRoute()
const router = useRouter()
const { data } = useTripData()
const { show } = useToast()
const stuck = ref(false)

// Desde un alojamiento: "Cargar el pago del alojamiento"
const stay = computed(() => (typeof route.query.stay === 'string' ? data.stays.find(s => s.id === route.query.stay) ?? null : null))
const preset = computed(() => (stay.value ? { description: stay.value.name, category: 'alojamiento', date: stay.value.check_in_date } : undefined))

async function onSaved(e: Expense) {
  stuck.value = true
  if (stay.value) await saveRow('stays', { ...stay.value, expense_id: e.id })
  show('Gasto guardado ✓', 'ok')
  setTimeout(() => router.replace(stay.value ? `/alojamientos/${stay.value.id}` : '/gastos'), 450)
}
</script>

<template>
  <div>
    <PageHeader title="Nuevo gasto" back>
      <template #right>
        <Sticker v-if="stuck" name="star" :size="40" animate />
      </template>
    </PageHeader>
    <ExpenseForm v-if="data.loaded && data.members.length" :preset="preset" @saved="onSaved" />
    <EmptyState v-else-if="data.loaded" text="Este celular todavía no bajó el viaje. Conectate un momento y vas a poder cargar gastos (después funciona sin señal)." sticker="plane" />
  </div>
</template>
