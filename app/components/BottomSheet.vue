<script setup lang="ts">
// Hoja que sube desde abajo (alcanzable con el pulgar). Usa <dialog> nativo: foco y Escape accesibles.
const props = defineProps<{ title: string }>()
const open = defineModel<boolean>('open', { required: true })
const dialog = ref<HTMLDialogElement | null>(null)

watch(open, v => {
  if (!dialog.value) return
  if (v && !dialog.value.open) dialog.value.showModal()
  if (!v && dialog.value.open) dialog.value.close()
})
onMounted(() => {
  if (open.value) dialog.value?.showModal()
})
function onClick(e: MouseEvent) {
  if (e.target === dialog.value) open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="m-0 mt-auto max-h-[88dvh] w-full max-w-none rounded-t-[28px] bg-paper p-0 text-ink shadow-[0_-12px_40px_-12px_rgb(47_24_71/0.35)] backdrop:bg-[rgb(47_24_71/0.35)] backdrop:backdrop-blur-[2px] sm:mx-auto sm:max-w-[560px]"
    :aria-label="props.title"
    @close="open = false"
    @click="onClick"
  >
    <div class="safe-bottom overflow-y-auto px-4 pb-4 pt-3" style="max-height: 88dvh">
      <div class="mx-auto mb-3 h-1.5 w-12 rounded-full bg-line" aria-hidden="true" />
      <div class="mb-3 flex items-center justify-between gap-2">
        <h2>{{ title }}</h2>
        <button type="button" class="grid h-11 w-11 place-items-center rounded-full text-2xl leading-none" aria-label="Cerrar" @click="open = false">×</button>
      </div>
      <slot v-if="open" />
    </div>
  </dialog>
</template>
