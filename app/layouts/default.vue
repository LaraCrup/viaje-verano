<script setup lang="ts">
const route = useRoute()
const items = [
  { to: '/', label: 'Hoy', icon: 'sun', match: (p: string) => p === '/' },
  { to: '/itinerario', label: 'Itinerario', icon: 'map', match: (p: string) => p.startsWith('/itinerario') || p.startsWith('/traslados') || p.startsWith('/alojamientos') },
  { to: '/gastos', label: 'Gastos', icon: 'wallet', match: (p: string) => p.startsWith('/gastos') },
  { to: '/planes', label: 'Planes', icon: 'star', match: (p: string) => p.startsWith('/planes') },
  { to: '/mas', label: 'Más', icon: 'dots', match: (p: string) => p.startsWith('/mas') || p.startsWith('/diario') || p.startsWith('/listas') || p.startsWith('/info') || p.startsWith('/seguros') || p.startsWith('/wrapped') },
]
// La burbujita rosa se desliza hasta la pestaña activa
const activeIndex = computed(() => Math.max(0, items.findIndex(it => it.match(route.path))))
</script>

<template>
  <div class="mx-auto min-h-dvh max-w-[560px] pb-nav">
    <SyncBanner />
    <PullToRefresh>
      <main class="px-4 pt-[max(env(safe-area-inset-top),12px)]">
        <slot />
      </main>
    </PullToRefresh>
    <nav
      class="safe-bottom fixed inset-x-0 bottom-0 z-30 select-none bg-card/95 shadow-[0_-8px_24px_-14px_rgb(47_24_71/0.4)] backdrop-blur"
      aria-label="Secciones"
    >
      <ul class="relative mx-auto flex max-w-[560px] justify-between px-1 pt-1">
        <!-- Indicador que se desliza. Tiene la misma estructura que cada pestaña (ícono + texto invisible),
             así la burbuja queda exactamente detrás del ícono. Al moverse se estira un poco. -->
        <li
          class="pointer-events-none absolute left-1 top-1 w-[calc((100%-0.5rem)/5)]"
          :style="{ transform: `translateX(${activeIndex * 100}%)`, transition: 'transform 420ms cubic-bezier(0.34, 1.4, 0.5, 1)' }"
          aria-hidden="true"
        >
          <span class="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[13px] font-bold">
            <span :key="activeIndex" class="tab-stretch h-8 w-12 rounded-full bg-[color-mix(in_srgb,var(--color-primary)_18%,white)]" />
            <span class="invisible">·</span>
          </span>
        </li>
        <li v-for="it in items" :key="it.to" class="relative flex-1">
          <NuxtLink
            :to="it.to"
            class="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-[13px] font-bold transition-colors"
            :class="it.match(route.path) ? 'text-primary-dark' : 'text-ink-soft'"
            :aria-current="it.match(route.path) ? 'page' : undefined"
            @click="haptic('light')"
          >
            <span class="grid h-8 w-12 place-items-center" :class="it.match(route.path) ? 'tab-pop' : ''">
              <NavIcon :name="it.icon" />
            </span>
            {{ it.label }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
  </div>
</template>
