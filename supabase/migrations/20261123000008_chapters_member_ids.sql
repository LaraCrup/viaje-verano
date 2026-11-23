-- Quiénes van a cada etapa del viaje. null = todas.
-- La app oculta a cada una las etapas donde no está y divide los gastos solo entre las que van.
alter table public.chapters add column if not exists member_ids uuid[];
