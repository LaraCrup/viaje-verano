<script setup lang="ts">
const { data } = useTripData()
const { now } = useNow()
const upcoming = computed(() => data.transports.filter(t => !t.depart_at || new Date(t.arrive_at ?? t.depart_at) >= now.value))
const past = computed(() => data.transports.filter(t => t.depart_at && new Date(t.arrive_at ?? t.depart_at) < now.value))
</script>

<template>
  <div>
    <PageHeader title="Traslados" back="/itinerario" sticker="plane" />
    <div class="space-y-3">
      <TransportCard v-for="t in upcoming" :key="t.id" :t="t" />
    </div>
    <NuxtLink to="/traslados/nuevo" class="btn btn-primary btn-block mt-4"><NavIcon name="plus" /> Agregar traslado</NuxtLink>
    <template v-if="past.length">
      <h2 class="section-title">Ya hechos</h2>
      <div class="space-y-3 opacity-75">
        <TransportCard v-for="t in past" :key="t.id" :t="t" compact />
      </div>
    </template>
  </div>
</template>
