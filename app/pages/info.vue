<script setup lang="ts">
// Info útil por país, en secciones desplegables. El texto sigue siendo libre y editable;
// cada renglón se muestra con jerarquía (títulos, teléfonos para llamar, avisos): ver shared/info/blocks.ts.
import { parseInfo, splitPhones } from '#shared/info/blocks'
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
// Tomacorrientes de cada país (para los dibujos de la sección "Enchufes")
const PLUGS: Record<string, string[]> = { IL: ['H', 'C'], ES: ['C', 'F'], FR: ['C', 'E'], IT: ['C', 'F', 'L'] }
// Ícono y color de fondo de cada tipo de sección
const SECTION: Record<string, { icon: string; bg: string }> = {
  emergencias: { icon: '🚨', bg: 'var(--color-bad-soft)' },
  consulado: { icon: '🇦🇷', bg: 'var(--color-violet-soft)' },
  shabat: { icon: '🕯️', bg: 'var(--color-warn-soft)' },
  transporte: { icon: '🚆', bg: 'var(--color-ok-soft)' },
  propinas: { icon: '💸', bg: 'var(--color-primary-soft)' },
  enchufes: { icon: '🔌', bg: 'var(--color-paper-2)' },
  frases: { icon: '💬', bg: 'var(--color-violet-soft)' },
}
const sectionStyle = (s: string) => SECTION[s] ?? { icon: '📌', bg: 'var(--color-paper-2)' }

// Solo los países de sus etapas (a Meli: Israel, y España por la escala en Madrid)
const scope = useScope()
const countries = computed(() => COUNTRIES.filter(c => scope.countries.value.has(c.code)))
const country = ref(CHAPTER_COUNTRY[chapterForDate(today.value)?.name ?? ''] ?? 'IL')
watch(countries, list => {
  if (list.length && !list.some(c => c.code === country.value)) country.value = list[0]!.code
}, { immediate: true })
const items = computed(() => data.country_info.filter(i => i.country === country.value))
const pendingCount = computed(() => items.value.filter(i => i.needs_check).length)

// Secciones abiertas: Emergencias arranca abierta al entrar y al cambiar de país
// (no se cierran solas cuando llegan cambios de las demás).
const open = ref(new Set<string>())
function resetOpen() {
  const em = items.value.find(i => i.section === 'emergencias')
  open.value = new Set(em ? [em.id] : [])
}
watch(country, resetOpen)
watch(() => items.value.length > 0, has => {
  if (has && open.value.size === 0) resetOpen()
}, { immediate: true })
function onToggle(id: string, ev: Event) {
  const isOpen = (ev.target as HTMLDetailsElement).open
  const next = new Set(open.value)
  if (isOpen) next.add(id)
  else next.delete(id)
  open.value = next
}

