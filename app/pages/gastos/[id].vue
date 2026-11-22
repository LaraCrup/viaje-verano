<script setup lang="ts">
const route = useRoute()
const router = useRouter()
const { data } = useTripData()
const { show } = useToast()
const expense = computed(() => data.expenses.find(e => e.id === route.params.id) ?? null)

function onSaved() {
  show('Cambios guardados ✓', 'ok')
  router.replace('/gastos')
}
</script>

<template>
  <div>
    <PageHeader title="Editar gasto" back="/gastos" />
    <ExpenseForm v-if="expense" :key="expense.id" :expense="expense" @saved="onSaved" @deleted="router.replace('/gastos')" />
    <EmptyState v-else-if="data.loaded" text="No encontramos este gasto (quizás lo borraron)." />
  </div>
</template>
