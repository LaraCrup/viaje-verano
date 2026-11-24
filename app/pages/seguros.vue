<script setup lang="ts">
// Seguro de viaje de cada una: el archivo de la póliza (PDF o foto). Cada una sube el suyo
// y todas pueden abrirlos (sirve si hay una emergencia). Se guardan en el celular al abrirlos.
import type { Attachment } from '#shared/types/domain'
import { storeFile } from '~/sync/files'

const { data, me } = useTripData()
const { tripId } = useSession()
const { show } = useToast()

// Vos primero, después el resto en el orden de siempre
const people = computed(() => {
  const list = [...data.members].sort((a, b) => a.sort - b.sort)
  const mine = list.findIndex(m => m.id === me.value?.id)
  if (mine > 0) list.unshift(...list.splice(mine, 1))
  return list.map(m => ({ member: m, files: data.attachments.filter(a => a.owner_type === 'insurance' && a.owner_id === m.id) }))
})
const loaded = computed(() => people.value.filter(p => p.files.length).length)

const uploading = ref(false)
async function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  if (!files.length || !me.value) return
  uploading.value = true
  for (const f of files) {
    const stored = await storeFile(tripId.value, 'seguros', f)
    await saveRow('attachments', {
      owner_type: 'insurance',
      owner_id: me.value.id,
      member_id: me.value.id,
      storage_path: stored.path,
      mime: stored.mime,
      name: f.name,
      size_bytes: stored.size,
    })
  }
  uploading.value = false
  input.value = ''
  show('Seguro guardado ✓')
}

async function remove(a: Attachment) {
  if (!confirm(`¿Sacar “${a.name ?? 'el archivo'}”?`)) return
  await deleteRow('attachments', a)
  show('Archivo sacado', 'info', { label: 'Deshacer', run: () => void restoreRow('attachments', a) })
}
</script>

<template>
  <div>
    <PageHeader title="Seguro de viaje" back="/mas" sticker="heart" />

    <p class="mb-4 px-1 text-[13px] text-ink-soft">
      Cada una sube el suyo (PDF o foto de la póliza). Todas pueden abrirlos, por si hay una emergencia.
      <span class="font-semibold text-ink">{{ loaded }} de {{ people.length }} cargados.</span>
    </p>

    <ul class="space-y-3">
      <li v-for="{ member, files } in people" :key="member.id" class="card">
        <div class="flex items-center gap-3">
          <MemberAvatar :member="member" :size="40" />
          <p class="min-w-0 flex-1 text-[16px] font-bold">
            {{ member.name }}<span v-if="member.id === me?.id" class="font-normal text-ink-soft"> (vos)</span>
          </p>
          <span class="badge shrink-0" :class="files.length ? 'badge-ok' : 'badge-pending'">{{ files.length ? 'Cargado ✓' : 'Falta' }}</span>
        </div>

        <!-- Archivos -->
        <ul v-if="files.length" class="mt-3 space-y-2 border-t border-dashed border-line pt-3">
          <li v-for="a in files" :key="a.id" class="flex items-center gap-3">
            <FileThumb :path="a.storage_path" :mime="a.mime" :name="a.name" :size="48" />
            <span class="min-w-0 flex-1 truncate text-[14px] font-semibold">{{ a.name ?? 'Seguro' }}</span>
            <button v-if="member.id === me?.id" type="button" class="grid h-11 w-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper-2" :aria-label="`Sacar ${a.name ?? 'archivo'}`" @click="remove(a)">
              <NavIcon name="trash" :size="16" />
            </button>
          </li>
        </ul>
        <p v-else-if="member.id !== me?.id" class="mt-2 text-[13px] text-ink-soft">Todavía no lo cargó.</p>

        <!-- Subir el propio -->
        <label v-if="member.id === me?.id" class="btn mt-3 w-full cursor-pointer" :class="files.length ? 'btn-secondary min-h-11 text-[14px]' : 'btn-primary'">
          <NavIcon name="plus" :size="18" /> {{ uploading ? 'Guardando…' : files.length ? 'Agregar otro archivo' : 'Subir mi seguro' }}
          <input type="file" accept="image/*,application/pdf" multiple class="sr-only" @change="onFile">
        </label>
      </li>
    </ul>
  </div>
</template>
