<script setup lang="ts">
import { getDb } from '~/sync/db'
import { prefetchFiles } from '~/sync/files'

const router = useRouter()
const { data, me } = useTripData()
const { state, syncNow } = useSync()
const { canSwitch, signOut } = useSession()
const { show } = useToast()
const nuxtApp = useNuxtApp()

const EMOJIS = ['🌸', '🦋', '🌈', '🍋', '🍉', '🌻', '🐬', '🦩', '🍕', '🌊', '⭐', '🌙', '🎀', '🍓', '🥑', '🐝', '🌵', '💃', '🎧', '📸']
const COLORS = ['#C62E65', '#9C285D', '#972DB5', '#624763', '#2F1847', '#F9B3D1', '#EDA6FC']

async function setEmoji(e: string | null) {
  if (!me.value) return
  await saveRow('members', { ...me.value, emoji: e })
}
async function setColor(c: string) {
  if (!me.value) return
  await saveRow('members', { ...me.value, color: c })
}

const downloading = ref('')
async function downloadAll() {
  const paths = [
    ...data.attachments.map(a => a.storage_path),
    ...data.expenses.map(e => e.receipt_path).filter(Boolean) as string[],
  ]
  downloading.value = 'Bajando…'
  const n = await prefetchFiles(paths, (d, t) => (downloading.value = `Bajando ${d} de ${t}…`))
  downloading.value = ''
  await syncNow()
  show(n ? `Listo: ${n} archivo${n > 1 ? 's' : ''} guardado${n > 1 ? 's' : ''} en el celular` : 'Ya estaba todo guardado en el celular', 'ok')
}

const storageInfo = ref('')
onMounted(async () => {
  const est = await navigator.storage?.estimate?.()
  const persisted = await navigator.storage?.persisted?.()
  if (est?.usage !== undefined) storageInfo.value = `${(est.usage / 1024 / 1024).toFixed(1)} MB guardados${persisted ? ' · protegidos' : ''}`
})

const failed = ref<{ seq?: number; table: string; lastError?: string; failedAt: string }[]>([])
async function loadFailed() {
  failed.value = (await getDb().failed.reverse().limit(10).toArray()) as any
}
async function clearFailed() {
  await getDb().failed.clear()
  failed.value = []
}

async function switchPerson() {
  if (!(await canSwitch())) {
    show('Todavía hay cambios sin mandar. Conectate un momento y probá de nuevo.', 'warn')
    return
  }
  await signOut()
  router.push('/entrar')
}

const isStandalone = ref(false)
onMounted(() => {
  isStandalone.value = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
})
const canPrompt = computed(() => !!(nuxtApp.$pwa as any)?.showInstallPrompt)
function install() {
  ;(nuxtApp.$pwa as any)?.install?.()
}
</script>

