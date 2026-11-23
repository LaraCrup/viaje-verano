<script setup lang="ts">
import { formatDayLong } from '#shared/time/tz'

const { data, memberById, chapterById } = useTripData()
const { today } = useNow()

const days = computed(() =>
  [...data.days]
    .filter(d => d.date <= today.value)
    .reverse()
    .map(d => ({
      day: d,
      group: data.journal_entries.find(j => j.date === d.date && !j.member_id) ?? null,
      moments: data.journal_entries.filter(j => j.date === d.date && j.member_id && j.text),
    })),
)
const next = computed(() => data.days.find(d => d.date > today.value) ?? null)
</script>

<template>
  <div>
    <PageHeader title="Diario" back="/mas" sticker="heart" />

    <EmptyState v-if="!days.length" :text="`El diario arranca el primer día de viaje${next ? ` (${formatDayLong(data.days[0]!.date)})` : ''}. Una foto, una frase y el momento del día de cada una.`" sticker="star">
      <NuxtLink v-if="data.days[0]" :to="`/diario/${data.days[0].date}`" class="btn btn-secondary mt-2">Ver cómo es</NuxtLink>
    </EmptyState>

    <article v-for="({ day, group, moments }, idx) in days" :key="day.id" class="mb-8">
      <NuxtLink :to="`/diario/${day.date}`" class="block">
        <p class="eyebrow mb-2 px-1 first-letter:uppercase" :style="{ color: inkFor(chapterById.get(day.chapter_id ?? '')?.color) }">
          {{ formatDayLong(day.date) }} · {{ chapterById.get(day.chapter_id ?? '')?.name }}
        </p>
        <PhotoView v-if="group?.photo_path" :path="group.photo_path" :alt="group.text ?? `Foto del ${day.date}`" :rot="idx % 2 ? 1.2 : -1.2">
          <p v-if="group.text" class="font-display text-[18px] font-semibold">“{{ group.text }}”</p>
        </PhotoView>
        <div v-else-if="group?.text" class="card text-center">
          <p class="font-display text-[18px] font-semibold">“{{ group.text }}”</p>
        </div>
        <div v-else class="rounded-xl border-2 border-dashed border-line px-3 py-2 text-center">
          <p class="text-[13px] text-ink-soft">Sin foto ni frase todavía. Tocá para agregar.</p>
        </div>
      </NuxtLink>
      <ul v-if="moments.length" class="mt-3 space-y-2">
        <li v-for="m in moments" :key="m.id" class="flex items-start gap-2">
          <MemberAvatar :member="memberById.get(m.member_id!)" :size="30" />
          <p class="card flex-1 px-3 py-2 text-[14px]"><span class="block text-[12px] text-ink-soft">{{ memberById.get(m.member_id!)?.name }}</span>{{ m.text }}</p>
        </li>
      </ul>
    </article>
  </div>
</template>
