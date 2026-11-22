<script setup lang="ts">
import type { Transport } from '#shared/types/domain'
import { formatCountdown } from '#shared/time/trip'
import { formatDayShort, formatTime, localParts, utcLabel } from '#shared/time/tz'

const props = defineProps<{ t: Transport; countdown?: boolean; compact?: boolean }>()
const { placeById, memberById } = useTripData()
const { now } = useNow()

const depart = computed(() => (props.t.depart_at ? new Date(props.t.depart_at) : null))
const arrive = computed(() => (props.t.arrive_at ? new Date(props.t.arrive_at) : null))
const leave = computed(() => leaveTime(props.t, placeById.value))
const missing = computed(() => transportMissing(props.t))
const buyer = computed(() => (props.t.purchased_by ? memberById.value.get(props.t.purchased_by) : null))

function when(d: Date, tz: string | null) {
  const zone = tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  return { date: formatDayShort(localParts(d, zone).date), time: formatTime(d, zone), utc: utcLabel(d, zone) }
}
</script>

<template>
  <NuxtLink :to="`/traslados/${t.id}`" class="card block" :class="compact ? 'p-3' : ''">
    <div class="flex items-start gap-3">
      <span class="icon-bubble bg-violet-soft">
        <NavIcon :name="KIND_ICON[t.kind] ?? 'map'" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center gap-x-2 text-[13px] font-bold uppercase tracking-wide text-ink-soft">
          <span>{{ KIND_LABEL[t.kind] }}<template v-if="t.code"> · {{ t.code }}</template></span>
          <span v-if="t.status === 'pending'" class="badge badge-pending normal-case tracking-normal">Pendiente</span>
        </div>
        <div class="text-[16px] font-extrabold leading-snug">{{ transportTitle(t) }}</div>

        <div v-if="depart" class="mt-1.5 grid grid-cols-2 gap-2 text-[14px]">
          <div>
            <div class="text-ink-soft">Sale · {{ when(depart, t.depart_tz).date }}</div>
            <div class="font-extrabold tabular">{{ when(depart, t.depart_tz).time }} <span class="text-[12px] font-bold text-ink-soft">{{ when(depart, t.depart_tz).utc }}</span></div>
          </div>
          <div>
            <div class="text-ink-soft">Llega<template v-if="arrive"> · {{ when(arrive, t.arrive_tz).date }}</template></div>
            <div v-if="arrive" class="font-extrabold tabular">{{ when(arrive, t.arrive_tz).time }} <span class="text-[12px] font-bold text-ink-soft">{{ when(arrive, t.arrive_tz).utc }}</span></div>
            <div v-else class="font-bold text-warn">Pendiente</div>
          </div>
        </div>

        <div v-if="countdown && depart && depart > now" class="mt-2 rounded-xl bg-primary-soft px-3 py-2 text-[15px]">
          Sale en <strong class="tabular">{{ formatCountdown(depart.getTime() - now.getTime()) }}</strong>
          <template v-if="leave && leave > now">
            · salí a las <strong class="tabular">{{ formatTime(leave, t.depart_tz ?? 'UTC') }}</strong>
          </template>
          <template v-else-if="leave"> · <strong>¡ya hay que salir!</strong></template>
        </div>
        <p v-if="!compact && missing.length && t.depart_at" class="mt-1.5 text-[13px] font-bold text-warn">{{ missing.join(' · ') }}</p>
        <p v-if="!compact && buyer" class="mt-1 text-[13px] text-ink-soft">Lo compró {{ buyer.name }}</p>
      </div>
    </div>
  </NuxtLink>
</template>
