<script setup lang="ts">
const { toasts, dismiss } = useToast()
const tones = {
  ok: 'bg-ok-soft border-ok',
  info: 'bg-card border-primary',
  warn: 'bg-warn-soft border-warn',
  bad: 'bg-bad-soft border-bad',
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="rise pointer-events-auto flex w-full max-w-[520px] items-start gap-3 rounded-2xl border-l-[5px] px-4 py-3 text-[14px] font-semibold shadow-[0_12px_30px_-12px_rgb(47_24_71/0.45)]"
      :class="tones[t.tone]"
      role="status"
    >
      <span class="flex-1">{{ t.text }}</span>
      <NuxtLink v-if="t.action?.to" :to="t.action.to" class="link shrink-0" @click="dismiss(t.id)">{{ t.action.label }}</NuxtLink>
      <button v-else-if="t.action?.run" type="button" class="link shrink-0" @click="t.action.run(); dismiss(t.id)">{{ t.action.label }}</button>
      <button type="button" class="-my-2 -mr-2 grid h-10 w-10 shrink-0 place-items-center text-xl" aria-label="Cerrar aviso" @click="dismiss(t.id)">×</button>
    </div>
  </div>
</template>
