<script setup lang="ts">
import { formatMoney } from '#shared/money/currency'
import { stayForNight, tripPhase } from '#shared/time/trip'
import { formatDayLong, formatTime, TZ } from '#shared/time/tz'

const { data, me, base, dayByDate, chapterForDate, placeForDate } = useTripData()
const { now, today } = useNow()
const { inBase } = useLedger()

const trip = computed(() => data.trip)
const phase = computed(() => (trip.value ? tripPhase(today.value, trip.value.start_date, trip.value.end_date) : null))
const day = computed(() => dayByDate.value.get(today.value) ?? null)
const chapter = computed(() => chapterForDate(today.value))
// Antes del viaje: el clima y la hora del primer destino (Buenos Aires); después, el del último.
const place = computed(() => {
  const t = trip.value
  if (!t) return null
  const d = today.value < t.start_date ? t.start_date : today.value > t.end_date ? t.end_date : today.value
  return placeForDate(d)
})
const localTz = computed(() => place.value?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone)

const tonightStay = computed(() => stayForNight(today.value, data.stays))
const nextTransport = computed(() =>
  data.transports.find(t => t.status !== 'cancelled' && t.depart_at && new Date(t.arrive_at ?? t.depart_at) > now.value) ?? null,
)
const todayPlans = computed(() => (day.value ? data.plans.filter(p => p.day_id === day.value!.id) : []))

const { weather } = useWeather(place)
const myBalance = computed(() => (me.value ? inBase.value[me.value.id] ?? 0 : 0))

/** Primer destino real del viaje (el primer capítulo fuera de casa: Israel, no "Ida"). */
const firstDestination = computed(() => {
  const home = trip.value?.home_tz
  return data.chapters.find(c => {
    const pl = c.place_id ? data.places.find(p => p.id === c.place_id) : null
    return pl && pl.tz !== home
  }) ?? data.chapters[0] ?? null
})

const greeting = computed(() => {
  const h = now.value.getHours()
  return h < 12 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
})
</script>

