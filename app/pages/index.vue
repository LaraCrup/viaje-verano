<script setup lang="ts">
import { stayForNight, tripPhase } from '#shared/time/trip'
import { formatDayLong, formatTime, TZ } from '#shared/time/tz'

const { data, me, dayByDate, chapterForDate, placeForDate } = useTripData()
const scope = useScope()
const { now, today } = useNow()

const trip = computed(() => data.trip)
// El viaje de cada una va de su primera a su última etapa (Meli termina en Israel, Solcha en Niza)
const span = computed(() => scope.window.value)
const phase = computed(() => (span.value ? tripPhase(today.value, span.value.start, span.value.end) : null))
const day = computed(() => dayByDate.value.get(today.value) ?? null)
const chapter = computed(() => chapterForDate(today.value))
// Antes del viaje: el clima y la hora del primer destino (Buenos Aires); después, el del último.
const place = computed(() => {
  const w = span.value
  if (!w) return null
  const d = today.value < w.start ? w.start : today.value > w.end ? w.end : today.value
  return placeForDate(d)
})
const localTz = computed(() => place.value?.tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone)
const weekday = computed(() => now.value.getDay())

const tonightStay = computed(() => stayForNight(today.value, scope.stays.value))
const nextTransport = computed(() =>
  scope.transports.value.find(t => t.status !== 'cancelled' && t.depart_at && new Date(t.arrive_at ?? t.depart_at) > now.value) ?? null,
)
const todayPlans = computed(() => (day.value ? scope.plans.value.filter(p => p.day_id === day.value!.id) : []))

const { weather } = useWeather(place)
const ready = computed(() => data.loaded && !!data.trip)

/** Primer destino real del viaje (el primer capítulo fuera de casa: Israel, no "Ida"). */
const firstDestination = computed(() => {
  const home = trip.value?.home_tz
  return scope.chapters.value.find(c => {
    const pl = c.place_id ? data.places.find(p => p.id === c.place_id) : null
    return pl && pl.tz !== home
  }) ?? scope.chapters.value[0] ?? null
})

/** "Madrid · a la noche vuelo a Niza" → "a la noche vuelo a Niza" (la ciudad ya está arriba). */
const dayTitle = computed(() => {
  const t = day.value?.title?.trim()
  const name = place.value?.name ?? chapter.value?.name
  if (!t || t === name) return null
  return name && t.startsWith(`${name} · `) ? t.slice(name.length + 3) : t
})

const stickerName = computed(() => ({ Israel: 'wave', Madrid: 'fan', Niza: 'lemon', Roma: 'pizza' } as Record<string, string>)[chapter.value?.name ?? ''] ?? 'plane')

/** Plan en curso (empezó hace menos de 90 min) o el próximo pendiente con hora. */
const nowHm = computed(() => formatTime(now.value, localTz.value))
const focusPlan = computed(() => {
  const [h, m] = nowHm.value.split(':').map(Number)
  const nowMin = h! * 60 + m!
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const p = todayPlans.value.find(p => p.status === 'pending' && p.start_time && toMin(p.start_time) >= nowMin - 90)
  if (!p) return null
  return { id: p.id, label: toMin(p.start_time!) <= nowMin ? 'Ahora' : 'Sigue' }
})
const pendingCount = computed(() => todayPlans.value.filter(p => p.status === 'pending').length)

/** Un traslado que sale en las próximas 24 h va después de los planes de hoy; si falta más, al final. */
const transportSoon = computed(() => {
  const d = nextTransport.value?.depart_at
  return !!d && new Date(d).getTime() - now.value.getTime() < 24 * 3600 * 1000
})

const greeting = computed(() => {
  const h = now.value.getHours()
  return h < 12 ? 'Buen día' : h < 20 ? 'Buenas tardes' : 'Buenas noches'
})
</script>

