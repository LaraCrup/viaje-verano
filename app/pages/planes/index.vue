<script setup lang="ts">
// Ideas por ciudad (pendiente/hecho, quién lo propuso, Maps) y votaciones rápidas.
import { isPollOpen, tally, toggleVote } from '#shared/plans/polls'
import type { Plan, Poll } from '#shared/types/domain'
import { formatDayShort } from '#shared/time/tz'
import { pairId } from '~/lib/supabase'

const route = useRoute()
const router = useRouter()
const { data, me, memberById, chapterById, dayByDate } = useTripData()
const { now, today } = useNow()
const { show } = useToast()

const tab = computed<'ideas' | 'votar'>({
  get: () => (route.query.tab === 'votar' ? 'votar' : 'ideas'),
  set: v => router.replace({ query: v === 'votar' ? { tab: 'votar' } : {} }),
})

// ---------- Ideas ----------
const chapterFilter = ref<string>('')
const ideas = computed(() => data.plans.filter(p => !p.day_id && (!chapterFilter.value || p.chapter_id === chapterFilter.value)))
const groupedIdeas = computed(() => {
  const byChapter = new Map<string, Map<string, Plan[]>>()
  for (const p of ideas.value) {
    const c = p.chapter_id ?? 'sin'
    const g = p.group_label ?? 'Ideas sueltas'
    if (!byChapter.has(c)) byChapter.set(c, new Map())
    const m = byChapter.get(c)!
    m.set(g, [...(m.get(g) ?? []), p])
  }
  return [...byChapter.entries()].map(([cid, groups]) => ({ chapter: chapterById.value.get(cid) ?? null, groups: [...groups.entries()] }))
})
const scheduled = computed(() => data.plans.filter(p => p.day_id).length)

const ideaOpen = ref(false)
const ideaForm = reactive({ id: '', title: '', chapter_id: '', group_label: '', notes: '', maps_url: '' })
function openIdea(p?: Plan) {
  Object.assign(ideaForm, {
    id: p?.id ?? '',
    title: p?.title ?? '',
    chapter_id: p?.chapter_id ?? chapterFilter.value ?? '',
    group_label: p?.group_label ?? '',
    notes: p?.notes ?? '',
    maps_url: p?.maps_url ?? '',
  })
  ideaOpen.value = true
}
async function saveIdea() {
  if (!ideaForm.title.trim()) return
  const existing = data.plans.find(p => p.id === ideaForm.id)
  await saveRow('plans', {
    ...(existing ?? { status: 'pending', sort: data.plans.length + 1, proposed_by: me.value?.id ?? null, day_id: null }),
    id: ideaForm.id || undefined,
    title: ideaForm.title.trim(),
    chapter_id: ideaForm.chapter_id || null,
    group_label: ideaForm.group_label.trim() || null,
    notes: ideaForm.notes.trim() || null,
    maps_url: ideaForm.maps_url.trim() || null,
  })
  ideaOpen.value = false
  show(existing ? 'Idea guardada ✓' : 'Idea agregada ✓')
}
async function toggleIdeaDone(p: Plan) {
  await saveRow('plans', { ...p, status: p.status === 'done' ? 'pending' : 'done' })
}
async function removeIdea(p: Plan) {
  ideaOpen.value = false
  await deleteRow('plans', p)
  show('Idea borrada', 'info', { label: 'Deshacer', run: () => void restoreRow('plans', p) })
}

// Mover una idea a un día del itinerario
const moveOpen = ref(false)
const moving = ref<Plan | null>(null)
const moveDate = ref('')
const moveDays = computed(() => {
  const c = moving.value?.chapter_id
  const days = c ? data.days.filter(d => d.chapter_id === c) : data.days
  return days.length ? days : data.days
})
function openMove(p: Plan) {
  moving.value = p
  moveDate.value = moveDays.value.find(d => d.date >= today.value)?.date ?? moveDays.value[0]?.date ?? ''
  moveOpen.value = true
}
async function confirmMove() {
  const p = moving.value
  const day = dayByDate.value.get(moveDate.value)
  if (!p || !day) return
  await saveRow('plans', { ...p, day_id: day.id, chapter_id: day.chapter_id ?? p.chapter_id })
  moveOpen.value = false
  show(`“${p.title}” quedó para el ${formatDayShort(day.date)}`, 'ok', { label: 'Ver día', to: `/itinerario/${day.date}` })
}

