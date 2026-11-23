<script setup lang="ts">
const route = useRoute()
const tabs = [
  { to: '/gastos', label: 'Gastos' },
  { to: '/gastos/balances', label: 'Balances' },
  { to: '/gastos/numeros', label: 'Números' },
]
</script>

<template>
  <nav class="-mx-4 mb-4 overflow-x-auto px-4" aria-label="Secciones de gastos">
    <ul class="flex gap-2">
      <li v-for="t in tabs" :key="t.to">
        <NuxtLink
          :to="t.to"
          class="chip whitespace-nowrap"
          :class="route.path === t.to ? 'is-on' : ''"
          :aria-current="route.path === t.to ? 'page' : undefined"
        >{{ t.label }}</NuxtLink>
      </li>
    </ul>
  </nav>
</template>