<template>
  <div v-if="!ready" class="py-16 text-center text-ink-soft">
    <Sticker name="plane" :size="56" animate />
    <p class="mt-3">{{ syncState.online ? 'Bajando el viaje…' : 'Sin señal: este celular todavía no bajó el viaje. Conectate un momento (wifi o datos) y queda guardado para siempre.' }}</p>
  </div>

  <div v-else class="pb-4">
    <!-- 1. Saludo: una sola cosa fuerte (el nombre), el resto es contexto -->
    <header class="flex items-center justify-between gap-3 pt-2">
      <div class="min-w-0">
        <p class="text-[13px] font-semibold text-ink-soft first-letter:uppercase">
          {{ formatDayLong(today) }}<template v-if="phase?.phase === 'during'"> · Día {{ phase.dayNumber }} de {{ phase.totalDays }}</template>
        </p>
        <h1 class="mt-0.5">{{ greeting }}{{ me ? `, ${me.name}` : '' }}</h1>
      </div>
      <NuxtLink to="/mas" aria-label="Mi perfil">
        <MemberAvatar :member="me" :size="40" />
      </NuxtLink>
    </header>

    <!-- 2. Dónde estamos (o cuánto falta) + hora y clima, todo en una tarjeta -->
    <section class="card tape mt-5" :style="{ '--tape': phase?.phase === 'during' ? chapter?.accent : undefined }">
      <div class="flex items-center justify-between gap-3">
        <div class="min-w-0">
          <template v-if="phase?.phase === 'before'">
            <p class="text-[14px] text-ink-soft">Faltan</p>
            <p class="font-display text-[20px] font-extrabold leading-tight text-primary-dark">
              {{ phase.daysLeft }} {{ phase.daysLeft === 1 ? 'día' : 'días' }}
            </p>
            <p class="text-[14px] text-ink-soft">para {{ firstDestination?.name ?? 'el viaje' }}</p>
          </template>
          <template v-else-if="phase?.phase === 'after'">
            <p class="font-display text-[20px] font-extrabold leading-tight">¡Volvimos!</p>
            <p class="text-[14px] text-ink-soft">Revisá que todo esté saldado y mirá el resumen.</p>
          </template>
          <template v-else>
            <p class="font-display text-[20px] font-extrabold leading-tight">{{ place?.name ?? chapter?.name }}</p>
            <p v-if="dayTitle" class="mt-0.5 text-[14px] text-ink-soft first-letter:uppercase">{{ dayTitle }}</p>
          </template>
        </div>
        <Sticker :name="phase?.phase === 'during' ? stickerName : 'plane'" :size="44" :rot="8" />
      </div>

      <!-- La hora local ya la tiene cada una en el celular: acá va la de Buenos Aires, para saber qué hora es allá -->
      <dl class="mt-4 grid grid-cols-2 gap-2 border-t border-dashed border-line pt-3">
        <div>
          <dt class="text-[12px] text-ink-soft">Hora en Buenos Aires</dt>
          <dd class="text-[16px] font-bold tabular">{{ formatTime(now, TZ.BUENOS_AIRES) }}</dd>
        </div>
        <div>
          <dt class="text-[12px] text-ink-soft">Clima<template v-if="place"> en {{ place.name }}</template></dt>
          <template v-if="weather">
            <dd class="text-[16px] font-bold tabular" :title="weatherInfo(weather.current.code).label">
              {{ weatherInfo(weather.current.code).emoji }} {{ weather.current.temp }}°
              <span v-if="weather.daily[0]" class="text-[12px] font-normal text-ink-soft">{{ weather.daily[0].min }}° / {{ weather.daily[0].max }}°</span>
            </dd>
          </template>
          <dd v-else class="text-[13px] text-ink-soft">Sin datos todavía</dd>
        </div>
      </dl>

      <div v-if="phase?.phase === 'after'" class="mt-4 flex gap-2">
        <NuxtLink to="/gastos/balances" class="btn btn-secondary flex-1">Balances</NuxtLink>
        <NuxtLink to="/wrapped" class="btn btn-primary flex-1">Wrapped ✨</NuxtLink>
      </div>
    </section>

    <!-- Shabat (Israel, viernes y sábado) -->
    <NuxtLink
      v-if="phase?.phase === 'during' && place?.country === 'IL' && [5, 6].includes(weekday)"
      to="/info"
      class="mt-3 flex gap-3 rounded-[var(--radius-card)] bg-violet-soft p-4"
    >
      <span class="text-[20px] leading-none" aria-hidden="true">🕯️</span>
      <span>
        <span class="block font-bold">Es Shabat {{ weekday === 5 ? 'desde esta tarde' : 'hasta esta noche' }}</span>
        <span class="block text-[14px] text-ink-soft">Poco transporte y muchos comercios cerrados. Planificá traslados y compras.</span>
      </span>
    </NuxtLink>

    <!-- 3. Gastos: tu balance + cargar uno, juntos -->
    <section class="card mt-3 flex items-center gap-3 p-3 pl-4">
      <NuxtLink v-if="me" to="/gastos/balances" class="min-w-0 flex-1">
        <p class="text-[12px] text-ink-soft">Tu balance</p>
        <MyBalances :member-id="me.id" />
      </NuxtLink>
      <NuxtLink to="/gastos/nuevo" class="btn btn-primary shrink-0" :class="me ? '' : 'flex-1'">
        <NavIcon name="plus" :size="20" /> Gasto
      </NuxtLink>
    </section>

    <!-- 4. Planes de hoy -->
    <section v-if="phase?.phase === 'during'">
      <div class="section-title justify-between">
        <h2 class="flex items-center gap-2"><NavIcon name="star" :size="18" /> Hoy</h2>
        <NuxtLink :to="`/itinerario/${today}`" class="font-sans text-[14px] font-semibold text-primary-dark">Ver el día</NuxtLink>
      </div>
      <NuxtLink :to="`/itinerario/${today}`" class="card block py-2">
        <p v-if="!todayPlans.length" class="py-2 text-[15px] text-ink-soft">Nada cargado para hoy. Tocá para agregar planes.</p>
        <ul v-else class="divide-y divide-line/70">
          <li
            v-for="p in todayPlans"
            :key="p.id"
            class="flex gap-3 py-2.5"
            :class="p.status !== 'pending' ? 'text-ink-soft' : ''"
          >
            <span class="w-11 shrink-0 pt-px text-[14px] tabular" :class="focusPlan?.id === p.id ? 'font-bold text-primary-dark' : 'text-ink-soft'">{{ p.start_time ?? '—' }}</span>
            <span class="min-w-0 flex-1">
              <span class="flex items-start justify-between gap-2">
                <span
                  class="text-[15px]"
                  :class="p.status !== 'pending' ? 'line-through decoration-ink-soft/50' : focusPlan?.id === p.id ? 'font-bold' : 'font-semibold'"
                >{{ p.title }}</span>
                <span v-if="focusPlan?.id === p.id" class="badge shrink-0 bg-primary-soft text-primary-dark">{{ focusPlan.label }}</span>
                <NavIcon v-else-if="p.status === 'done'" name="check" :size="16" class="mt-0.5 shrink-0" />
              </span>
              <span v-if="p.notes && p.status === 'pending'" class="block text-[13px] text-ink-soft">{{ p.notes }}</span>
            </span>
          </li>
        </ul>
      </NuxtLink>
      <p v-if="todayPlans.length" class="mt-1.5 px-1 text-[13px] text-ink-soft">
        {{ pendingCount ? `${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'} de ${todayPlans.length}` : '¡Todo hecho por hoy! 🎉' }}
      </p>
    </section>

    <!-- 4b. Traslado de hoy (sale en menos de 24 h) -->
    <section v-if="nextTransport && transportSoon">
      <h2 class="section-title"><NavIcon :name="KIND_ICON[nextTransport.kind] ?? 'plane'" :size="18" /> Hoy viajamos</h2>
      <TransportCard :t="nextTransport" countdown />
    </section>

    <!-- 5. Esta noche -->
    <section v-if="phase?.phase === 'during'">
      <h2 class="section-title"><NavIcon name="bed" :size="18" /> Esta noche</h2>
      <div v-if="day?.night_override" class="card text-[15px] font-semibold">{{ day.night_override }}</div>
      <div v-else-if="tonightStay" class="card">
        <NuxtLink :to="`/alojamientos/${tonightStay.id}`" class="block">
          <p class="text-[16px] font-bold">{{ tonightStay.name }}</p>
          <p v-if="tonightStay.address" class="text-[14px] text-ink-soft">{{ tonightStay.address }}</p>
          <p v-else class="text-[14px] font-semibold text-warn">Falta cargar la dirección</p>
          <p v-if="tonightStay.check_in_date === today && tonightStay.check_in_time" class="mt-1 text-[13px] text-ink-soft">
            Check-in desde las <span class="font-semibold text-ink">{{ tonightStay.check_in_time }}</span>
          </p>
        </NuxtLink>
        <div class="mt-3 flex gap-2">
          <a
            :href="stayMapsUrl(tonightStay)"
            target="_blank"
            rel="noopener"
            class="btn btn-secondary min-h-11 flex-1 text-[14px]"
          ><NavIcon name="pin" :size="18" /> Cómo llegar</a>
          <NuxtLink :to="`/alojamientos/${tonightStay.id}`" class="btn btn-secondary min-h-11 flex-1 text-[14px]">Wifi y códigos</NuxtLink>
        </div>
      </div>
      <div v-else class="card">
        <p class="font-semibold text-warn">Todavía no hay alojamiento cargado para esta noche.</p>
        <NuxtLink to="/alojamientos" class="link mt-1 inline-block text-[14px]">Ver alojamientos</NuxtLink>
      </div>
    </section>

    <!-- 6. Próximo traslado (si falta más de un día) -->
    <section v-if="nextTransport && !transportSoon">
      <h2 class="section-title"><NavIcon :name="KIND_ICON[nextTransport.kind] ?? 'plane'" :size="18" /> Próximo traslado</h2>
      <TransportCard :t="nextTransport" countdown />
    </section>
  </div>
</template>

