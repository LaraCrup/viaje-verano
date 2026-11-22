<script setup lang="ts">
// Íconos propios, trazo simple tipo dibujado a mano.
defineProps<{ name: string; size?: number }>()
</script>

<template>
  <svg
    :width="size ?? 24"
    :height="size ?? 24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'sun'">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
    </template>
    <template v-else-if="name === 'map'">
      <path d="M3.5 6.2 9 4l6 2.3 5.5-2v13.5L15 20l-6-2.3-5.5 2.1z" />
      <path d="M9 4v13.7M15 6.3V20" />
    </template>
    <template v-else-if="name === 'wallet'">
      <path d="M4 7.5c0-1.4 1-2.5 2.4-2.5H18v3" />
      <rect x="3.5" y="7.5" width="17" height="12" rx="2.5" />
      <circle cx="16" cy="13.5" r="1.3" fill="currentColor" />
    </template>
    <template v-else-if="name === 'star'">
      <path d="m12 3.2 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.6l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z" />
    </template>
    <template v-else-if="name === 'dots'">
      <circle cx="5.5" cy="12" r="1.6" fill="currentColor" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" />
      <circle cx="18.5" cy="12" r="1.6" fill="currentColor" />
    </template>
    <template v-else-if="name === 'back'">
      <path d="M15 5 8 12l7 7" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'plane'">
      <path d="M10.5 13.5 3 11l1.5-1.5 7.5 1L16.5 6c1-1 2.6-1.3 3.2-.7.6.6.3 2.2-.7 3.2l-4.5 4.5 1 7.5L14 22l-2.5-7.5-3 3V20l-1.5 1-1-3-3-1 1-1.5h2.5z" />
    </template>
    <template v-else-if="name === 'bus'">
      <rect x="4.5" y="3.5" width="15" height="15" rx="3" />
      <path d="M4.5 11h15M8 18.5V21M16 18.5V21" />
      <circle cx="8.3" cy="15" r=".9" fill="currentColor" />
      <circle cx="15.7" cy="15" r=".9" fill="currentColor" />
    </template>
    <template v-else-if="name === 'bed'">
      <path d="M3 18.5V6M3 14h18v4.5M21 14v-2.5c0-1.7-1.3-3-3-3h-7V14" />
      <circle cx="7" cy="10.5" r="1.8" />
    </template>
    <template v-else-if="name === 'pin'">
      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </template>
    <template v-else-if="name === 'clip'">
      <path d="m20 11.5-7.8 7.8a5 5 0 0 1-7-7l8.3-8.3a3.3 3.3 0 0 1 4.7 4.7l-8.3 8.3a1.7 1.7 0 0 1-2.4-2.4l7.6-7.6" />
    </template>
    <template v-else-if="name === 'edit'">
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" />
    </template>
    <template v-else-if="name === 'copy'">
      <rect x="8" y="8" width="12" height="12" rx="2.5" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </template>
    <template v-else-if="name === 'cloud-off'">
      <path d="M7 18.5h10.5a4 4 0 0 0 .6-8A6 6 0 0 0 7 9.5a4.5 4.5 0 0 0 0 9z" />
      <path d="M3 3l18 18" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </template>
    <template v-else-if="name === 'filter'">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </template>
    <template v-else-if="name === 'download'">
      <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
    </template>
    <template v-else-if="name === 'chevron'">
      <path d="m9 5 7 7-7 7" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="8" />
    </template>
  </svg>
</template>
