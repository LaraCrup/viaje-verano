<script setup lang="ts">
// Hoja que sube desde abajo (alcanzable con el pulgar). Usa <dialog> nativo: foco y Escape accesibles.
// Entra y sale deslizando, y se cierra arrastrándola hacia abajo desde la manija o el título.
const props = defineProps<{ title: string }>()
const open = defineModel<boolean>('open', { required: true })
const dialog = ref<HTMLDialogElement | null>(null)

const shown = ref(false) // posición final (arriba); sin esto queda abajo, fuera de pantalla
// El contenido queda puesto hasta que la hoja termina de bajar (si no, al cerrar desaparece de golpe)
const rendered = ref(false)
const dragY = ref(0)
const dragging = ref(false)
let startY = 0
let startT = 0
const DURATION = 260

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function show() {
  const d = dialog.value
  if (!d) return
  dragY.value = 0
  rendered.value = true
  // Si se reabre mientras estaba bajando, el <dialog> sigue abierto: solo hay que volver a subirla
  if (!d.open) d.showModal()
  requestAnimationFrame(() => requestAnimationFrame(() => (shown.value = true)))
}
function hide() {
  shown.value = false
  setTimeout(() => {
    if (open.value) return // se volvió a abrir mientras bajaba
    if (dialog.value?.open) dialog.value.close()
    rendered.value = false
    dragY.value = 0
  }, reducedMotion() ? 0 : DURATION)
}

watch(open, v => (v ? show() : hide()))
onMounted(() => {
  if (open.value) show()
})

function onBackdrop(e: MouseEvent) {
  if (e.target === dialog.value) open.value = false
}

// Arrastrar hacia abajo para cerrar
function onDown(e: PointerEvent) {
  dragging.value = true
  startY = e.clientY
  startT = performance.now()
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function onMove(e: PointerEvent) {
  if (dragging.value) dragY.value = Math.max(0, e.clientY - startY)
}
function onUp() {
  if (!dragging.value) return
  dragging.value = false
  const speed = dragY.value / Math.max(1, performance.now() - startT) // px por ms
  if (dragY.value > 120 || (dragY.value > 40 && speed > 0.5)) {
    haptic('light')
    open.value = false
  } else {
    dragY.value = 0
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="sheet m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-[28px] bg-paper p-0 text-ink shadow-[0_-12px_40px_-12px_rgb(47_24_71/0.35)] sm:mx-auto sm:max-w-[560px]"
    :class="shown ? 'is-shown' : ''"
    :style="{
      transform: shown ? `translateY(${dragY}px)` : 'translateY(100%)',
      transition: dragging ? 'none' : `transform ${DURATION}ms cubic-bezier(0.2, 0.9, 0.25, 1)`,
    }"
    :aria-label="props.title"
    @cancel.prevent="open = false"
    @close="open = false"
    @click="onBackdrop"
  >
    <div class="safe-bottom overflow-y-auto px-4 pb-4" style="max-height: 88dvh">
      <!-- Manija + título: zona para arrastrar -->
      <div
        class="sticky top-0 z-10 -mx-4 touch-none bg-paper px-4 pt-3"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <div class="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
        <div class="mb-3 flex items-center justify-between gap-2">
          <h2>{{ title }}</h2>
          <button type="button" class="grid h-11 w-11 place-items-center rounded-full text-2xl leading-none" aria-label="Cerrar" @pointerdown.stop @click="open = false">×</button>
        </div>
      </div>
      <slot v-if="rendered" />
    </div>
  </dialog>
</template>

<style scoped>
.sheet::backdrop {
  background: rgb(47 24 71 / 0.35);
  backdrop-filter: blur(2px);
  opacity: 0;
  transition: opacity 240ms ease;
}
.sheet.is-shown::backdrop { opacity: 1; }
</style>
