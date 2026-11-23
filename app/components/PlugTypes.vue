<script setup lang="ts">
// Dibujos de los tomacorrientes de cada país (vista de frente), para reconocerlos y saber qué adaptador llevar.
// Dibujo propio en SVG: funciona sin conexión.
defineProps<{ types: string[] }>()

const LABEL: Record<string, string> = {
  C: 'Tipo C',
  E: 'Tipo E',
  F: 'Tipo F',
  H: 'Tipo H',
  L: 'Tipo L',
}
</script>

<template>
  <div class="flex flex-wrap items-end gap-3">
    <figure v-for="t in types" :key="t" class="flex flex-col items-center gap-1">
      <svg width="64" height="64" viewBox="0 0 64 64" role="img" :aria-label="`Enchufe ${LABEL[t] ?? t}`">
        <!-- Placa -->
        <rect x="4" y="4" width="56" height="56" rx="12" fill="#fff" stroke="#2f1847" stroke-width="2.5" />
        <!-- C, E y F: hueco redondo con dos agujeros -->
        <template v-if="t === 'C' || t === 'E' || t === 'F'">
          <circle cx="32" cy="32" r="19" fill="#f5ebdf" stroke="#2f1847" stroke-width="2" />
          <circle cx="24" cy="32" r="3.4" fill="#2f1847" />
          <circle cx="40" cy="32" r="3.4" fill="#2f1847" />
          <!-- E: patita de tierra arriba -->
          <circle v-if="t === 'E'" cx="32" cy="20" r="3" fill="#c62e65" stroke="#2f1847" stroke-width="1.5" />
          <!-- F: chapitas de tierra arriba y abajo -->
          <template v-if="t === 'F'">
            <rect x="28" y="12.5" width="8" height="4" rx="1" fill="#c62e65" stroke="#2f1847" stroke-width="1.2" />
            <rect x="28" y="47.5" width="8" height="4" rx="1" fill="#c62e65" stroke="#2f1847" stroke-width="1.2" />
          </template>
        </template>
        <!-- H (Israel): tres agujeros en triángulo -->
        <template v-else-if="t === 'H'">
          <circle cx="23" cy="25" r="3.4" fill="#2f1847" />
          <circle cx="41" cy="25" r="3.4" fill="#2f1847" />
          <circle cx="32" cy="42" r="3.4" fill="#2f1847" />
        </template>
        <!-- L (Italia): tres agujeros en línea -->
        <template v-else-if="t === 'L'">
          <circle cx="20" cy="32" r="3.2" fill="#2f1847" />
          <circle cx="32" cy="32" r="3.2" fill="#2f1847" />
          <circle cx="44" cy="32" r="3.2" fill="#2f1847" />
        </template>
      </svg>
      <figcaption class="text-[12px] font-semibold text-ink-soft">{{ LABEL[t] ?? t }}</figcaption>
    </figure>
  </div>
</template>
