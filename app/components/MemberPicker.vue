<script setup lang="ts">
// Elegir una o varias integrantes tocando sus avatares (botones grandes).
import type { Member } from '#shared/types/domain'

const props = defineProps<{ members: Member[]; multiple?: boolean; label: string; meFirst?: string }>()
const model = defineModel<string[]>({ required: true })

const ordered = computed(() => {
  if (!props.meFirst) return props.members
  return [...props.members].sort((a, b) => (a.id === props.meFirst ? -1 : b.id === props.meFirst ? 1 : a.sort - b.sort))
})

function toggle(id: string) {
  if (!props.multiple) {
    model.value = [id]
    return
  }
  model.value = model.value.includes(id) ? model.value.filter(x => x !== id) : [...model.value, id]
}
</script>

<template>
  <fieldset>
    <legend class="field-label">{{ label }}</legend>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="m in ordered"
        :key="m.id"
        type="button"
        class="pick"
        :aria-pressed="model.includes(m.id)"
        @click="toggle(m.id)"
      >
        <MemberAvatar :member="m" :size="38" />
        {{ m.name }}
      </button>
    </div>
  </fieldset>
</template>
