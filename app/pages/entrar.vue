<script setup lang="ts">
import type { PublicMember } from '~/composables/useSession'

definePageMeta({ layout: 'bare' })

const router = useRouter()
const { session, fetchPublicTrip, joinWithPin, canSwitch } = useSession()

const trip = ref<{ name: string; members: PublicMember[] } | null>(null)
const selected = ref<PublicMember | null>(null)
const pin = ref('')
const error = ref('')
const busy = ref(false)
const welcome = ref<PublicMember | null>(null)
const switching = ref(false)

const currentName = computed(() => trip.value?.members.find(m => m.id === session.value?.memberId)?.name)

onMounted(async () => {
  trip.value = await fetchPublicTrip()
})

async function submitPin() {
  if (!selected.value) return
  busy.value = true
  error.value = ''
  const err = await joinWithPin(selected.value.id, pin.value)
  busy.value = false
  if (err) {
    error.value = err
    pin.value = ''
    return
  }
  showWelcome()
}

function showWelcome() {
  trip.value ??= { name: '', members: [] }
  welcome.value = trip.value.members.find(m => m.id === session.value?.memberId) ?? { id: '', name: '', color: '#c62e65', emoji: null }
}

async function startSwitch() {
  if (!(await canSwitch())) {
    error.value = 'Todavía hay cambios sin mandar desde este celular. Conectate un momento para que se manden y después cambiá de persona.'
    return
  }
  switching.value = true
}

function go() {
  router.replace('/')
}
</script>

<template>
  <div class="flex min-h-[90dvh] flex-col">
    <!-- Los stickers van a los costados, nunca encima del título (que puede ocupar dos líneas) -->
    <div class="mb-6 mt-4 flex items-center gap-2">
      <Sticker name="plane" :size="48" :rot="-12" class="self-start" />
      <div class="min-w-0 flex-1 text-center">
        <p class="text-[14px] font-bold uppercase tracking-wider text-ink-soft">21/12 → 14/01</p>
        <h1 class="mt-1 text-[20px] [text-wrap:balance]">{{ (trip?.name || 'Nuestro viaje').replace(/ · /g, ' · ') }}</h1>
      </div>
      <Sticker name="star" :size="40" :rot="14" class="self-end" />
    </div>

    <!-- Bienvenida -->
    <div v-if="welcome" class="card tape rise mt-4 text-center">
      <div class="mx-auto mb-3 w-fit sticker-in" style="--rot: -6deg">
        <MemberAvatar :member="(welcome as any)" :size="80" />
      </div>
      <h2>¡Hola{{ welcome.name ? `, ${welcome.name}` : '' }}!</h2>
      <p class="mt-2 text-[15px] text-ink-soft">
        Ya quedó guardado en este celular: la próxima vez entrás directo, aunque no tengas señal.
      </p>
      <p class="mt-2 text-[15px] text-ink-soft">
        Tip: agregá la app a la pantalla de inicio (en iPhone: Compartir → “Agregar a inicio”).
      </p>
      <button type="button" class="btn btn-primary btn-block btn-big mt-4" @click="go">Empezar</button>
    </div>

    <!-- Ya tiene sesión -->
    <div v-else-if="session && !switching" class="card tape mt-4">
      <p class="text-[15px]">Estás como <strong>{{ currentName ?? 'integrante' }}</strong> en este celular.</p>
      <NuxtLink to="/" class="btn btn-primary btn-block mt-4">Ir a la app</NuxtLink>
      <button type="button" class="btn btn-secondary btn-block mt-3" @click="startSwitch">Cambiar de persona</button>
      <p v-if="error" class="mt-3 rounded-xl bg-bad-soft p-3 text-[15px] font-semibold text-bad" role="alert">{{ error }}</p>
    </div>

    <!-- Nombre + PIN -->
    <form v-else class="card tape mt-2" @submit.prevent="submitPin">
      <h2 class="mb-3">¿Quién sos?</h2>
      <div v-if="!trip" class="text-[15px] text-ink-soft">
        Necesitás conexión para entrar la primera vez. Conectate a wifi o datos y volvé a abrir la app.
      </div>
      <div v-else class="grid grid-cols-2 gap-2">
        <button
          v-for="m in trip.members"
          :key="m.id"
          type="button"
          class="pick min-h-14 rounded-2xl p-2 text-left text-[16px]"
          :aria-pressed="selected?.id === m.id"
          @click="selected = m; error = ''"
        >
          <MemberAvatar :member="(m as any)" :size="38" />
          {{ m.name }}
        </button>
      </div>

      <div v-if="selected" class="mt-5">
        <label for="pin" class="field-label">PIN del grupo</label>
        <input
          id="pin"
          v-model="pin"
          class="input text-center text-[20px] tracking-[0.2em]"
          type="text"
          inputmode="text"
          autocomplete="off"
          autocapitalize="none"
          autocorrect="off"
          spellcheck="false"
          maxlength="40"
          required
        >
        <p class="mt-1.5 text-[13px] text-ink-soft">Distingue mayúsculas de minúsculas.</p>
        <p v-if="error" class="mt-3 rounded-xl bg-bad-soft p-3 text-[15px] font-semibold text-bad" role="alert">{{ error }}</p>
        <button type="submit" class="btn btn-primary btn-block btn-big mt-4" :disabled="busy || pin.length < 4">
          {{ busy ? 'Entrando…' : `Entrar como ${selected.name}` }}
        </button>
      </div>
    </form>
  </div>
</template>
