<script setup lang="ts">
// Stickers y garabatos originales (SVG propio). Siempre decorativos.
withDefaults(defineProps<{ name: string; size?: number; rot?: number; animate?: boolean }>(), {
  size: 44,
  rot: -6,
  animate: false,
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    aria-hidden="true"
    class="pointer-events-none shrink-0"
    :class="animate ? 'sticker-in' : ''"
    :style="{ '--rot': `${rot}deg`, transform: animate ? undefined : `rotate(${rot}deg)` }"
  >
    <g v-if="name === 'star'" stroke="#2f1847" stroke-width="3" stroke-linejoin="round">
      <path d="M32 5l7.5 16 17.5 2.3-12.8 12 3.3 17.4L32 44.3 16.5 52.7l3.3-17.4L7 23.3 24.5 21z" fill="#f9b3d1" />
      <path d="M26 29c1.5 1.5 3 1.5 4 0M34 29c1.5 1.5 3 1.5 4 0" fill="none" stroke-linecap="round" />
    </g>
    <g v-else-if="name === 'heart'" stroke="#2f1847" stroke-width="3" stroke-linejoin="round">
      <path d="M32 55S7 40 7 23c0-8 6-13 12.5-13C25 10 29 13.5 32 18c3-4.5 7-8 12.5-8C51 10 57 15 57 23c0 17-25 32-25 32z" fill="#c62e65" />
      <path d="M17 21c1-4 3.5-6 7-6" fill="none" stroke="#fff" stroke-linecap="round" />
    </g>
    <g v-else-if="name === 'plane'" stroke="#2f1847" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
      <path d="M8 36l40-22c4-2 8 0 6 4L32 50l-4-12-14 2z" fill="#eda6fc" />
      <path d="M28 38l20-22" fill="none" />
      <path d="M4 52c6-2 10-6 12-10" fill="none" stroke-dasharray="3 5" />
    </g>
    <g v-else-if="name === 'sun'" stroke="#2f1847" stroke-width="3" stroke-linecap="round">
      <circle cx="32" cy="32" r="13" fill="#f9b3d1" />
      <path d="M32 6v8M32 50v8M6 32h8M50 32h8M13.5 13.5l5.5 5.5M45 45l5.5 5.5M13.5 50.5l5.5-5.5M45 19l5.5-5.5" />
    </g>
    <g v-else-if="name === 'lemon'" stroke="#2f1847" stroke-width="3" stroke-linejoin="round">
      <path d="M10 34c0-13 11-22 23-22 9 0 15 4 19 9l5-2-1 6c2 3 2 8 0 12-4 9-13 15-24 15-12 0-22-7-22-18z" fill="#eda6fc" />
      <path d="M40 12c2-5 7-7 12-6-2 5-6 8-12 6z" fill="#d63af9" />
    </g>
    <g v-else-if="name === 'wave'" stroke="#2f1847" stroke-width="3" stroke-linecap="round" fill="none">
      <path d="M4 26c6-6 10-6 14 0s8 6 14 0 10-6 14 0 8 6 14 0" stroke="#972db5" />
      <path d="M4 40c6-6 10-6 14 0s8 6 14 0 10-6 14 0 8 6 14 0" />
    </g>
    <g v-else-if="name === 'pizza'" stroke="#2f1847" stroke-width="3" stroke-linejoin="round">
      <path d="M8 14c15-6 33-6 48 0L32 58z" fill="#fde2ee" />
      <path d="M8 14c15-6 33-6 48 0l-3 6c-13-5-29-5-42 0z" fill="#f9b3d1" />
      <circle cx="26" cy="27" r="4" fill="#c62e65" />
      <circle cx="38" cy="33" r="4" fill="#c62e65" />
      <circle cx="31" cy="43" r="3.5" fill="#c62e65" />
    </g>
    <g v-else-if="name === 'fan'" stroke="#2f1847" stroke-width="3" stroke-linejoin="round">
      <path d="M32 52L8 24c8-10 40-10 48 0z" fill="#f9b3d1" />
      <path d="M32 52 20 18M32 52V16M32 52l12-34" fill="none" stroke="#c62e65" />
    </g>
    <g v-else-if="name === 'pin'" stroke="#2f1847" stroke-width="3" stroke-linejoin="round">
      <path d="M32 58S13 39 13 25a19 19 0 0 1 38 0c0 14-19 33-19 33z" fill="#972db5" />
      <circle cx="32" cy="25" r="7.5" fill="#f9e3fe" />
      <path d="M21 18c2-4 5.5-6.5 10-7" fill="none" stroke="#f9e3fe" stroke-linecap="round" />
    </g>
    <g v-else-if="name === 'squiggle'" fill="none" stroke="#c62e65" stroke-width="4" stroke-linecap="round">
      <path d="M4 36c5-10 9-10 12 0s7 10 12 0 9-10 12 0 7 10 12 0 7-8 8-4" />
    </g>
    <g v-else-if="name === 'arrow'" fill="none" stroke="#2f1847" stroke-width="3" stroke-linecap="round">
      <path d="M8 44c10-20 30-28 46-22" />
      <path d="M46 14l9 8-11 4" />
    </g>
    <g v-else-if="name === 'confetti'" stroke="#2f1847" stroke-width="2.5" stroke-linejoin="round">
      <rect x="10" y="10" width="10" height="6" rx="1" fill="#c62e65" transform="rotate(-20 15 13)" />
      <rect x="40" y="8" width="10" height="6" rx="1" fill="#eda6fc" transform="rotate(25 45 11)" />
      <circle cx="30" cy="30" r="5" fill="#f9b3d1" />
      <rect x="12" y="40" width="10" height="6" rx="1" fill="#d63af9" transform="rotate(35 17 43)" />
      <rect x="42" y="44" width="10" height="6" rx="1" fill="#d63af9" transform="rotate(-30 47 47)" />
    </g>
    <g v-else stroke="#2f1847" stroke-width="3">
      <circle cx="32" cy="32" r="20" fill="#f9b3d1" />
    </g>
  </svg>
</template>
