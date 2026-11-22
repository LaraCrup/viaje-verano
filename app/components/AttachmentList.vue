<script setup lang="ts">
// Pasajes, tarjetas de embarque y comprobantes (PDF o foto). Disponibles sin conexión una vez abiertos o bajados.
import type { Attachment } from '#shared/types/domain'
import { isCached, prefetchFiles, storeFile } from '~/sync/files'

const props = defineProps<{ ownerType: Attachment['owner_type']; ownerId: string; title?: string }>()
const { data, memberById, me } = useTripData()
const { tripId } = useSession()
const { show } = useToast()

const items = computed(() => data.attachments.filter(a => a.owner_id === props.ownerId))
const whose = ref<string>('all')
const uploading = ref(false)
const offline = ref<Record<string, boolean>>({})

watch(items, async list => {
  for (const a of list) offline.value[a.id] = await isCached(a.storage_path)
}, { immediate: true })

async function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  if (!files.length) return
  uploading.value = true
  for (const f of files) {
    const stored = await storeFile(tripId.value, props.ownerType, f)
    await saveRow('attachments', {
      owner_type: props.ownerType,
      owner_id: props.ownerId,
      member_id: whose.value === 'all' ? null : whose.value,
      storage_path: stored.path,
      mime: stored.mime,
      name: f.name,
      size_bytes: stored.size,
    })
  }
  uploading.value = false
  input.value = ''
  show(files.length > 1 ? `${files.length} archivos guardados` : 'Archivo guardado', 'ok')
}

async function downloadAll() {
  const n = await prefetchFiles(items.value.map(a => a.storage_path))
  for (const a of items.value) offline.value[a.id] = await isCached(a.storage_path)
  show(n ? `Listo: ${n} archivo${n > 1 ? 's' : ''} disponible${n > 1 ? 's' : ''} sin conexión` : 'Ya estaba todo guardado', 'ok')
}

async function remove(a: Attachment) {
  if (!confirm(`¿Sacar “${a.name ?? 'archivo'}”?`)) return
  await deleteRow('attachments', a)
}
</script>

<template>
  <section>
    <h2 class="section-title"><NavIcon name="clip" :size="20" /> {{ title ?? 'Archivos' }}</h2>
    <ul v-if="items.length" class="mb-3 space-y-2">
      <li v-for="a in items" :key="a.id" class="card flex items-center gap-3 p-2">
        <FileThumb :path="a.storage_path" :mime="a.mime" :name="a.name" />
        <div class="min-w-0 flex-1">
          <p class="truncate font-bold">{{ a.name ?? 'Archivo' }}</p>
          <p class="text-[13px] text-ink-soft">
            {{ a.member_id ? `De ${memberById.get(a.member_id)?.name}` : 'De todas' }}
            · <span :class="offline[a.id] ? 'text-ok font-bold' : ''">{{ offline[a.id] ? 'Disponible sin conexión' : 'Se baja al abrir' }}</span>
          </p>
        </div>
        <button type="button" class="grid h-11 w-11 place-items-center rounded-full hover:bg-paper-2" :aria-label="`Sacar ${a.name ?? 'archivo'}`" @click="remove(a)">
          <NavIcon name="trash" :size="20" />
        </button>
      </li>
    </ul>
    <p v-else class="mb-3 text-[15px] text-ink-soft">Todavía no hay archivos.</p>

    <div class="card space-y-3 p-3">
      <div>
        <label :for="`whose-${ownerId}`" class="field-label">¿De quién es?</label>
        <select :id="`whose-${ownerId}`" v-model="whose" class="input">
          <option value="all">De todas</option>
          <option v-for="m in data.members" :key="m.id" :value="m.id">{{ m.name }}{{ m.id === me?.id ? ' (vos)' : '' }}</option>
        </select>
      </div>
      <div class="flex flex-wrap gap-2">
        <label class="btn btn-secondary flex-1 cursor-pointer">
          {{ uploading ? 'Guardando…' : '+ Adjuntar PDF o foto' }}
          <input type="file" accept="image/*,application/pdf" multiple class="sr-only" @change="onFile">
        </label>
        <button v-if="items.length" type="button" class="btn btn-secondary flex-1" @click="downloadAll">
          <NavIcon name="download" :size="20" /> Bajar para offline
        </button>
      </div>
    </div>
  </section>
</template>