function mapsFor(p: Plan) {
  const city = p.chapter_id ? chapterById.value.get(p.chapter_id)?.name : ''
  return p.maps_url || mapsUrl({ query: `${p.title} ${city ?? ''}`.trim() })
}

// ---------- Votaciones ----------
const polls = computed(() =>
  data.polls.map(poll => {
    const options = data.poll_options.filter(o => o.poll_id === poll.id)
    const votes = data.poll_votes.filter(v => v.poll_id === poll.id)
    const t = tally(options.map(o => o.id), votes)
    const mine = votes.find(v => v.member_id === me.value?.id)?.option_ids ?? []
    return { poll, options, votes, t, mine, open: isPollOpen(poll, now.value) }
  }),
)

async function vote(poll: Poll, optionId: string, mine: string[]) {
  if (!me.value) return
  const option_ids = toggleVote(mine, optionId, poll.multiple)
  const id = pairId(poll.id, me.value.id)
  const existing = data.poll_votes.find(v => v.id === id)
  await saveRow('poll_votes', { ...(existing ?? {}), id, poll_id: poll.id, member_id: me.value.id, option_ids })
}

async function closePoll(poll: Poll) {
  await saveRow('polls', { ...poll, closed: !poll.closed })
  show(poll.closed ? 'Votación reabierta' : 'Votación cerrada 🔒')
}

async function removePoll(poll: Poll) {
  if (!confirm('¿Borrar esta votación?')) return
  await deleteRow('polls', poll)
  show('Votación borrada', 'info', { label: 'Deshacer', run: () => void restoreRow('polls', poll) })
}

const pollOpen = ref(false)
const pollForm = reactive({ question: '', options: ['', ''], multiple: false, closes: '' })
function openPoll(prefill?: { question: string; options: string[] }) {
  Object.assign(pollForm, { question: prefill?.question ?? '', options: prefill?.options ?? ['', ''], multiple: false, closes: '' })
  pollOpen.value = true
}
async function savePoll() {
  const opts = pollForm.options.map(o => o.trim()).filter(Boolean)
  if (!pollForm.question.trim() || opts.length < 2) return show('Poné una pregunta y al menos 2 opciones', 'warn')
  const poll = await saveRow('polls', {
    question: pollForm.question.trim(),
    multiple: pollForm.multiple,
    closes_at: pollForm.closes ? new Date(pollForm.closes).toISOString() : null,
    closed: false,
    chapter_id: null,
  })
  for (const [i, label] of opts.entries()) {
    const plan = data.plans.find(p => p.title.toLowerCase() === label.toLowerCase())
    await saveRow('poll_options', { poll_id: poll.id, label, plan_id: plan?.id ?? null, sort: i })
  }
  pollOpen.value = false
  tab.value = 'votar'
  show('¡Votación creada! Avisales a las chicas 🗳️')
}

// Votar entre ideas de un mismo "día posible" (ej. "¿Mónaco o Saint-Tropez?")
function pollFromGroup(label: string, items: Plan[]) {
  openPoll({ question: `${label}: ¿qué hacemos?`, options: items.map(p => p.title) })
}
</script>

