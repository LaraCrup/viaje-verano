<script setup lang="ts">
// Foto grande guardada en el celular (o bajada la primera vez), tipo polaroid.
import { fileUrl } from '~/sync/files'

const props = defineProps<{ path: string; alt: string; rot?: number }>()
const url = ref<string | null>(null)
async function load() {
  url.value = await fileUrl(props.path)
}
onMounted(load)
watch(() => props.path, load)
onBeforeUnmount(() => url.value && URL.revokeObjectURL(url.value))
</script>

<template>
  <figure class="bg-white p-2 pb-3 shadow-[0_6px_14px_-8px_rgb(70_45_20/0.45)]" :style="{ transform: `rotate(${rot ?? 0}deg)` }">
    <img v-if="url" :src="url" :alt="alt" class="aspect-[4/3] w-full object-cover">
    <div v-else class="grid aspect-[4/3] w-full place-items-center bg-paper-2 text-[14px] text-ink-soft">La foto se ve con señal</div>
    <figcaption v-if="$slots.default" class="pt-2"><slot /></figcaption>
  </figure>
</template>
