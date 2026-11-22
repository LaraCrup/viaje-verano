<script setup lang="ts">
// Miniatura de un archivo guardado (foto o PDF). Se abre a pantalla completa; funciona sin señal si ya se bajó.
import { fileUrl } from '~/sync/files'

const props = withDefaults(defineProps<{ path: string; mime?: string | null; name?: string | null; size?: number }>(), { size: 56 })
const url = ref<string | null>(null)
const failed = ref(false)
const isPdf = computed(() => props.mime === 'application/pdf' || props.path.endsWith('.pdf'))

async function load() {
  failed.value = false
  url.value = await fileUrl(props.path)
  if (!url.value) failed.value = true
}
onMounted(load)
watch(() => props.path, load)
onBeforeUnmount(() => {
  if (url.value) URL.revokeObjectURL(url.value)
})
</script>

<template>
  <a
    v-if="url"
    :href="url"
    target="_blank"
    rel="noopener"
    class="inline-grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-[0_0_0_3px_#fff,0_4px_10px_-4px_rgb(47_24_71/0.45)]"
    :style="{ width: `${size}px`, height: `${size}px` }"
    :aria-label="`Abrir ${name ?? (isPdf ? 'PDF' : 'foto')}`"
  >
    <span v-if="isPdf" class="text-[13px] font-extrabold">PDF</span>
    <img v-else :src="url" alt="" class="h-full w-full object-cover">
  </a>
  <button
    v-else
    type="button"
    class="inline-grid shrink-0 place-items-center rounded-xl border-2 border-dashed border-line text-[12px] font-bold text-ink-soft"
    :style="{ width: `${size}px`, height: `${size}px` }"
    @click="load"
  >{{ failed ? 'Sin señal' : '…' }}</button>
</template>
