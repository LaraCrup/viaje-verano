-- Videos de TikTok / Instagram / YouTube con lugares para ir, por etapa del viaje.
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  url text not null check (length(url) between 8 and 600),
  platform text not null default 'otro' check (platform in ('tiktok', 'instagram', 'youtube', 'otro')),
  title text check (title is null or length(title) <= 200),
  chapter_id uuid references public.chapters (id),
  member_id uuid references public.members (id),   -- quién lo subió
  plan_id uuid references public.plans (id),       -- si se pasó a ideas
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

create index on public.videos (trip_id, updated_at);
create trigger a_sync_meta before insert or update on public.videos
  for each row execute function private.tg_sync_meta();
create trigger z_activity_log after insert or update on public.videos
  for each row execute function private.tg_activity_log();

alter table public.videos enable row level security;
create policy "integrantes leen" on public.videos for select to authenticated
  using (private.is_trip_member(trip_id));
create policy "integrantes crean" on public.videos for insert to authenticated
  with check (private.is_trip_member(trip_id));
create policy "integrantes editan" on public.videos for update to authenticated
  using (private.is_trip_member(trip_id)) with check (private.is_trip_member(trip_id));

alter publication supabase_realtime add table public.videos;
