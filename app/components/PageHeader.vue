<script setup lang="ts">
const props = defineProps<{ title: string; back?: string | boolean; sticker?: string; subtitle?: string }>()
const router = useRouter()
function goBack() {
  if (typeof props.back === 'string') router.push(props.back)
  else if (window.history.length > 1) router.back()
  else router.push('/')
}
</script>

<template>
  <header class="mb-4 flex min-h-12 items-center gap-2">
    <button
      v-if="back"
      type="button"
      class="-ml-2 grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-paper-2"
      aria-label="Volver"
      @click="goBack"
    >
      <NavIcon name="back" />
    </button>
    <div class="min-w-0 flex-1">
      <h1 class="relative inline-block">
        {{ title }}
        <svg class="absolute -bottom-1.5 left-0 h-2 w-full" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
          <path d="M1 5c12-4 22 2 34-1s22-3 34 0 20 1 30-2" fill="none" stroke="#f9b3d1" stroke-width="4" stroke-linecap="round" />
        </svg>
      </h1>
      <p v-if="subtitle" class="mt-1 text-[14px] text-ink-soft">{{ subtitle }}</p>
    </div>
    <slot name="right" />
    <Sticker v-if="sticker" :name="sticker" :size="40" :rot="10" />
  </header>
</template>
