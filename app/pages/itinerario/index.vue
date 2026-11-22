<script setup lang="ts">
import { formatDayShort } from '#shared/time/tz'

const { chapters, transportsByDate, plansByDay, nightLabel } = useItinerary()
const { today } = useNow()

onMounted(() => {
  // Arrancar mostrando el día de hoy si estamos de viaje.
  nextTick(() => document.getElementById(`dia-${today.value}`)?.scrollIntoView({ block: 'center' }))
})
</script>

<template>
  <div>
    <PageHeader title="Itinerario" sticker="plane" />

    <nav class="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4" aria-label="Accesos">
      <NuxtLink to="/traslados" class="chip shrink-0"><NavIcon name="plane" :size="18" /> Traslados</NuxtLink>
      <NuxtLink to="/alojamientos" class="chip shrink-0"><NavIcon name="bed" :size="18" /> Alojamientos</NuxtLink>
    </nav>

    <section v-for="{ chapter, days } in chapters" :key="chapter.id" class="mb-7">
      <div class="relative mb-3 flex items-center gap-3 rounded-[20px] px-4 py-3 shadow-[0_10px_24px_-14px_rgb(47_24_71/0.6)]" :style="{ background: chapter.color, color: textOn(chapter.color) }">
        <span class="text-[26px]" aria-hidden="true">{{ chapter.emoji }}</span>
        <div>
          <h2>{{ chapter.name }}</h2>
          <p class="text-[14px] font-bold opacity-95">{{ formatDayShort(chapter.start_date) }} → {{ formatDayShort(chapter.end_date) }}</p>
        </div>
        <span class="absolute -top-2 right-6 h-5 w-16 rotate-6 rounded-sm opacity-90" :style="{ background: chapter.accent }" aria-hidden="true" />
      </div>

      <ol class="relative ml-3 space-y-3 border-l-[3px] border-dashed pl-5" :style="{ borderColor: chapter.color }">
        <li v-for="d in days" :id="`dia-${d.date}`" :key="d.id" class="relative">
          <span
            class="absolute -left-[31px] top-4 h-4 w-4 rounded-full border-[3px]"
            :style="{ background: d.date === today ? chapter.color : '#ffffff', borderColor: chapter.color }"
            aria-hidden="true"
          />
          <NuxtLink :to="`/itinerario/${d.date}`" class="card block p-3" :class="d.date === today ? 'ring-2 ring-primary' : ''">
            <div class="flex items-baseline justify-between gap-2">
              <p class="text-[13px] font-extrabold uppercase tracking-wide text-ink-soft">{{ formatDayShort(d.date) }}<span v-if="d.date === today" class="badge badge-ok ml-2 normal-case">Hoy</span></p>
            </div>
            <p class="text-[16px] font-extrabold">{{ d.title || 'Día libre' }}</p>
            <ul class="mt-1 space-y-0.5 text-[14px]">
              <li v-for="t in transportsByDate.get(d.date) ?? []" :key="t.id" class="flex items-center gap-1.5">
                <NavIcon :name="KIND_ICON[t.kind] ?? 'plane'" :size="16" />
                <span>{{ t.code ? `${t.code} · ` : '' }}{{ transportTitle(t) }}</span>
              </li>
              <li v-for="p in plansByDay.get(d.id) ?? []" :key="p.id" class="flex items-center gap-1.5">
                <span aria-hidden="true">★</span>
                <span :class="p.status === 'done' ? 'line-through opacity-60' : ''">{{ p.start_time ? `${p.start_time} · ` : '' }}{{ p.title }}</span>
              </li>
              <li class="flex items-center gap-1.5 text-ink-soft">
                <NavIcon name="bed" :size="16" />
                <span v-if="nightLabel(d)" :class="nightLabel(d)!.warn ? 'font-bold text-warn' : ''">{{ nightLabel(d)!.text }}</span>
                <span v-else class="font-bold text-warn">Noche sin alojamiento cargado</span>
              </li>
            </ul>
          </NuxtLink>
        </li>
      </ol>
    </section>
  </div>
</template>
