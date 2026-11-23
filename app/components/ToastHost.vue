<script setup lang="ts">
// Avisos de abajo: entran deslizando, se apilan y se descartan arrastrándolos de costado.
const { toasts, dismiss } = useToast()
const tones = {
  ok: 'bg-ok-soft border-ok',
  info: 'bg-card border-primary',
  warn: 'bg-warn-soft border-warn',
  bad: 'bg-bad-soft border-bad',
}

// Arrastrar para descartar
const drag = reactive({ id: 0, x0: 0, dx: 0 })
function onDown(id: number, e: PointerEvent) {
  Object.assign(drag, { id, x0: e.clientX, dx: 0 })
}
function onMove(e: PointerEvent) {
  if (drag.id) drag.dx = e.clientX - drag.x0
}
function onUp() {
  if (drag.id && Math.abs(drag.dx) > 80) dismiss(drag.id)
  Object.assign(drag, { id: 0, dx: 0 })
}
</script>

<template>
  <div class="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-50 px-4" aria-live="polite">
    <TransitionGroup tag="div" name="toast" class="relative flex flex-col items-center gap-2">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="pointer-events-auto flex w-full max-w-[520px] touch-pan-y items-start gap-3 rounded-2xl border-l-[5px] px-4 py-3 text-[14px] font-semibold shadow-[0_12px_30px_-12px_rgb(47_24_71/0.45)]"
        :class="tones[t.tone]"
        :style="drag.id === t.id ? { transform: `translateX(${drag.dx}px)`, opacity: String(1 - Math.min(Math.abs(drag.dx) / 200, 0.7)), transition: 'none' } : undefined"
        role="status"
        @pointerdown="onDown(t.id, $event)"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <span class="flex-1">{{ t.text }}</span>
        <NuxtLink v-if="t.action?.to" :to="t.action.to" class="link shrink-0" @click="dismiss(t.id)">{{ t.action.label }}</NuxtLink>
        <button v-else-if="t.action?.run" type="button" class="link shrink-0" @click="t.action.run(); dismiss(t.id)">{{ t.action.label }}</button>
        <button type="button" class="-my-2 -mr-2 grid h-10 w-10 shrink-0 place-items-center text-xl" aria-label="Cerrar aviso" @click="dismiss(t.id)">×</button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active { transition: transform 320ms cubic-bezier(0.2, 0.9, 0.3, 1.15), opacity 200ms ease; }
.toast-leave-active { transition: transform 220ms ease, opacity 200ms ease; position: absolute; width: 100%; max-width: 520px; }
.toast-move { transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.toast-enter-from { opacity: 0; transform: translateY(24px) scale(0.96); }
.toast-leave-to { opacity: 0; transform: translateY(12px) scale(0.96); }
</style>
