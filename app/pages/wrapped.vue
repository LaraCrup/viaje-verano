<script setup lang="ts">
// Wrapped del viaje: pantallas tipo stories + resumen exportable como imagen.
import { category } from '#shared/money/categories'
import { formatMoney } from '#shared/money/currency'
import { closestPoll, tally } from '#shared/plans/polls'
import { ranked } from '#shared/money/stats'
import { COUNTRY_FLAGS, COUNTRY_NAMES, topEntry, totalKm, visited } from '#shared/wrapped'

definePageMeta({ layout: false })

const router = useRouter()
const { data, base, memberById, placeById } = useTripData()
const { stats } = useLedger()
const { show } = useToast()

const places = computed(() => placeById.value as Map<string, any>)
const v = computed(() => visited(data.days, places.value))
const km = computed(() => totalKm(data.transports, places.value))
const memberIds = computed(() => new Set(data.members.map(m => m.id)))
const topCat = computed(() => topEntry(stats.value.byCategory))
const topPayer = computed(() => topEntry(stats.value.timesPaid, memberIds.value))
const rankingPaid = computed(() => ranked(stats.value.timesPaid).filter(([k]) => memberIds.value.has(k)))
const fiercest = computed(() => {
  const list = data.polls.map(poll => ({
    poll,
    tally: tally(data.poll_options.filter(o => o.poll_id === poll.id).map(o => o.id), data.poll_votes.filter(x => x.poll_id === poll.id)),
  }))
  const p = closestPoll(list)
  if (!p) return null
  const t = list.find(x => x.poll.id === p.id)!.tally
  const opts = data.poll_options.filter(o => o.poll_id === p.id)
  return { poll: p, t, opts }
})
const photos = computed(() => data.journal_entries.filter(j => !j.member_id && j.photo_path).slice(0, 6))

type Slide = { id: string; bg: string; fg?: string }
const slides = computed<Slide[]>(() => {
  const s: Slide[] = [
    { id: 'intro', bg: '#c62e65' },
    { id: 'lugares', bg: '#624763' },
    { id: 'km', bg: '#972db5' },
    { id: 'gasto', bg: '#2f1847' },
  ]
  if (topCat.value) s.push({ id: 'categoria', bg: '#9c285d' })
  if (topPayer.value) s.push({ id: 'pagadora', bg: '#972db5' })
  if (fiercest.value) s.push({ id: 'votacion', bg: '#624763' })
  if (photos.value.length) s.push({ id: 'fotos', bg: '#2f1847' })
  s.push({ id: 'fin', bg: '#c62e65' })
  return s
})

