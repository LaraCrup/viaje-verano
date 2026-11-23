<script setup lang="ts">
import type { Stay } from '#shared/types/domain'
import { formatDayNumeric } from '#shared/time/tz'

const props = defineProps<{ s: Stay }>()
const { chapterById } = useTripData()
const chapter = computed(() => (props.s.chapter_id ? chapterById.value.get(props.s.chapter_id) : null))
</script>

<template>
  <NuxtLink :to="`/alojamientos/${s.id}`" class="card block" :style="{ boxShadow: `inset 4px 0 0 ${chapter?.color ?? '#624763'}, var(--shadow-paper)` }">
    <div class="flex items-start gap-3">
      <span class="icon-bubble" :style="{ background: `color-mix(in srgb, ${chapter?.accent ?? '#f9b3d1'} 55%, white)` }">
        <NavIcon name="bed" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="eyebrow flex flex-wrap items-center gap-2">
          <span>{{ chapter?.name ?? 'Alojamiento' }}<template v-if="s.kind"> · {{ s.kind }}</template></span>
          <span v-if="s.status === 'pending'" class="badge badge-pending normal-case tracking-normal">Pendiente</span>
        </div>
        <div class="text-[16px] font-bold">{{ s.name }}</div>
        <div class="text-[13px] text-ink-soft tabular">
          <template v-if="s.check_in_date">{{ formatDayNumeric(s.check_in_date) }} → {{ s.check_out_date ? formatDayNumeric(s.check_out_date) : '¿?' }}</template>
          <template v-if="s.address"> · {{ s.address }}</template>
        </div>
      </div>
    </div>
  </NuxtLink>
</template>
