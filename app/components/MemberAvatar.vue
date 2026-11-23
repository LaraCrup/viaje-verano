<script setup lang="ts">
import type { Member } from '#shared/types/domain'

const props = withDefaults(defineProps<{ member?: Member | null; size?: number; ring?: boolean }>(), { size: 36 })
const initials = computed(() => (props.member?.name ?? '?').slice(0, 2))
</script>

<template>
  <span
    class="inline-grid shrink-0 place-items-center rounded-full font-extrabold shadow-[0_0_0_2px_#fff,0_2px_6px_-2px_rgb(47_24_71/0.45)]"
    :class="ring ? 'outline-2 outline-offset-2 outline-primary' : ''"
    :style="{
      width: `${size}px`,
      height: `${size}px`,
      background: member?.color ?? '#624763',
      color: textOn(member?.color ?? '#624763'),
      fontSize: member?.emoji ? `${Math.round(size * 0.55)}px` : `${Math.max(12, Math.round(size * 0.38))}px`,
      outlineStyle: ring ? 'solid' : undefined,
    }"
    :title="member?.name"
    aria-hidden="true"
  >{{ member?.emoji || initials }}</span>
</template>
