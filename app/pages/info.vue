<script setup lang="ts">
// Info útil por país. Texto editable por cualquiera; lo que falta verificar queda marcado.
import type { CountryInfo } from '#shared/types/domain'

const { data, chapterForDate } = useTripData()
const { today } = useNow()
const { show } = useToast()

const COUNTRIES = [
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'IT', name: 'Italia', flag: '🇮🇹' },
]
const CHAPTER_COUNTRY: Record<string, string> = { Israel: 'IL', Madrid: 'ES', Niza: 'FR', Roma: 'IT' }
const country = ref(CHAPTER_COUNTRY[chapterForDate(today.value)?.name ?? ''] ?? 'IL')
const items = computed(() => data.country_info.filter(i => i.country === country.value))
const pendingCount = computed(() => items.value.filter(i => i.needs_check).length)

const editing = ref<string | null>(null)
const form = reactive({ title: '', body: '', needs_check: true })
function edit(i: CountryInfo) {
  editing.value = i.id
  Object.assign(form, { title: i.title, body: i.body, needs_check: i.needs_check })
}
async function save(i: CountryInfo) {
  await saveRow('country_info', { ...i, title: form.title.trim() || i.title, body: form.body, needs_check: form.needs_check })
  editing.value = null
  show('Guardado ✓')
}
async function addSection() {
  const row = await saveRow('country_info', { country: country.value, section: 'otro', title: 'Nueva sección', body: '', needs_check: true, sort: items.value.length + 1 })
  edit(row as unknown as CountryInfo)
}
</script>

<template>
  <div>
    <PageHeader title="Info útil" back="/mas" sticker="sun" />
    <div class="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="tablist" aria-label="País">
      <button v-for="c in COUNTRIES" :key="c.code" type="button" role="tab" class="chip shrink-0" :class="country === c.code ? 'is-on' : ''" :aria-selected="country === c.code" @click="country = c.code; editing = null">{{ c.flag }} {{ c.name }}</button>
    </div>

    <p v-if="pendingCount" class="mb-4 rounded-xl border-2 border-warn bg-warn-soft p-3 text-[15px] font-bold text-warn">
      ⚠️ {{ pendingCount }} sección{{ pendingCount > 1 ? 'es' : '' }} sin verificar. Revisalas antes de viajar y destildá “Falta verificar”.
    </p>

    <section v-for="i in items" :key="i.id" class="card mb-3">
      <template v-if="editing !== i.id">
        <div class="flex items-start justify-between gap-2">
          <h2 class="font-sans text-[17px] font-extrabold">{{ i.title }}</h2>
          <button type="button" class="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-paper-2" :aria-label="`Editar ${i.title}`" @click="edit(i)"><NavIcon name="edit" :size="20" /></button>
        </div>
        <span v-if="i.needs_check" class="badge badge-pending mb-1">Falta verificar</span>
        <p class="whitespace-pre-line text-[15px]">{{ i.body || 'Sin completar.' }}</p>
      </template>
      <form v-else class="space-y-3" @submit.prevent="save(i)">
        <div><label :for="`t-${i.id}`" class="field-label">Título</label><input :id="`t-${i.id}`" v-model="form.title" class="input"></div>
        <div><label :for="`b-${i.id}`" class="field-label">Texto</label><textarea :id="`b-${i.id}`" v-model="form.body" class="input" rows="6" /></div>
        <label class="flex min-h-11 items-center gap-3 font-bold"><input v-model="form.needs_check" type="checkbox" class="h-6 w-6 accent-[#972db5]"> Falta verificar</label>
        <div class="flex gap-2">
          <button type="button" class="btn btn-secondary flex-1" @click="editing = null">Cancelar</button>
          <button type="submit" class="btn btn-primary flex-1">Guardar</button>
        </div>
      </form>
    </section>

    <button type="button" class="btn btn-secondary btn-block" @click="addSection"><NavIcon name="plus" :size="20" /> Agregar sección</button>
  </div>
</template>
