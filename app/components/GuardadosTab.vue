<script setup lang="ts">
// "Guardados": TikToks, Reels, publicaciones de Instagram, YouTube o cualquier link de un lugar
// para ir, agrupados por ciudad. Se pega el link (o en Android se comparte directo a la app)
// y se puede pasar a ideas. (En la base la tabla se llama "videos".)
import { detectPlatform, extractUrl, linkLabel, PLATFORM_LABEL } from '#shared/plans/video'
import type { Video, VideoPlatform } from '#shared/types/domain'

const route = useRoute()
const router = useRouter()
const { data, me, memberById, chapterById, chapterForDate } = useTripData()
const scope = useScope()
const { today } = useNow()
const { show } = useToast()

// Cómo se ve cada plataforma
const STYLE: Record<VideoPlatform, { bg: string; icon: string }> = {
  tiktok: { bg: '#111111', icon: '♪' },
  instagram: { bg: 'linear-gradient(135deg, #f9b3d1 0%, #c62e65 45%, #972db5 100%)', icon: '◎' },
  youtube: { bg: '#e0262f', icon: '▶' },
  otro: { bg: 'var(--color-ink-soft)', icon: '↗' },
}

// ---------- Lista ----------
const chapterFilter = ref('')
const list = computed(() => scope.videos.value.filter(v => !chapterFilter.value || v.chapter_id === chapterFilter.value))
const groups = computed(() => {
  const by = new Map<string, Video[]>()
  for (const v of list.value) {
    const k = v.chapter_id ?? 'sin'
    by.set(k, [...(by.get(k) ?? []), v])
  }
  return [...by.entries()]
    .map(([id, videos]) => ({ chapter: chapterById.value.get(id) ?? null, videos }))
    .sort((a, b) => (a.chapter?.sort ?? 99) - (b.chapter?.sort ?? 99))
})

// ---------- Sumar ----------
const open = ref(false)
const form = reactive({ url: '', title: '', chapter_id: '' })
const platform = computed(() => (extractUrl(form.url) ? detectPlatform(extractUrl(form.url)!) : null))
const canPaste = typeof navigator !== 'undefined' && !!navigator.clipboard?.readText

function defaultChapter() {
  const c = chapterFilter.value || chapterForDate(today.value)?.id || ''
  return c && scope.chapterOk(c) ? c : ''
}
function openNew(prefill?: { url?: string; title?: string }) {
  Object.assign(form, { url: prefill?.url ?? '', title: prefill?.title ?? '', chapter_id: defaultChapter() })
  open.value = true
}
async function paste() {
  try {
    const text = await navigator.clipboard.readText()
    const url = extractUrl(text)
    if (url) form.url = url
    else show('En el portapapeles no hay un link', 'warn')
  } catch {
    show('No se pudo pegar: mantené apretado el campo y elegí “Pegar”', 'warn')
  }
}
async function save() {
  const url = extractUrl(form.url)
  if (!url) return show('Pegá el link', 'warn')
  if (!form.title.trim()) return show('Contá de qué se trata', 'warn')
  if (data.videos.some(v => v.url === url)) return show('Eso ya está guardado', 'info')
  await saveRow('videos', {
    url,
    platform: detectPlatform(url),
    title: form.title.trim(),
    chapter_id: form.chapter_id || null,
    member_id: me.value?.id ?? null,
    plan_id: null,
  })
  open.value = false
  show('Guardado ✓')
}

// Compartido desde TikTok / Instagram (Android): /planes?url=…&text=…&title=…
onMounted(() => {
  const q = route.query
  const shared = extractUrl(String(q.url ?? '')) ?? extractUrl(String(q.text ?? ''))
  if (!shared) return
  router.replace({ query: { tab: 'guardados' } })
  openNew({ url: shared })
})

// ---------- Acciones ----------
async function toIdeas(v: Video) {
  const plan = await saveRow('plans', {
    title: v.title ?? PLATFORM_LABEL[v.platform],
    chapter_id: v.chapter_id,
    day_id: null,
    start_time: null,
    notes: `${linkLabel(v.url)}: ${v.url}`,
    maps_url: null,
    status: 'pending',
    proposed_by: v.member_id ?? me.value?.id ?? null,
    group_label: null,
    sort: data.plans.length + 1,
  })
  await saveRow('videos', { ...v, plan_id: plan.id })
  show('Pasó a ideas ✓', 'ok', { label: 'Ver', to: '/planes' })
}
async function remove(v: Video) {
  await deleteRow('videos', v)
  show('Borrado', 'info', { label: 'Deshacer', run: () => void restoreRow('videos', v) })
}
</script>