<template>
  <div>
    <PageHeader title="Planes" sticker="lemon" />

    <div class="mb-4 flex gap-2" role="tablist" aria-label="Planes">
      <button type="button" role="tab" class="chip" :aria-selected="tab === 'ideas'" :class="tab === 'ideas' ? 'is-on' : ''" @click="tab = 'ideas'">Ideas</button>
      <button type="button" role="tab" class="chip" :aria-selected="tab === 'votar'" :class="tab === 'votar' ? 'is-on' : ''" @click="tab = 'votar'">
        Votaciones<template v-if="polls.filter(p => p.open && !p.mine.length).length"> ({{ polls.filter(p => p.open && !p.mine.length).length }})</template>
      </button>
    </div>

    <!-- IDEAS -->
    <template v-if="tab === 'ideas'">
      <div class="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4" role="radiogroup" aria-label="Ciudad">
        <button type="button" role="radio" class="chip shrink-0" :aria-checked="!chapterFilter" @click="chapterFilter = ''">Todas</button>
        <button v-for="c in data.chapters" :key="c.id" type="button" role="radio" class="chip shrink-0" :aria-checked="chapterFilter === c.id" @click="chapterFilter = c.id">{{ c.emoji }} {{ c.name }}</button>
      </div>

      <p v-if="scheduled" class="mb-3 text-[14px] text-ink-soft">{{ scheduled }} plan{{ scheduled > 1 ? 'es' : '' }} ya {{ scheduled > 1 ? 'están' : 'está' }} en el itinerario.</p>

      <EmptyState v-if="!ideas.length" text="No hay ideas sueltas. ¡Sumá una!" sticker="lemon" />

      <section v-for="block in groupedIdeas" :key="block.chapter?.id ?? 'sin'" class="mb-6">
        <h2 class="section-title" :style="{ color: inkFor(block.chapter?.color) }">{{ block.chapter?.emoji }} {{ block.chapter?.name ?? 'Sin ciudad' }}</h2>
        <div v-for="[label, items] in block.groups" :key="label" class="card tape-left tape mb-4 p-3" :style="{ '--tape': block.chapter?.accent }">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h3 class="font-sans text-[15px] font-extrabold uppercase tracking-wide text-ink-soft">{{ label }}</h3>
            <button v-if="items.length > 1" type="button" class="btn btn-ghost min-h-10 px-1 text-[14px]" @click="pollFromGroup(label, items)">Votar 🗳️</button>
          </div>
          <ul class="space-y-1">
            <li v-for="p in items" :key="p.id" class="flex items-center gap-1">
              <button type="button" class="tick" :aria-pressed="p.status === 'done'" :aria-label="`${p.title}: ${p.status === 'done' ? 'hecho' : 'pendiente'}`" @click="toggleIdeaDone(p)">
                <NavIcon v-if="p.status === 'done'" name="check" :size="18" />
              </button>
              <button type="button" class="min-h-11 flex-1 px-1 text-left" @click="openIdea(p)">
                <span class="font-bold" :class="p.status === 'done' ? 'line-through opacity-60' : ''">{{ p.title }}</span>
                <span v-if="p.proposed_by" class="block text-[13px] text-ink-soft">propuso {{ memberById.get(p.proposed_by)?.name }}</span>
              </button>
              <a :href="mapsFor(p)" target="_blank" rel="noopener" class="grid h-11 w-11 place-items-center rounded-full hover:bg-paper-2" :aria-label="`${p.title} en Google Maps`"><NavIcon name="pin" :size="20" /></a>
              <button type="button" class="grid h-11 w-11 place-items-center rounded-full hover:bg-paper-2" :aria-label="`Pasar ${p.title} a un día`" @click="openMove(p)"><NavIcon name="map" :size="20" /></button>
            </li>
          </ul>
        </div>
      </section>

      <button type="button" class="btn btn-primary btn-block" @click="openIdea()"><NavIcon name="plus" /> Sumar una idea</button>
    </template>

    <!-- VOTACIONES -->
    <template v-else>
      <EmptyState v-if="!polls.length" text="No hay votaciones. Armá una: “¿Mónaco o Saint-Tropez?”, “¿dónde cenamos?”." sticker="star" />
      <section v-for="{ poll, options, t, mine, open } in polls" :key="poll.id" class="card tape mb-5">
        <div class="flex items-start justify-between gap-2">
          <h2 class="font-sans text-[17px] font-extrabold">{{ poll.question }}</h2>
          <span class="badge shrink-0" :class="open ? 'badge-ok' : 'bg-paper-2 text-ink-soft'">{{ open ? 'Abierta' : 'Cerrada' }}</span>
        </div>
        <p class="mb-3 text-[13px] text-ink-soft">
          {{ t.totalVoters }} de {{ data.members.length }} votaron{{ poll.multiple ? ' · se puede elegir varias' : '' }}
          <template v-if="poll.closes_at && open"> · cierra {{ new Date(poll.closes_at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}</template>
        </p>
        <ul class="space-y-2">
          <li v-for="o in options" :key="o.id">
            <button
              type="button"
              class="pick relative w-full overflow-hidden rounded-2xl p-3 text-left font-normal"
              :class="mine.includes(o.id) ? 'is-on' : ''"
              :disabled="!open"
              :aria-pressed="mine.includes(o.id)"
              @click="vote(poll, o.id, mine)"
            >
              <span class="absolute inset-y-0 left-0 bg-primary-soft" :style="{ width: `${t.totalVoters ? Math.round((t.counts[o.id]! / t.totalVoters) * 100) : 0}%` }" aria-hidden="true" />
              <span class="relative flex items-center justify-between gap-2">
                <span class="font-bold">
                  <span v-if="!open && t.leaders.includes(o.id)" aria-hidden="true">🏆 </span>{{ o.label }}
                  <span v-if="mine.includes(o.id)" class="text-[13px] text-primary-dark"> · tu voto</span>
                </span>
                <span class="flex items-center gap-1">
                  <span class="flex -space-x-2" aria-hidden="true">
                    <MemberAvatar v-for="vid in t.voters[o.id]" :key="vid" :member="memberById.get(vid)" :size="24" />
                  </span>
                  <span class="min-w-6 text-right font-extrabold tabular">{{ t.counts[o.id] }}</span>
                </span>
              </span>
            </button>
          </li>
        </ul>
        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" class="btn btn-secondary min-h-11 flex-1 text-[14px]" @click="closePoll(poll)">{{ poll.closed ? 'Reabrir' : 'Cerrar votación' }}</button>
          <button v-if="!open && t.leaders.length === 1 && options.find(o => o.id === t.leaders[0])?.plan_id" type="button" class="btn btn-primary min-h-11 flex-1 text-[14px]" @click="openMove(data.plans.find(p => p.id === options.find(o => o.id === t.leaders[0])!.plan_id)!)">Pasar la ganadora a un día</button>
          <button type="button" class="btn btn-ghost min-h-11 px-2 text-[14px] text-bad" @click="removePoll(poll)">Borrar</button>
        </div>
      </section>
      <button type="button" class="btn btn-primary btn-block" @click="openPoll()"><NavIcon name="plus" /> Nueva votación</button>
    </template>

    <!-- Hojas -->
    <BottomSheet v-model:open="ideaOpen" :title="ideaForm.id ? 'Editar idea' : 'Nueva idea'">
      <form class="space-y-3" @submit.prevent="saveIdea">
        <div><label for="i-title" class="field-label">¿Qué?</label><input id="i-title" v-model="ideaForm.title" class="input" required maxlength="120"></div>
        <div>
          <label for="i-chapter" class="field-label">Ciudad / capítulo</label>
          <select id="i-chapter" v-model="ideaForm.chapter_id" class="input"><option value="">—</option><option v-for="c in data.chapters" :key="c.id" :value="c.id">{{ c.name }}</option></select>
        </div>
        <div><label for="i-group" class="field-label">Grupo (opcional)</label><input id="i-group" v-model="ideaForm.group_label" class="input" placeholder="ej.: Día 3"></div>
        <div><label for="i-notes" class="field-label">Notas</label><textarea id="i-notes" v-model="ideaForm.notes" class="input" rows="2" /></div>
        <div><label for="i-maps" class="field-label">Link de Maps (opcional)</label><input id="i-maps" v-model="ideaForm.maps_url" type="url" inputmode="url" class="input"></div>
        <button type="submit" class="btn btn-primary btn-block">Guardar</button>
        <button v-if="ideaForm.id" type="button" class="btn btn-secondary btn-block text-bad" @click="removeIdea(data.plans.find(p => p.id === ideaForm.id)!)">Borrar idea</button>
      </form>
    </BottomSheet>

    <BottomSheet v-model:open="moveOpen" title="Pasar a un día">
      <form class="space-y-3" @submit.prevent="confirmMove">
        <p class="font-bold">{{ moving?.title }}</p>
        <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Día">
          <button v-for="d in moveDays" :key="d.id" type="button" role="radio" class="chip justify-center" :aria-checked="moveDate === d.date" @click="moveDate = d.date">{{ formatDayShort(d.date) }}</button>
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="!moveDate">Listo</button>
      </form>
    </BottomSheet>

    <BottomSheet v-model:open="pollOpen" title="Nueva votación">
      <form class="space-y-3" @submit.prevent="savePoll">
        <div><label for="v-q" class="field-label">Pregunta</label><input id="v-q" v-model="pollForm.question" class="input" maxlength="200" placeholder="¿Dónde cenamos?" required></div>
        <div v-for="(_, i) in pollForm.options" :key="i">
          <label :for="`v-o-${i}`" class="field-label">Opción {{ i + 1 }}</label>
          <input :id="`v-o-${i}`" v-model="pollForm.options[i]" class="input" maxlength="120">
        </div>
        <button type="button" class="btn btn-ghost px-0" @click="pollForm.options.push('')">+ Otra opción</button>
        <label class="flex min-h-11 items-center gap-3 font-bold"><input v-model="pollForm.multiple" type="checkbox" class="h-6 w-6 accent-[#c62e65]"> Se puede elegir más de una</label>
        <div><label for="v-close" class="field-label">Cierra (opcional)</label><input id="v-close" v-model="pollForm.closes" type="datetime-local" class="input"></div>
        <button type="submit" class="btn btn-primary btn-block">Crear votación</button>
      </form>
    </BottomSheet>
  </div>
</template>
