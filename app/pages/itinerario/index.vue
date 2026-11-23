<script setup lang="ts">
import { formatDayShort } from '#shared/time/tz'

const { chapters, transportsByDate, plansByDay, nightLabel } = useItinerary()
const { today } = useNow()

/** Días que ya pasaron: se muestran resumidos para que resalte lo que viene. */
function doneCount(dayId: string) {
  return (plansByDay.value.get(dayId) ?? []).filter(p => p.status === 'done').length
}

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
          <p class="text-[13px] font-semibold opacity-90">{{ formatDayShort(chapter.start_date) }} → {{ formatDayShort(chapter.end_date) }}</p>
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
          <!-- Día que ya pasó: resumido -->
          <NuxtLink v-if="d.date < today" :to="`/itinerario/${d.date}`" class="card block p-3 opacity-75">
            <p class="eyebrow">{{ formatDayShort(d.date) }}</p>
            <p class="text-[15px] font-semibold">{{ d.title || 'Día libre' }}</p>
            <p v-if="(plansByDay.get(d.id) ?? []).length" class="mt-0.5 flex items-center gap-1 text-[13px] text-ink-soft">
              <NavIcon name="check" :size="14" /> {{ doneCount(d.id) }} de {{ (plansByDay.get(d.id) ?? []).length }} planes hechos
            </p>
          </NuxtLink>

          <NuxtLink v-else :to="`/itinerario/${d.date}`" class="card block p-3" :class="d.date === today ? 'ring-2 ring-primary' : ''">
            <p class="eyebrow flex items-center gap-2">{{ formatDayShort(d.date) }}<span v-if="d.date === today" class="badge bg-primary-soft normal-case tracking-normal text-primary-dark">Hoy</span></p>
            <p class="text-[16px] font-bold">{{ d.title || 'Día libre' }}</p>
            <ul class="mt-1.5 space-y-1 text-[14px]">
              <li v-for="t in transportsByDate.get(d.date) ?? []" :key="t.id" class="flex items-center gap-2 font-semibold">
                <NavIcon :name="KIND_ICON[t.kind] ?? 'plane'" :size="16" class="shrink-0" />
                <span>{{ t.code ? `${t.code} · ` : '' }}{{ transportTitle(t) }}</span>
              </li>
              <li v-for="p in plansByDay.get(d.id) ?? []" :key="p.id" class="flex gap-2">
                <span class="w-[42px] shrink-0 tabular text-ink-soft">{{ p.start_time ?? '·' }}</span>
                <span :class="p.status === 'done' ? 'text-ink-soft line-through decoration-ink-soft/50' : ''">{{ p.title }}</span>
              </li>
            </ul>
            <p class="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-soft">
              <NavIcon name="bed" :size="15" class="shrink-0" />
              <span v-if="nightLabel(d)" :class="nightLabel(d)!.warn ? 'font-semibold text-warn' : ''">{{ nightLabel(d)!.text }}</span>
              <span v-else class="font-semibold text-warn">Noche sin alojamiento cargado</span>
            </p>
          </NuxtLink>
        </li>
      </ol>
    </section>
  </div>
</template>