<template>
  <div>
    <button type="button" class="btn btn-primary btn-block" @click="openNew()"><NavIcon name="plus" :size="20" /> Guardar un link</button>
    <p class="mb-4 mt-2 px-1 text-[13px] text-ink-soft">Un TikTok, un Reel o una publicación de Instagram, un YouTube o cualquier página de un lugar al que quieran ir.</p>

    <div v-if="scope.chapters.value.length > 1 && scope.videos.value.length" class="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Ciudad">
      <button type="button" role="radio" class="chip shrink-0" :aria-checked="!chapterFilter" @click="chapterFilter = ''">Todas</button>
      <button v-for="c in scope.chapters.value" :key="c.id" type="button" role="radio" class="chip shrink-0" :aria-checked="chapterFilter === c.id" @click="chapterFilter = c.id">{{ c.emoji }} {{ c.name }}</button>
    </div>

    <EmptyState v-if="!list.length" text="Todavía no hay nada guardado. Cuando veas un lugar que te guste en TikTok o Instagram, pegá el link acá." sticker="pin" />

    <section v-for="g in groups" :key="g.chapter?.id ?? 'sin'">
      <h2 class="section-title" :style="{ color: inkFor(g.chapter?.color) }">{{ g.chapter?.emoji }} {{ g.chapter?.name ?? 'Sin ciudad' }}</h2>
      <ul class="card divide-y divide-line/70 px-3 py-1">
        <li v-for="v in g.videos" :key="v.id" class="flex items-center gap-3 py-2.5">
          <!-- Tocar abre la publicación en su app -->
          <a :href="v.url" target="_blank" rel="noopener" class="flex min-w-0 flex-1 items-center gap-3">
            <span
              class="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-[18px] font-bold text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.15)]"
              :style="{ background: STYLE[v.platform].bg }"
              aria-hidden="true"
            >{{ STYLE[v.platform].icon }}</span>
            <span class="min-w-0 flex-1">
              <span class="line-clamp-2 block text-[15px] font-semibold leading-snug">{{ v.title || PLATFORM_LABEL[v.platform] }}</span>
              <span class="block truncate text-[12px] text-ink-soft">
                {{ linkLabel(v.url) }}<template v-if="v.member_id"> · subió {{ v.member_id === me?.id ? 'vos' : memberById.get(v.member_id)?.name }}</template>
              </span>
            </span>
          </a>
          <span v-if="v.plan_id" class="badge shrink-0 bg-ok-soft text-ok">En ideas ✓</span>
          <button v-else type="button" class="flex min-h-11 shrink-0 items-center rounded-full px-2 text-[13px] font-semibold text-primary-dark hover:bg-paper-2" @click="toIdeas(v)">A ideas</button>
          <button type="button" class="-mr-1 grid h-11 w-9 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-paper-2" :aria-label="`Borrar ${v.title ?? 'guardado'}`" @click="remove(v)">
            <NavIcon name="trash" :size="16" />
          </button>
        </li>
      </ul>
    </section>

    <BottomSheet v-model:open="open" title="Guardar un link">
      <form class="space-y-4" @submit.prevent="save">
        <div>
          <label for="vid-url" class="field-label">Link</label>
          <div class="flex gap-2">
            <input id="vid-url" v-model="form.url" class="input min-w-0 flex-1" type="url" inputmode="url" autocomplete="off" placeholder="https://www.tiktok.com/…">
            <button v-if="canPaste" type="button" class="btn btn-secondary min-h-12 shrink-0 px-3 text-[14px]" @click="paste">Pegar</button>
          </div>
          <p v-if="platform" class="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink-soft">
            <span class="grid h-5 w-5 place-items-center rounded-md text-[11px] font-bold text-white" :style="{ background: STYLE[platform].bg }" aria-hidden="true">{{ STYLE[platform].icon }}</span>
            {{ linkLabel(extractUrl(form.url)!) }}
          </p>
        </div>
        <div>
          <label for="vid-title" class="field-label">¿De qué es?</label>
          <input id="vid-title" v-model="form.title" class="input" maxlength="200" placeholder="ej.: Bar con terraza en Trastevere">
          <p class="mt-1 text-[12px] text-ink-soft">Así se reconoce en la lista sin tener que abrirlo.</p>
        </div>
        <div>
          <label for="vid-chapter" class="field-label">¿De qué ciudad?</label>
          <select id="vid-chapter" v-model="form.chapter_id" class="input">
            <option value="">Sin ciudad</option>
            <option v-for="c in scope.chapters.value" :key="c.id" :value="c.id">{{ c.emoji }} {{ c.name }}</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Guardar</button>
      </form>
    </BottomSheet>
  </div>
</template>