const editing = ref<string | null>(null)
const form = reactive({ title: '', body: '', needs_check: true })
function edit(i: CountryInfo) {
  editing.value = i.id
  open.value = new Set([...open.value, i.id])
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
      <button v-for="c in countries" :key="c.code" type="button" role="tab" class="chip shrink-0" :class="country === c.code ? 'is-on' : ''" :aria-selected="country === c.code" @click="country = c.code; editing = null">{{ c.flag }} {{ c.name }}</button>
    </div>

    <p v-if="pendingCount" class="mb-4 rounded-xl bg-warn-soft px-3 py-2 text-[14px] text-warn">
      ⚠️ {{ pendingCount }} sección{{ pendingCount > 1 ? 'es' : '' }} sin verificar. Revisalas antes de viajar y destildá “Falta verificar”.
    </p>

    <div class="space-y-2">
      <details
        v-for="i in items"
        :key="i.id"
        class="group card overflow-hidden p-0"
        :open="open.has(i.id)"
        @toggle="onToggle(i.id, $event)"
      >
        <!-- Encabezado: ícono + título + flechita -->
        <summary class="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-2.5 [&::-webkit-details-marker]:hidden">
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[19px]" :style="{ background: sectionStyle(i.section).bg }" aria-hidden="true">{{ sectionStyle(i.section).icon }}</span>
          <span class="min-w-0 flex-1">
            <span class="block text-[15px] font-bold leading-snug">{{ i.title }}</span>
            <span v-if="i.needs_check" class="badge badge-pending mt-0.5 font-semibold">Falta verificar</span>
          </span>
          <NavIcon name="chevron" :size="18" class="shrink-0 text-ink-soft transition-transform group-open:rotate-90" />
        </summary>

        <div class="border-t border-dashed border-line px-4 pb-4 pt-1">
          <template v-if="editing !== i.id">
            <p v-if="!i.body" class="py-3 text-[14px] text-ink-soft">Sin completar.</p>

            <!-- Frases: dos columnas (español → idioma de acá) -->
            <dl v-else-if="i.section === 'frases'" class="divide-y divide-dashed divide-line">
              <div v-for="(b, k) in parseInfo(i.body)" :key="k" class="grid grid-cols-2 gap-3 py-2.5">
                <template v-if="b.kind === 'row'">
                  <dt class="text-[14px] text-ink-soft">{{ b.label }}</dt>
                  <dd class="text-[15px] font-semibold">{{ b.value }}</dd>
                </template>
                <p v-else class="col-span-2 text-[14px]">{{ b.kind === 'item' ? `${b.title}: ${b.text}` : b.text }}</p>
              </div>
            </dl>

            <div v-else class="divide-y divide-dashed divide-line">
              <template v-for="(b, k) in parseInfo(i.body)" :key="k">
                <!-- Teléfono: se toca para llamar -->
                <!-- Números cortos (100, 112) al costado; los internacionales abajo, así la etiqueta no se aprieta -->
                <a v-if="b.kind === 'row' && b.tel" :href="`tel:${b.tel}`" class="flex gap-x-3 gap-y-1.5 py-2.5" :class="b.value.length > 6 ? 'flex-col items-start' : 'items-center'">
                  <span class="min-w-0 flex-1">
                    <span class="block text-[14px] font-semibold">{{ b.label }}</span>
                    <span v-if="b.note" class="block text-[12px] text-ink-soft first-letter:uppercase">{{ b.note }}</span>
                  </span>
                  <span class="flex shrink-0 items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-[15px] font-bold tabular text-primary-dark">
                    <NavIcon name="phone" :size="15" /> {{ b.value }}
                  </span>
                </a>

                <!-- Aviso -->
                <p v-else-if="b.kind === 'note'" class="my-2 flex gap-2 rounded-xl border-0 bg-warn-soft px-3 py-2.5 text-[14px] text-warn">
                  <span aria-hidden="true">⚠️</span>
                  <span><strong class="font-semibold">Ojo:</strong> {{ b.text }}</span>
                </p>

                <!-- Dato con título -->
                <div v-else-if="b.kind === 'row' || b.kind === 'item'" class="py-2.5">
                  <p class="text-[12px] font-semibold uppercase tracking-wide text-ink-soft">{{ b.kind === 'row' ? b.label : b.title }}</p>
                  <p class="mt-0.5 text-[14px] first-letter:uppercase">
                    <template v-for="(part, n) in splitPhones(b.kind === 'row' ? b.value : b.text)" :key="n">
                      <a v-if="part.tel" :href="`tel:${part.tel}`" class="whitespace-nowrap font-semibold text-primary-dark underline decoration-primary/30 underline-offset-2">{{ part.text }}</a>
                      <template v-else>{{ part.text }}</template>
                    </template>
                  </p>
                </div>

                <!-- Párrafo -->
                <p v-else class="py-2.5 text-[14px]">
                  <template v-for="(part, n) in splitPhones(b.text)" :key="n">
                    <a v-if="part.tel" :href="`tel:${part.tel}`" class="whitespace-nowrap font-semibold text-primary-dark underline decoration-primary/30 underline-offset-2">{{ part.text }}</a>
                    <template v-else>{{ part.text }}</template>
                  </template>
                </p>
              </template>
            </div>

            <!-- Enchufes: cómo son los de acá, para reconocerlos -->
            <div v-if="i.section === 'enchufes' && PLUGS[i.country]" class="mt-2 rounded-xl bg-paper-2 p-3">
              <p class="mb-2 text-[12px] text-ink-soft">Así son los enchufes acá</p>
              <PlugTypes :types="PLUGS[i.country]!" />
            </div>

            <!-- Editar -->
            <div class="mt-3 flex justify-end border-t border-dashed border-line pt-2">
              <button type="button" class="flex min-h-11 shrink-0 items-center gap-1 rounded-full px-2 text-[14px] font-semibold text-ink-soft hover:bg-paper-2" @click="edit(i)">
                <NavIcon name="edit" :size="15" /> Editar
              </button>
            </div>
          </template>

          <form v-else class="space-y-3 pt-3" @submit.prevent="save(i)">
            <div><label :for="`t-${i.id}`" class="field-label">Título</label><input :id="`t-${i.id}`" v-model="form.title" class="input"></div>
            <div>
              <label :for="`b-${i.id}`" class="field-label">Texto</label>
              <textarea :id="`b-${i.id}`" v-model="form.body" class="input" rows="8" />
              <p class="mt-1 text-[12px] text-ink-soft">Un dato por renglón. “Título: texto” se ve con título, los teléfonos se pueden tocar para llamar y “Ojo: …” se ve como aviso.</p>
            </div>
            <label class="flex min-h-11 items-center gap-3 font-semibold"><input v-model="form.needs_check" type="checkbox" class="h-6 w-6 accent-[#972db5]"> Falta verificar</label>
            <div class="flex gap-2">
              <button type="button" class="btn btn-secondary flex-1" @click="editing = null">Cancelar</button>
              <button type="submit" class="btn btn-primary flex-1">Guardar</button>
            </div>
          </form>
        </div>
      </details>
    </div>

    <button type="button" class="btn btn-secondary btn-block mt-6" @click="addSection"><NavIcon name="plus" :size="18" /> Agregar sección</button>
  </div>
</template>
