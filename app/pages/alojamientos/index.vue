<script setup lang="ts">
const { data } = useTripData()
</script>

<template>
  <div>
    <PageHeader title="Alojamientos" back="/itinerario" sticker="heart" />
    <div class="space-y-3">
      <StayCard v-for="s in data.stays" :key="s.id" :s="s" />
    </div>
    <NuxtLink to="/alojamientos/nuevo" class="btn btn-primary btn-block mt-4"><NavIcon name="plus" /> Agregar alojamiento</NuxtLink>
  </div>
</template>
