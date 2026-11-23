<script setup lang="ts">
import type { Transport } from '#shared/types/domain'
import { formatCountdown } from '#shared/time/trip'
import { formatDayShort, formatTime, localParts, utcLabel } from '#shared/time/tz'

const props = defineProps<{ t: Transport; countdown?: boolean; compact?: boolean }>()
const { placeById, memberById } = useTripData()
const { now } = useNow()

const depart = computed(() => (props.t.depart_at ? new Date(props.t.depart_at) : null))
const arrive = computed(() => (props.t.arrive_at ? new Date(props.t.arrive_at) : null))
const beThere = computed(() => beThereTime(props.t, placeById.value)?.at ?? null)
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
        <div class="eyebrow flex flex-wrap items-center gap-x-2">
          <span>{{ KIND_LABEL[t.kind] }}<template v-if="t.code"> · {{ t.code }}</template></span>
          <span v-if="t.status === 'pending'" class="badge badge-pending normal-case tracking-normal">Pendiente</span>
        </div>
        <div class="text-[16px] font-bold leading-snug">{{ transportTitle(t) }}</div>

        <div v-if="depart" class="mt-2 grid grid-cols-2 gap-2">
          <div>
            <div class="text-[13px] text-ink-soft">Sale · {{ when(depart, t.depart_tz).date }}</div>
            <div class="text-[15px] font-bold tabular">{{ when(depart, t.depart_tz).time }} <span class="text-[12px] font-normal text-ink-soft">{{ when(depart, t.depart_tz).utc }}</span></div>
          </div>
          <div>
            <div class="text-[13px] text-ink-soft">Llega<template v-if="arrive"> · {{ when(arrive, t.arrive_tz).date }}</template></div>
            <div v-if="arrive" class="text-[15px] font-bold tabular">{{ when(arrive, t.arrive_tz).time }} <span class="text-[12px] font-normal text-ink-soft">{{ when(arrive, t.arrive_tz).utc }}</span></div>
            <div v-else class="text-[14px] font-semibold text-warn">Pendiente</div>
          </div>
        </div>

        <div v-if="countdown && depart && depart > now" class="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-primary-soft px-3 py-2">
          <div v-if="beThere">
            <div class="text-[12px] text-primary-dark">Estar a las</div>
            <div class="text-[16px] font-bold tabular text-primary-dark">{{ formatTime(beThere, t.depart_tz ?? 'UTC') }}</div>
          </div>
          <div :class="beThere ? '' : 'col-span-2'">
            <div class="text-[12px] text-primary-dark">{{ KIND_LABEL[t.kind] ?? 'Sale' }} sale en</div>
            <div class="text-[15px] font-semibold tabular">{{ formatCountdown(depart.getTime() - now.getTime()) }}</div>
          </div>
        </div>
        <p v-if="!compact && missing.length && t.depart_at" class="mt-1.5 text-[13px] font-semibold text-warn">{{ missing.join(' · ') }}</p>
        <p v-if="!compact && buyer" class="mt-1 text-[13px] text-ink-soft">Lo compró {{ buyer.name }}</p>
      </div>
    </div>
  </NuxtLink>
</template>
