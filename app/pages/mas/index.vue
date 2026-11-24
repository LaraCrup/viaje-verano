<script setup lang="ts">
import { getDb } from '~/sync/db'
import { prefetchFiles } from '~/sync/files'

const router = useRouter()
const { data, me } = useTripData()
const { state, syncNow } = useSync()
const { canSwitch, signOut } = useSession()
const { show } = useToast()
const nuxtApp = useNuxtApp()

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
  <div>
    <PageHeader title="Más" sticker="star" />

    <!-- Perfil -->
    <section v-if="me" class="card flex items-center gap-3">
      <MemberAvatar :member="me" :size="44" />
      <p class="min-w-0 flex-1 text-[16px] font-bold">{{ me.name }}</p>
      <button type="button" class="min-h-11 shrink-0 px-1 text-[14px] font-semibold text-primary-dark" @click="switchPerson">Cambiar usuario</button>
    </section>

    <!-- Secciones -->
    <nav class="card mt-4 divide-y divide-dashed divide-line p-0" aria-label="Más secciones">
      <NuxtLink v-for="l in [
        { to: '/diario', label: 'Diario del viaje', e: '📔' },
        { to: '/listas', label: 'Valija y listas', e: '🧳' },
        { to: '/info', label: 'Info útil por país', e: '🧭' },
        { to: '/seguros', label: 'Seguro de viaje', e: '🛡️' },
        { to: '/alojamientos', label: 'Alojamientos', e: '🛏️' },
        { to: '/traslados', label: 'Traslados', e: '✈️' },
        { to: '/wrapped', label: 'Wrapped del viaje', e: '✨' },
      ]" :key="l.to" :to="l.to" class="flex min-h-13 items-center gap-3 px-4 py-3 text-[15px] font-semibold">
        <span aria-hidden="true" class="text-[18px]">{{ l.e }}</span>
        <span class="flex-1">{{ l.label }}</span>
        <NavIcon name="chevron" :size="18" class="text-ink-soft" />
      </NuxtLink>
    </nav>

    <!-- Offline -->
    <h2 class="section-title">Sin conexión</h2>
    <section class="card">
      <p class="text-[14px] text-ink-soft">
        Todo el viaje queda guardado en el celular. Con wifi, bajá también los pasajes y fotos para tenerlos sin señal.
      </p>
      <button type="button" class="btn btn-primary btn-block mt-3" :disabled="!!downloading" @click="downloadAll">
        <NavIcon name="download" :size="18" /> {{ downloading || 'Bajar todo para usar sin conexión' }}
      </button>
      <dl class="mt-4 space-y-1 text-[13px]">
        <div class="flex justify-between"><dt class="text-ink-soft">Estado</dt><dd class="font-semibold">{{ state.online ? 'Con conexión' : 'Sin señal' }}</dd></div>
        <div class="flex justify-between"><dt class="text-ink-soft">Cambios sin mandar</dt><dd class="font-semibold">{{ state.pending }}</dd></div>
        <div class="flex justify-between"><dt class="text-ink-soft">Última sincronización</dt><dd class="font-semibold">{{ state.lastSync ? new Date(state.lastSync).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' }}</dd></div>
        <div v-if="storageInfo" class="flex justify-between"><dt class="text-ink-soft">En el celular</dt><dd class="font-semibold">{{ storageInfo }}</dd></div>
      </dl>
      <button type="button" class="mt-1 min-h-11 px-0 text-[14px] font-semibold text-primary-dark" @click="syncNow">Sincronizar ahora</button>
      <div v-if="state.failed">
        <button type="button" class="btn btn-ghost px-0 text-bad" @click="loadFailed">{{ state.failed }} cambio{{ state.failed > 1 ? 's' : '' }} rechazado{{ state.failed > 1 ? 's' : '' }}: ver</button>
        <ul v-if="failed.length" class="mt-1 space-y-1 text-[14px]">
          <li v-for="f in failed" :key="f.seq" class="rounded-lg bg-bad-soft p-2">{{ f.table }}: {{ f.lastError }}</li>
        </ul>
        <button v-if="failed.length" type="button" class="btn btn-ghost px-0" @click="clearFailed">Limpiar</button>
      </div>
    </section>

    <!-- Instalar -->
    <template v-if="!isStandalone">
    <h2 class="section-title">Instalar la app</h2>
    <section class="card">
      <p class="text-[14px]"><span class="font-semibold">iPhone (Safari):</span> botón Compartir → “Agregar a inicio”.</p>
      <p class="mt-1 text-[13px] text-ink-soft">Instalada, el celular no borra los datos guardados y abre a pantalla completa.</p>
      <button v-if="canPrompt" type="button" class="btn btn-secondary btn-block mt-3" @click="install">Instalar ahora</button>
    </section>
    </template>
  </div>
</template>