<template>
  <div v-if="!data.loaded || !trip" class="py-16 text-center text-ink-soft">
    <Sticker name="plane" :size="56" animate />
    <p class="mt-3">{{ syncState.online ? 'Bajando el viaje…' : 'Sin señal: este celular todavía no bajó el viaje. Conectate un momento (wifi o datos) y queda guardado para siempre.' }}</p>
  </div>

  <div v-else class="space-y-4">
    <header class="flex items-center justify-between gap-3 pt-1">
      <div class="min-w-0">
        <h1>{{ greeting }}{{ me ? `, ${me.name}` : '' }}</h1>
        <p v-if="phase?.phase === 'during'" class="mt-0.5 text-[14px] font-bold text-ink-soft">
          Día {{ phase.dayNumber }} de {{ phase.totalDays }}<template v-if="chapter"> · {{ chapter.name }}</template>
        </p>
        <p v-else-if="phase?.phase === 'after'" class="mt-0.5 text-[14px] font-bold text-ink-soft">¡Volvimos!</p>
      </div>
      <NuxtLink to="/mas" aria-label="Mi perfil">
        <MemberAvatar :member="me" :size="44" />
      </NuxtLink>
    </header>

    <!-- Antes del viaje: cuenta regresiva -->
    <section v-if="phase?.phase === 'before'" class="card tape relative text-center">
      <Sticker name="plane" :size="48" :rot="-14" class="absolute left-3 top-3" />
      <Sticker name="sun" :size="40" :rot="8" class="absolute right-3 top-4" />
      <p class="text-[15px] font-bold text-ink-soft">Faltan</p>
      <p class="font-display text-[20px] font-extrabold text-primary-dark">
        {{ phase.daysLeft }} {{ phase.daysLeft === 1 ? 'día' : 'días' }}
      </p>
      <p class="text-[15px] text-ink-soft">para {{ firstDestination?.name ?? 'el viaje' }}</p>
    </section>

    <!-- Durante: ciudad, hora y clima -->
    <section v-if="phase?.phase === 'during'" class="card tape" :style="{ '--tape': chapter?.accent }">
      <div class="flex items-center justify-between gap-3">
        <div>
          <p class="text-[13px] font-bold uppercase tracking-wide text-ink-soft">{{ formatDayLong(today) }}</p>
          <p class="text-[18px] font-extrabold">{{ place?.name ?? chapter?.name }}</p>
          <p v-if="day?.title && day.title !== place?.name" class="text-[15px] text-ink-soft">{{ day.title }}</p>
        </div>
        <Sticker :name="chapter?.name === 'Israel' ? 'wave' : chapter?.name === 'Madrid' ? 'fan' : chapter?.name === 'Niza' ? 'lemon' : chapter?.name === 'Roma' ? 'pizza' : 'plane'" :size="52" :rot="8" />
      </div>
    </section>

    <!-- Hora local y Buenos Aires + clima -->
    <section class="grid grid-cols-2 gap-3">
      <div class="card p-3">
        <p class="text-[13px] font-bold text-ink-soft">Hora {{ phase?.phase === 'during' ? 'acá' : 'local' }}</p>
        <p class="text-[20px] font-extrabold tabular">{{ formatTime(now, localTz) }}</p>
        <p class="mt-1 text-[13px] font-bold text-ink-soft">Buenos Aires</p>
        <p class="text-[16px] font-bold tabular">{{ formatTime(now, TZ.BUENOS_AIRES) }}</p>
      </div>
      <div class="card p-3">
        <p class="text-[13px] font-bold text-ink-soft">Clima {{ place ? `en ${place.name}` : '' }}</p>
        <template v-if="weather">
          <p class="text-[20px] font-extrabold tabular">
            {{ weatherInfo(weather.current.code).emoji }} {{ weather.current.temp }}°
          </p>
          <p class="text-[13px] text-ink-soft">{{ weatherInfo(weather.current.code).label }}</p>
          <p v-if="weather.daily[0]" class="text-[13px] text-ink-soft tabular">{{ weather.daily[0].min }}° / {{ weather.daily[0].max }}°</p>
        </template>
        <p v-else class="mt-1 text-[14px] text-ink-soft">Sin datos (se actualiza con señal)</p>
      </div>
    </section>

    <!-- Shabat (Israel, viernes y sábado) -->
    <NuxtLink
      v-if="phase?.phase === 'during' && place?.country === 'IL' && [5, 6].includes(now.getDay())"
      to="/info"
      class="card block border-2 border-lavender"
    >
      <p class="font-extrabold">🕯️ Es Shabat {{ now.getDay() === 5 ? 'desde esta tarde' : 'hasta esta noche' }}</p>
      <p class="text-[14px] text-ink-soft">Poco transporte público y muchos comercios cerrados. Planificá traslados y compras. ⚠️ Verificá horarios.</p>
    </NuxtLink>

    <!-- Atajo gasto -->
    <NuxtLink to="/gastos/nuevo" class="btn btn-primary btn-block btn-big text-[18px]">
      <NavIcon name="plus" /> Gasto
    </NuxtLink>

    <!-- Mi balance -->
    <NuxtLink v-if="me" to="/gastos/balances" class="card flex items-center justify-between gap-3">
      <div>
        <p class="text-[13px] font-bold text-ink-soft">Tu balance</p>
        <p class="text-[18px] font-extrabold tabular" :class="myBalance > 0 ? 'text-ok' : myBalance < 0 ? 'text-bad' : ''">
          <template v-if="myBalance > 0">Te deben {{ formatMoney(myBalance, base) }}</template>
          <template v-else-if="myBalance < 0">Debés {{ formatMoney(-myBalance, base) }}</template>
          <template v-else>Estás al día ✨</template>
        </p>
      </div>
      <NavIcon name="chevron" />
    </NuxtLink>

    <!-- Próximo traslado -->
    <section v-if="nextTransport">
      <h2 class="section-title"><NavIcon :name="KIND_ICON[nextTransport.kind] ?? 'plane'" :size="20" /> Próximo traslado</h2>
      <TransportCard :t="nextTransport" countdown />
    </section>

    <!-- Esta noche -->
    <section v-if="phase?.phase === 'during'">
      <h2 class="section-title"><NavIcon name="bed" :size="20" /> Esta noche dormimos</h2>
      <div v-if="day?.night_override" class="card text-[16px] font-bold">{{ day.night_override }}</div>
      <div v-else-if="tonightStay" class="card">
        <NuxtLink :to="`/alojamientos/${tonightStay.id}`" class="text-[17px] font-extrabold underline-offset-2 hover:underline">{{ tonightStay.name }}</NuxtLink>
        <p v-if="tonightStay.address" class="text-[15px] text-ink-soft">{{ tonightStay.address }}</p>
        <p v-else class="text-[14px] font-bold text-warn">Falta cargar la dirección</p>
        <p v-if="tonightStay.check_in_date === today && tonightStay.check_in_time" class="mt-1 text-[14px]">Check-in desde las {{ tonightStay.check_in_time }}</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <a
            :href="mapsUrl({ query: tonightStay.address || tonightStay.name, lat: tonightStay.lat, lon: tonightStay.lon })"
            target="_blank"
            rel="noopener"
            class="btn btn-secondary flex-1"
          ><NavIcon name="pin" :size="20" /> Cómo llegar</a>
          <NuxtLink :to="`/alojamientos/${tonightStay.id}`" class="btn btn-secondary flex-1">Wifi y códigos</NuxtLink>
        </div>
      </div>
      <div v-else class="card">
        <p class="font-bold text-warn">Todavía no hay alojamiento cargado para esta noche.</p>
        <NuxtLink to="/alojamientos" class="link mt-1 inline-block text-[15px]">Ver alojamientos</NuxtLink>
      </div>
    </section>

    <!-- Planes de hoy -->
    <section v-if="phase?.phase === 'during'">
      <h2 class="section-title"><NavIcon name="star" :size="20" /> Hoy</h2>
      <NuxtLink :to="`/itinerario/${today}`" class="card block">
        <p v-if="!todayPlans.length" class="text-[15px] text-ink-soft">Nada cargado para hoy. Tocá para agregar planes.</p>
        <ul v-else class="space-y-1.5">
          <li v-for="p in todayPlans" :key="p.id" class="flex items-center gap-2 text-[15px]">
            <span class="tabular font-bold text-ink-soft">{{ p.start_time ?? '•' }}</span>
            <span :class="p.status === 'done' ? 'line-through opacity-60' : 'font-semibold'">{{ p.title }}</span>
          </li>
        </ul>
      </NuxtLink>
    </section>


    <section v-if="phase?.phase === 'after'" class="card tape text-center">
      <p class="text-[15px]">El viaje terminó. Revisá que todo esté saldado y mirá el resumen.</p>
      <div class="mt-3 flex gap-2">
        <NuxtLink to="/gastos/balances" class="btn btn-secondary flex-1">Balances</NuxtLink>
        <NuxtLink to="/wrapped" class="btn btn-primary flex-1">Wrapped ✨</NuxtLink>
      </div>
    </section>

    <p class="pb-2 text-center text-[13px] text-ink-soft">
      <NuxtLink to="/mas" class="underline">Más opciones</NuxtLink>
    </p>
  </div>
</template>
