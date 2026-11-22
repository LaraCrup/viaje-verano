-- =====================================================================
-- V2: votaciones, listas (valija / documentos / grupo), info por país y diario
-- =====================================================================

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  question text not null check (length(question) between 1 and 200),
  chapter_id uuid references public.chapters (id),
  multiple boolean not null default false,
  closes_at timestamptz,
  closed boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  poll_id uuid not null references public.polls (id) on delete cascade,
  label text not null check (length(label) between 1 and 120),
  plan_id uuid references public.plans (id),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

-- Un voto por persona y votación (el id lo arma la app a partir de poll + persona).
create table public.poll_votes (
  id uuid primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  poll_id uuid not null references public.polls (id) on delete cascade,
  member_id uuid not null references public.members (id),
  option_ids jsonb not null default '[]'::jsonb check (jsonb_typeof(option_ids) = 'array'),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1,
  unique (poll_id, member_id)
);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  list text not null check (list in ('valija', 'documentos', 'grupo')),
  -- valija/documentos: de quién es la lista. grupo: quién lo lleva (null = nadie todavía).
  owner_member_id uuid references public.members (id),
  text text not null check (length(text) between 1 and 200),
  done boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

create table public.country_info (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  country text not null,            -- IL, ES, FR, IT
  section text not null,            -- emergencias, consulado, transporte, propinas, enchufes, frases, shabat
  title text not null,
  body text not null default '',
  needs_check boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

-- Diario: member_id null = la foto y la frase del día (del grupo);
-- member_id = "el momento del día" de cada una.
create table public.journal_entries (
  id uuid primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  date date not null,
  member_id uuid references public.members (id),
  text text,
  photo_path text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1,
  unique nulls not distinct (trip_id, date, member_id)
);

do $$
declare
  t text;
begin
  foreach t in array array['polls', 'poll_options', 'poll_votes', 'checklist_items', 'country_info', 'journal_entries'] loop
    execute format('create index on public.%I (trip_id, updated_at)', t);
    execute format('create trigger a_sync_meta before insert or update on public.%I
                    for each row execute function private.tg_sync_meta()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "integrantes leen" on public.%I for select to authenticated
                    using (private.is_trip_member(trip_id))', t);
  end loop;
  -- Tablas que cualquiera del viaje puede crear y editar
  foreach t in array array['polls', 'poll_options', 'checklist_items', 'country_info'] loop
    execute format('create policy "integrantes crean" on public.%I for insert to authenticated
                    with check (private.is_trip_member(trip_id))', t);
    execute format('create policy "integrantes editan" on public.%I for update to authenticated
                    using (private.is_trip_member(trip_id)) with check (private.is_trip_member(trip_id))', t);
  end loop;
  foreach t in array array['polls', 'checklist_items', 'country_info', 'journal_entries'] loop
    execute format('create trigger z_activity_log after insert or update on public.%I
                    for each row execute function private.tg_activity_log()', t);
  end loop;
end;
$$;

-- Votos: cada una vota solo por sí misma.
create policy "voto propio: crear" on public.poll_votes for insert to authenticated
  with check (private.is_trip_member(trip_id) and member_id = private.current_member_id(trip_id));
create policy "voto propio: editar" on public.poll_votes for update to authenticated
  using (member_id = private.current_member_id(trip_id))
  with check (member_id = private.current_member_id(trip_id));

-- Diario: la entrada del grupo la edita cualquiera; el "momento" solo su dueña.
create policy "diario: crear" on public.journal_entries for insert to authenticated
  with check (private.is_trip_member(trip_id) and (member_id is null or member_id = private.current_member_id(trip_id)));
create policy "diario: editar" on public.journal_entries for update to authenticated
  using (private.is_trip_member(trip_id) and (member_id is null or member_id = private.current_member_id(trip_id)))
  with check (private.is_trip_member(trip_id) and (member_id is null or member_id = private.current_member_id(trip_id)));

-- Una votación cerrada no acepta votos.
create or replace function private.tg_vote_open()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.polls p
    where p.id = new.poll_id and (p.closed or (p.closes_at is not null and p.closes_at < now()))
  ) then
    raise exception 'La votación ya cerró';
  end if;
  return new;
end;
$$;
create trigger b_vote_open before insert or update on public.poll_votes
  for each row execute function private.tg_vote_open();

alter publication supabase_realtime add table
  public.polls, public.poll_options, public.poll_votes, public.checklist_items, public.country_info, public.journal_entries;
