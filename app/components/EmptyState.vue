<script setup lang="ts">
defineProps<{ text: string; sticker?: string }>()
</script>

<template>
  <div class="flex flex-col items-center gap-2 py-8 text-center text-ink-soft">
    <Sticker :name="sticker ?? 'star'" :size="52" />
    <p class="max-w-[28ch] text-[15px]">{{ text }}</p>
    <slot />
  </div>
</template>
