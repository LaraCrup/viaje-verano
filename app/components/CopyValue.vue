<script setup lang="ts">
// Un dato para copiar con un toque (wifi, contraseña, código de reserva).
const props = defineProps<{ label: string; value: string | null | undefined; secret?: boolean }>()
const { show } = useToast()
const revealed = ref(!props.secret)
async function copy() {
  if (!props.value) return
  try {
    await navigator.clipboard.writeText(props.value)
    show(`${props.label} copiado`, 'ok')
  } catch {
    revealed.value = true
  }
}
</script>

<template>
  <div class="flex min-h-11 items-center justify-between gap-2 border-b border-dashed border-line py-1 last:border-0">
    <div class="min-w-0">
      <div class="text-[12px] text-ink-soft">{{ label }}</div>
      <div v-if="value" class="truncate text-[15px] font-semibold tabular" :class="!revealed ? 'tracking-widest' : ''">
        {{ revealed ? value : '••••••' }}
      </div>
      <div v-else class="text-[14px] text-ink-soft">Sin cargar</div>
    </div>
    <div v-if="value" class="flex shrink-0 gap-1">
      <button v-if="secret" type="button" class="btn btn-ghost min-h-11 px-2 text-[14px]" @click="revealed = !revealed">
        {{ revealed ? 'Ocultar' : 'Ver' }}
      </button>
      <button type="button" class="grid h-11 w-11 place-items-center rounded-full hover:bg-paper-2" :aria-label="`Copiar ${label}`" @click="copy">
        <NavIcon name="copy" :size="18" class="text-ink-soft" />
      </button>
    </div>
  </div>
</template>
