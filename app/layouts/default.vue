<script setup lang="ts">
const route = useRoute()
const items = [
  { to: '/', label: 'Hoy', icon: 'sun', match: (p: string) => p === '/' },
  { to: '/itinerario', label: 'Itinerario', icon: 'map', match: (p: string) => p.startsWith('/itinerario') || p.startsWith('/traslados') || p.startsWith('/alojamientos') },
  { to: '/gastos', label: 'Gastos', icon: 'wallet', match: (p: string) => p.startsWith('/gastos') },
  { to: '/planes', label: 'Planes', icon: 'star', match: (p: string) => p.startsWith('/planes') },
  { to: '/mas', label: 'Más', icon: 'dots', match: (p: string) => p.startsWith('/mas') || p.startsWith('/diario') || p.startsWith('/listas') || p.startsWith('/info') || p.startsWith('/wrapped') },
]
</script>

<template>
  <div class="mx-auto min-h-dvh max-w-[560px] pb-nav">
    <SyncBanner />
    <main class="px-4 pt-[max(env(safe-area-inset-top),12px)]">
      <slot />
    </main>
    <nav
      class="safe-bottom fixed inset-x-0 bottom-0 z-30 bg-card/95 shadow-[0_-8px_24px_-14px_rgb(47_24_71/0.4)] backdrop-blur"
      aria-label="Secciones"
    >
      <ul class="mx-auto flex max-w-[560px] justify-between px-1 pt-1">
        <li v-for="it in items" :key="it.to" class="flex-1">
          <NuxtLink
            :to="it.to"
            class="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[13px] font-bold"
            :class="it.match(route.path) ? 'text-primary-dark' : 'text-ink-soft'"
            :aria-current="it.match(route.path) ? 'page' : undefined"
          >
            <span
              class="grid h-8 w-12 place-items-center rounded-full transition-colors"
              :class="it.match(route.path) ? 'bg-primary-soft' : ''"
            >
              <NavIcon :name="it.icon" />
            </span>
            {{ it.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
