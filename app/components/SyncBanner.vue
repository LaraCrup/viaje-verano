<script setup lang="ts">
// Aviso discreto de estado: sin señal / cambios esperando para mandarse.
const { state } = useSync()
const { simulated } = useNow()
</script>

<template>
  <div v-if="simulated" class="bg-violet-soft px-4 py-1.5 text-center text-[13px] font-bold">
    Simulando el {{ simulated }} ·
    <NuxtLink to="/?fecha=hoy" class="underline">volver a hoy</NuxtLink>
  </div>
  <div
    v-if="!state.online || state.pending > 0"
    class="flex items-center justify-center gap-2 bg-warn-soft px-4 py-1.5 text-[13px] font-bold text-warn"
    role="status"
  >
    <NavIcon v-if="!state.online" name="cloud-off" :size="16" />
    <span v-if="!state.online">Sin señal: podés seguir usando todo{{ state.pending ? ` · ${state.pending} cambio${state.pending > 1 ? 's' : ''} para mandar` : '' }}</span>
    <span v-else>Mandando {{ state.pending }} cambio{{ state.pending > 1 ? 's' : '' }}…</span>
  </div>
</template>