const i = ref(0)
const current = computed(() => slides.value[i.value]!)
function next() {
  if (i.value < slides.value.length - 1) i.value++
}
function prev() {
  if (i.value > 0) i.value--
}
function onTap(e: MouseEvent) {
  const x = e.clientX / window.innerWidth
  x < 0.33 ? prev() : next()
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'ArrowRight') next()
  if (e.key === 'ArrowLeft') prev()
  if (e.key === 'Escape') router.back()
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// ---- Exportar como imagen (dibujado en canvas, sin librerías) ----
async function exportImage() {
  await document.fonts.ready
  const W = 1080
  const H = 1920
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#fbf5ec'
  g.fillRect(0, 0, W, H)
  g.strokeStyle = '#e8d6c8'
  g.lineWidth = 2
  for (let x = 0; x < W; x += 54) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke() }
  for (let y = 0; y < H; y += 54) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke() }
  // Cintas de colores de los capítulos
  data.chapters.forEach((ch, k) => {
    g.save()
    g.translate(140 + k * 200, 120)
    g.rotate((k % 2 ? 4 : -4) * Math.PI / 180)
    g.fillStyle = ch.color
    g.fillRect(-80, -26, 160, 52)
    g.restore()
  })
  g.fillStyle = '#2f1847'
  g.textAlign = 'center'
  g.font = '800 86px "Shantell Sans"'
  g.fillText('Nuestro viaje', W / 2, 300)
  g.font = '600 40px Montserrat'
  g.fillStyle = '#624763'
  g.fillText('21/12/2026 → 14/01/2027', W / 2, 370)

  const rows: [string, string][] = [
    ['🌍', `${v.value.countries.length} países · ${v.value.cities.length} ciudades`],
    ['✈️', `${km.value.toLocaleString('es-AR')} km de traslados (aprox.)`],
    ['💸', `${formatMoney(stats.value.groupTotal, base.value)} gastados en grupo`],
  ]
  if (topCat.value) rows.push([category(topCat.value[0]).emoji, `Categoría top: ${category(topCat.value[0]).label}`])
  if (topPayer.value) rows.push(['🏆', `La que más veces pagó: ${memberById.value.get(topPayer.value[0])?.name}`])
  if (fiercest.value) rows.push(['🗳️', `La más peleada: ${fiercest.value.poll.question}`])

  let y = 560
  for (const [emoji, text] of rows) {
    g.fillStyle = '#ffffff'
    g.strokeStyle = '#2f1847'
    g.lineWidth = 5
    g.beginPath()
    g.roundRect(80, y - 90, W - 160, 150, 28)
    g.fill()
    g.stroke()
    g.textAlign = 'left'
    g.font = '70px sans-serif'
    g.fillStyle = '#2f1847'
    g.fillText(emoji, 120, y + 10)
    g.font = '700 40px Montserrat'
    const max = W - 360
    let line = text
    while (g.measureText(line).width > max && line.length > 4) line = `${line.slice(0, -2)}…`
    g.fillText(line, 230, y + 4)
    y += 190
  }
  g.textAlign = 'center'
  g.font = '700 60px "Shantell Sans"'
  g.fillStyle = '#c62e65'
  g.fillText(data.members.map(m => m.name).join(' · '), W / 2, H - 160, W - 120)

  const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/png'))
  if (!blob) return
  const file = new File([blob], 'wrapped-viaje.png', { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Nuestro viaje' })
      return
    } catch { /* cancelado */ }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'wrapped-viaje.png'
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  show('Imagen descargada 📸')
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex flex-col text-white transition-colors duration-300" :style="{ background: current.bg }">
    <!-- Progreso -->
    <div class="flex gap-1 px-3 pt-[max(env(safe-area-inset-top),12px)]" aria-hidden="true">
      <span v-for="(s, k) in slides" :key="s.id" class="h-1 flex-1 rounded-full" :class="k <= i ? 'bg-white' : 'bg-white/35'" />
    </div>
    <div class="flex items-center justify-between px-3 pt-2">
      <p class="text-[14px] font-bold opacity-90">Wrapped del viaje</p>
      <button type="button" class="grid h-11 w-11 place-items-center rounded-full text-[26px] leading-none" aria-label="Cerrar" @click="router.back()">×</button>
    </div>

    <!-- Contenido: tocar a la izquierda vuelve, a la derecha avanza -->
    <button type="button" class="flex flex-1 flex-col items-center justify-center px-8 text-center" :aria-label="`Historia ${i + 1} de ${slides.length}. Tocá para seguir.`" @click="onTap">
      <div :key="current.id" class="rise flex w-full max-w-[420px] flex-col items-center gap-4" aria-live="polite">
        <template v-if="!data.loaded || !data.days.length">
          <Sticker name="plane" :size="80" animate />
          <p class="text-[16px]">Juntando los recuerdos…</p>
        </template>
        <template v-else-if="current.id === 'intro'">
          <Sticker name="plane" :size="96" animate />
          <h1 class="text-[20px] text-white">25 días. 6 amigas.</h1>
          <p class="text-[16px] opacity-95">Esto fue nuestro viaje en números.</p>
        </template>

        <template v-else-if="current.id === 'lugares'">
          <p class="text-[40px]">{{ v.countries.map(c => COUNTRY_FLAGS[c] ?? '🏳️').join(' ') }}</p>
          <h1 class="text-[20px] text-white">{{ v.countries.length }} países, {{ v.cities.length }} ciudades</h1>
          <p class="text-[16px] opacity-95">{{ v.countries.map(c => COUNTRY_NAMES[c] ?? c).join(' · ') }}</p>
          <p class="text-[15px] opacity-90">{{ v.cities.join(', ') }}</p>
        </template>

        <template v-else-if="current.id === 'km'">
          <Sticker name="plane" :size="80" :rot="-20" animate />
          <h1 class="text-[20px] text-white tabular">{{ km.toLocaleString('es-AR') }} km</h1>
          <p class="text-[16px] opacity-95">de traslados en línea recta (aprox.), entre aviones y micros.</p>
        </template>

        <template v-else-if="current.id === 'gasto'">
          <Sticker name="heart" :size="80" animate />
          <h1 class="text-[20px] text-white tabular">{{ formatMoney(stats.groupTotal, base) }}</h1>
          <p class="text-[16px] opacity-95">gastados entre todas, en {{ data.expenses.length }} gastos.</p>
        </template>

        <template v-else-if="current.id === 'categoria' && topCat">
          <p class="text-[64px]" aria-hidden="true">{{ category(topCat[0]).emoji }}</p>
          <h1 class="text-[20px] text-white">{{ category(topCat[0]).label }}</h1>
          <p class="text-[16px] opacity-95">fue la categoría top: {{ formatMoney(topCat[1], base) }}.</p>
        </template>

        <template v-else-if="current.id === 'pagadora' && topPayer">
          <MemberAvatar :member="memberById.get(topPayer[0])" :size="96" />
          <h1 class="text-[20px] text-white">{{ memberById.get(topPayer[0])?.name }}</h1>
          <p class="text-[16px] opacity-95">fue la que más veces sacó la billetera: {{ topPayer[1] }} veces.</p>
          <ol class="mt-2 w-full space-y-1 text-left text-[15px]">
            <li v-for="([id, n], k) in rankingPaid.slice(0, 6)" :key="id" class="flex justify-between rounded-lg bg-white/15 px-3 py-1.5">
              <span>{{ k + 1 }}. {{ memberById.get(id)?.name }}</span><span class="font-extrabold tabular">{{ n }}</span>
            </li>
          </ol>
        </template>

        <template v-else-if="current.id === 'votacion' && fiercest">
          <p class="text-[56px]" aria-hidden="true">🗳️</p>
          <p class="text-[15px] opacity-90">La votación más peleada</p>
          <h1 class="text-[20px] text-white">{{ fiercest.poll.question }}</h1>
          <ul class="w-full space-y-1 text-[15px]">
            <li v-for="o in fiercest.opts" :key="o.id" class="flex justify-between rounded-lg bg-white/15 px-3 py-1.5">
              <span>{{ o.label }}</span><span class="font-extrabold tabular">{{ fiercest.t.counts[o.id] }}</span>
            </li>
          </ul>
        </template>

        <template v-else-if="current.id === 'fotos'">
          <h1 class="text-[20px] text-white">El diario</h1>
          <div class="grid w-full grid-cols-2 gap-3">
            <PhotoView v-for="(p, k) in photos" :key="p.id" :path="p.photo_path!" :alt="p.text ?? 'Foto del diario'" :rot="k % 2 ? 3 : -3" />
          </div>
        </template>

        <template v-else-if="current.id === 'fin'">
          <Sticker name="confetti" :size="96" animate />
          <h1 class="text-[20px] text-white">¡Gracias por este viaje!</h1>
          <p class="text-[16px] opacity-95">{{ data.members.map(m => m.name).join(' · ') }}</p>
        </template>
      </div>
    </button>

    <div class="safe-bottom flex gap-2 px-4 pb-3">
      <button type="button" class="btn btn-secondary flex-1 text-ink" @click="exportImage">Compartir imagen</button>
      <button v-if="i < slides.length - 1" type="button" class="btn btn-secondary flex-1 text-ink" @click="next">Siguiente</button>
      <button v-else type="button" class="btn btn-secondary flex-1 text-ink" @click="i = 0">Ver de nuevo</button>
    </div>
  </div>
</template>
