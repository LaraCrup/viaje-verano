<script setup lang="ts">
import { formatDayLong } from '#shared/time/tz'
import { pairId } from '~/lib/supabase'
import { storeFile } from '~/sync/files'

const route = useRoute()
const date = computed(() => String(route.params.date))
const { data, me, memberById, dayByDate } = useTripData()
const { tripId } = useSession()
const { show } = useToast()

const day = computed(() => dayByDate.value.get(date.value) ?? null)
const group = computed(() => data.journal_entries.find(j => j.date === date.value && !j.member_id) ?? null)
const mine = computed(() => data.journal_entries.find(j => j.date === date.value && j.member_id === me.value?.id) ?? null)
const others = computed(() => data.journal_entries.filter(j => j.date === date.value && j.member_id && j.member_id !== me.value?.id && j.text))

const phrase = ref('')
const moment = ref('')
watch(group, g => (phrase.value = g?.text ?? ''), { immediate: true })
watch(mine, m => (moment.value = m?.text ?? ''), { immediate: true })

async function saveGroup(patch: { text?: string | null; photo_path?: string | null }) {
  if (!day.value) return
  await saveRow('journal_entries', { ...(group.value ?? { photo_path: null, text: null }), id: day.value.id, date: date.value, member_id: null, ...patch })
}
async function onPhoto(ev: Event) {
  const f = (ev.target as HTMLInputElement).files?.[0]
  if (!f) return
  const stored = await storeFile(tripId.value, 'journal', f)
  await saveGroup({ photo_path: stored.path })
  show('Foto del día guardada 📸')
}
async function savePhrase() {
  await saveGroup({ text: phrase.value.trim() || null })
  show('Frase guardada ✓')
}
async function saveMoment() {
  if (!day.value || !me.value) return
  await saveRow('journal_entries', { ...(mine.value ?? {}), id: pairId(day.value.id, me.value.id), date: date.value, member_id: me.value.id, text: moment.value.trim() || null, photo_path: null })
  show('Tu momento quedó guardado ✨')
}
</script>

<template>
  <div>
    <PageHeader :title="formatDayLong(date)" back="/diario" />
    <EmptyState v-if="!day" text="Este día no es parte del viaje." />
    <template v-else>
      <section class="mb-6">
        <h2 class="section-title">📸 Foto del día</h2>
        <PhotoView v-if="group?.photo_path" :path="group.photo_path" :alt="group.text ?? 'Foto del día'" :rot="-1" />
        <label class="btn btn-secondary btn-block mt-3 cursor-pointer">
          {{ group?.photo_path ? 'Cambiar foto' : 'Elegir la foto del día' }}
          <input type="file" accept="image/*" class="sr-only" @change="onPhoto">
        </label>
      </section>

      <form class="mb-6" @submit.prevent="savePhrase">
        <label for="phrase" class="section-title">💬 La frase del día</label>
        <input id="phrase" v-model="phrase" class="input" maxlength="160" placeholder="Algo que alguien dijo y quedó…">
        <button type="submit" class="btn btn-primary btn-block mt-2" :disabled="phrase === (group?.text ?? '')">Guardar frase</button>
      </form>

      <form v-if="me" class="mb-6" @submit.prevent="saveMoment">
        <label for="moment" class="section-title">✨ Tu momento del día</label>
        <textarea id="moment" v-model="moment" class="input" rows="3" maxlength="400" placeholder="Lo mejor de hoy para vos…" />
        <button type="submit" class="btn btn-primary btn-block mt-2" :disabled="moment === (mine?.text ?? '')">Guardar mi momento</button>
      </form>

      <section v-if="others.length">
        <h2 class="section-title">Los momentos de las chicas</h2>
        <ul class="space-y-2">
          <li v-for="m in others" :key="m.id" class="flex items-start gap-2">
            <MemberAvatar :member="memberById.get(m.member_id!)" :size="32" />
            <p class="card flex-1 p-3 text-[15px]"><strong>{{ memberById.get(m.member_id!)?.name }}:</strong> {{ m.text }}</p>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
