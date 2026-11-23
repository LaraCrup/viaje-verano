<script setup lang="ts">
// "Deslizar para actualizar": tirando hacia abajo desde arriba de todo, sincroniza con la base.
// Solo con la app instalada en el inicio (en el navegador ya existe el de Safari/Chrome).
const { state, syncNow } = useSync()

const THRESHOLD = 72
const MAX = 120
const pull = ref(0)
const refreshing = ref(false)
const enabled = ref(false)
let startY: number | null = null
const touching = ref(false)
let armed = false

onMounted(() => {
  enabled.value = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
})

function onStart(e: TouchEvent) {
  if (!enabled.value || refreshing.value || window.scrollY > 0 || document.querySelector('dialog[open]')) return
  startY = e.touches[0]!.clientY
  touching.value = true
  armed = false
}
function onMove(e: TouchEvent) {
  if (startY === null) return
  const dy = e.touches[0]!.clientY - startY
  if (dy <= 0 || window.scrollY > 0) {
    pull.value = 0
    return
  }
  // Resistencia: cuanto más se tira, menos se mueve
  pull.value = Math.min(MAX, dy * 0.5)
  if (!armed && pull.value >= THRESHOLD) {
    armed = true
    haptic('light')
  } else if (armed && pull.value < THRESHOLD) {
    armed = false
  }
}
async function onEnd() {
  if (startY === null) return
  startY = null
  touching.value = false
  if (pull.value < THRESHOLD) {
    pull.value = 0
    return
  }
  refreshing.value = true
  pull.value = THRESHOLD - 16
  if (state.online) await syncNow()
  else useToast().show('Sin señal: se actualiza cuando vuelva', 'warn')
  refreshing.value = false
  pull.value = 0
}
</script>

<template>
  <div @touchstart.passive="onStart" @touchmove.passive="onMove" @touchend="onEnd" @touchcancel="onEnd">
    <!-- Indicador: el avioncito gira mientras se tira y mientras sincroniza -->
    <div
      v-if="enabled"
      class="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),8px)] z-40 flex justify-center"
      :style="{
        transform: `translateY(${pull - 56}px)`,
        opacity: String(Math.min(1, pull / THRESHOLD)),
        transition: !touching ? 'transform 260ms cubic-bezier(0.2, 0.9, 0.25, 1), opacity 200ms' : 'none',
      }"
      aria-hidden="true"
    >
      <span class="grid h-11 w-11 place-items-center rounded-full bg-card shadow-paper" :class="refreshing ? 'ptr-spin' : ''">
        <span :style="{ transform: refreshing ? undefined : `rotate(${pull * 4}deg)` }"><Sticker name="plane" :size="26" :rot="0" /></span>
      </span>
    </div>
    <div
      :style="{
        transform: pull ? `translateY(${pull * 0.6}px)` : undefined,
        transition: !touching ? 'transform 260ms cubic-bezier(0.2, 0.9, 0.25, 1)' : 'none',
      }"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
@keyframes ptr-spin { to { transform: rotate(360deg); } }
.ptr-spin { animation: ptr-spin 900ms linear infinite; }
</style>