<template>
  <div class="space-y-5">
    <PageHeader title="Más" sticker="star" />

    <!-- Perfil -->
    <section v-if="me" class="card tape">
      <div class="flex items-center gap-3">
        <MemberAvatar :member="me" :size="56" />
        <div>
          <p class="text-[18px] font-extrabold">{{ me.name }}</p>
          <p class="text-[14px] text-ink-soft">Tu avatar se ve en gastos, votos y diario.</p>
        </div>
      </div>
      <p class="field-label mt-4">Emoji</p>
      <div class="flex flex-wrap gap-1.5">
        <button type="button" class="chip px-3" :aria-pressed="!me.emoji" @click="setEmoji(null)">Iniciales</button>
        <button v-for="e in EMOJIS" :key="e" type="button" class="pick grid h-11 w-11 place-items-center p-0 text-[22px]" :aria-label="`Usar ${e}`" :aria-pressed="me.emoji === e" @click="setEmoji(e)">{{ e }}</button>
      </div>
      <p class="field-label mt-4">Color</p>
      <div class="flex flex-wrap gap-2">
        <button v-for="c in COLORS" :key="c" type="button" class="h-11 w-11 rounded-full" :class="me.color === c ? 'shadow-[0_0_0_3px_#fff,0_0_0_5px_var(--color-ink)]' : 'shadow-[0_0_0_3px_#fff]'" :style="{ background: c }" :aria-label="`Color ${c}`" :aria-pressed="me.color === c" @click="setColor(c)" />
      </div>
    </section>

    <!-- Secciones -->
    <nav class="card divide-y divide-dashed divide-line p-0" aria-label="Más secciones">
      <NuxtLink v-for="l in [
        { to: '/diario', label: 'Diario del viaje', e: '📔' },
        { to: '/listas', label: 'Valija y listas', e: '🧳' },
        { to: '/info', label: 'Info útil por país', e: '🧭' },
        { to: '/alojamientos', label: 'Alojamientos', e: '🛏️' },
        { to: '/traslados', label: 'Traslados', e: '✈️' },
        { to: '/wrapped', label: 'Wrapped del viaje', e: '✨' },
      ]" :key="l.to" :to="l.to" class="flex min-h-13 items-center gap-3 px-4 py-3 text-[16px] font-bold">
        <span aria-hidden="true" class="text-[20px]">{{ l.e }}</span>
        <span class="flex-1">{{ l.label }}</span>
        <NavIcon name="chevron" :size="18" />
      </NuxtLink>
    </nav>

    <!-- Offline -->
    <section class="card">
      <h2>Sin conexión</h2>
      <p class="mt-1 text-[15px] text-ink-soft">
        Todo el viaje queda guardado en el celular. Con wifi, bajá también los pasajes y fotos para tenerlos sin señal.
      </p>
      <button type="button" class="btn btn-primary btn-block mt-3" :disabled="!!downloading" @click="downloadAll">
        <NavIcon name="download" :size="20" /> {{ downloading || 'Bajar todo para usar sin conexión' }}
      </button>
      <dl class="mt-3 space-y-1 text-[14px]">
        <div class="flex justify-between"><dt class="text-ink-soft">Estado</dt><dd class="font-bold">{{ state.online ? 'Con conexión' : 'Sin señal' }}</dd></div>
        <div class="flex justify-between"><dt class="text-ink-soft">Cambios sin mandar</dt><dd class="font-bold">{{ state.pending }}</dd></div>
        <div class="flex justify-between"><dt class="text-ink-soft">Última sincronización</dt><dd class="font-bold">{{ state.lastSync ? new Date(state.lastSync).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' }}</dd></div>
        <div v-if="storageInfo" class="flex justify-between"><dt class="text-ink-soft">En el celular</dt><dd class="font-bold">{{ storageInfo }}</dd></div>
      </dl>
      <button type="button" class="btn btn-ghost mt-2 px-0" @click="syncNow">Sincronizar ahora</button>
      <div v-if="state.failed">
        <button type="button" class="btn btn-ghost px-0 text-bad" @click="loadFailed">{{ state.failed }} cambio{{ state.failed > 1 ? 's' : '' }} rechazado{{ state.failed > 1 ? 's' : '' }}: ver</button>
        <ul v-if="failed.length" class="mt-1 space-y-1 text-[14px]">
          <li v-for="f in failed" :key="f.seq" class="rounded-lg bg-bad-soft p-2">{{ f.table }}: {{ f.lastError }}</li>
        </ul>
        <button v-if="failed.length" type="button" class="btn btn-ghost px-0" @click="clearFailed">Limpiar</button>
      </div>
    </section>

    <!-- Instalar -->
    <section v-if="!isStandalone" class="card">
      <h2>Instalar la app</h2>
      <p class="mt-1 text-[15px]"><strong>iPhone (Safari):</strong> botón Compartir → “Agregar a inicio”.</p>
      <p class="mt-1 text-[14px] text-ink-soft">Instalada, el celular no borra los datos guardados y abre a pantalla completa.</p>
      <button v-if="canPrompt" type="button" class="btn btn-secondary btn-block mt-3" @click="install">Instalar ahora</button>
    </section>

    <section class="card">
      <h2>Este celular</h2>
      <button type="button" class="btn btn-secondary btn-block mt-3" @click="switchPerson">Cambiar de persona</button>
    </section>
  </div>
</template>
