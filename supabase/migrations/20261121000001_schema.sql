-- =====================================================================
-- Viaje 2026 · Esquema base
--
-- Convenciones:
-- * Todo cuelga de un viaje (trip_id), aunque hoy haya uno solo.
-- * Montos: enteros en unidades menores (bigint). Nunca floats.
-- * Horarios: timestamptz (UTC) + nombre IANA de la zona del lugar.
-- * Sync offline: cada tabla sincronizable tiene las mismas columnas
--   (updated_at, version, client_updated_at, deleted_at, created_by, updated_by).
--   Los borrados son lógicos (deleted_at) para que lleguen a todos los celulares.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;

-- ---------------------------------------------------------------------
-- Viaje e integrantes
-- ---------------------------------------------------------------------

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  base_currency char(3) not null default 'USD' check (base_currency ~ '^[A-Z]{3}$'),
  home_tz text not null default 'America/Argentina/Buenos_Aires',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- El PIN vive aparte y sin policies: solo lo leen las funciones del servidor.
create table private.trip_secrets (
  trip_id uuid primary key references public.trips (id) on delete cascade,
  pin_hash text
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  emoji text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1,
  unique (trip_id, name)
);

-- Dispositivo (usuario anónimo de Supabase) ↔ integrante.
-- Una integrante puede tener varios dispositivos. Los datos son de la integrante,
-- no del dispositivo: si se pierde la sesión, se vuelve a entrar y no se pierde nada.
create table public.trip_sessions (
  auth_uid uuid not null references auth.users (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  via text not null check (via in ('invite', 'pin')),
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (auth_uid, trip_id)
);

-- Links personales de invitación: se guarda solo el hash del código.
create table private.invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  member_id uuid not null references public.members (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  created_by uuid references public.members (id),
  revoked_at timestamptz,
  last_used_at timestamptz
);

-- Para limitar intentos de PIN / links.
create table private.join_attempts (
  id bigint generated always as identity primary key,
  auth_uid uuid not null,
  at timestamptz not null default now(),
  ok boolean not null
);
create index on private.join_attempts (auth_uid, at desc);

-- ---------------------------------------------------------------------
-- Lugares, capítulos y días
-- ---------------------------------------------------------------------

create table public.places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  country text,            -- ISO 3166-1 alfa-2 (IL, ES, FR, IT, AR, MC)
  tz text not null,
  lat double precision,
  lon double precision,
  iata text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  color text not null,
  accent text not null,
  emoji text,
  start_date date not null,
  end_date date not null,
  place_id uuid references public.places (id),
  currency char(3),        -- moneda sugerida al cargar gastos en este capítulo
  sort int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

create table public.days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  date date not null,
  chapter_id uuid references public.chapters (id),
  place_id uuid references public.places (id),
  title text,
  notes text,
  night_override text,     -- "En el avión", "En el micro"… pisa al alojamiento
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1,
  unique (trip_id, date)
);

-- ---------------------------------------------------------------------
-- Gastos (el corazón)
-- ---------------------------------------------------------------------

-- Caja común: una "parte" más en los balances.
create table public.pots (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  name text not null,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  holder_member_id uuid references public.members (id),
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  description text not null check (length(description) between 1 and 200),
  category text not null default 'otros'
    check (category in ('comida', 'super', 'alojamiento', 'transporte', 'salidas', 'actividades', 'compras', 'otros')),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor > 0),
  -- Cuántas unidades de la moneda base vale 1 unidad de la moneda del gasto.
  fx_rate numeric(24, 12) not null check (fx_rate > 0),
  fx_source text not null default 'manual' check (fx_source in ('same', 'auto', 'cached', 'manual')),
  base_amount_minor bigint not null,
  date date not null,
  chapter_id uuid references public.chapters (id),
  place_id uuid references public.places (id),
  split_mode text not null check (split_mode in ('equal', 'exact', 'percent', 'shares', 'personal')),
  -- { "<member_id o pot_id>": monto } en la moneda del gasto
  payers jsonb not null,
  -- { "<member_id>": monto } resultado final de la división (lo que usan los balances)
  shares jsonb not null,
  -- { "<member_id>": valor cargado } para poder reeditar (partes, % en puntos básicos, montos)
  split_inputs jsonb not null default '{}'::jsonb,
  receipt_path text,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

-- Pagos entre amigas y movimientos de la caja (aportes / devoluciones).
create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  from_id uuid not null,   -- member o pot
  to_id uuid not null,     -- member o pot
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  amount_minor bigint not null check (amount_minor > 0),
  fx_rate numeric(24, 12) not null check (fx_rate > 0),
  base_amount_minor bigint not null,
  date date not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1,
  check (from_id <> to_id)
);

-- ---------------------------------------------------------------------
-- Traslados, alojamientos, planes, adjuntos
-- ---------------------------------------------------------------------

create table public.transports (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  kind text not null default 'flight' check (kind in ('flight', 'bus', 'train', 'car', 'ferry', 'other')),
  status text not null default 'booked' check (status in ('pending', 'booked', 'cancelled')),
  code text,
  carrier text,
  origin_label text,
  origin_place_id uuid references public.places (id),
  dest_label text,
  dest_place_id uuid references public.places (id),
  depart_at timestamptz,
  depart_tz text,
  arrive_at timestamptz,
  arrive_tz text,
  terminal text,
  booking_ref text,
  purchased_by uuid references public.members (id),
  expense_id uuid references public.expenses (id),
  leave_buffer_min int,
  travel_to_min int,
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

create table public.stays (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  chapter_id uuid references public.chapters (id),
  name text not null,
  kind text,               -- Airbnb, hostel, hotel…
  status text not null default 'booked' check (status in ('pending', 'booked', 'cancelled')),
  address text,
  lat double precision,
  lon double precision,
  check_in_date date,
  check_in_time text,
  check_out_date date,
  check_out_time text,
  booking_url text,
  contact text,
  wifi_name text,
  wifi_pass text,
  door_code text,
  guests int,
  expense_id uuid references public.expenses (id),
  notes text,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

-- Planes: con day_id = está en el itinerario; sin day_id = idea suelta (V2).
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  chapter_id uuid references public.chapters (id),
  day_id uuid references public.days (id),
  start_time text,
  title text not null,
  notes text,
  maps_url text,
  status text not null default 'pending' check (status in ('pending', 'done', 'skipped')),
  proposed_by uuid references public.members (id),
  group_label text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  owner_type text not null check (owner_type in ('transport', 'stay', 'expense', 'journal', 'other')),
  owner_id uuid not null,
  member_id uuid references public.members (id),  -- null = de todas
  storage_path text not null,
  mime text,
  name text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  created_by uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  client_updated_at timestamptz,
  deleted_at timestamptz,
  version int not null default 1
);

-- ---------------------------------------------------------------------
-- Historial (quién hizo qué). Lo llena un trigger, nadie lo escribe a mano.
-- ---------------------------------------------------------------------

create table public.activity_log (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.trips (id) on delete cascade,
  entity text not null,
  entity_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete', 'restore')),
  actor_member_id uuid references public.members (id),
  at timestamptz not null default clock_timestamp(),
  before jsonb,
  after jsonb
);
create index on public.activity_log (trip_id, entity, entity_id, at desc);

-- Índices para el sync incremental (WHERE trip_id = ? AND updated_at > ?).
create index on public.members (trip_id, updated_at);
create index on public.places (trip_id, updated_at);
create index on public.chapters (trip_id, updated_at);
create index on public.days (trip_id, updated_at);
create index on public.pots (trip_id, updated_at);
create index on public.expenses (trip_id, updated_at);
create index on public.settlements (trip_id, updated_at);
create index on public.transports (trip_id, updated_at);
create index on public.stays (trip_id, updated_at);
create index on public.plans (trip_id, updated_at);
create index on public.attachments (trip_id, updated_at);
create index on public.attachments (owner_type, owner_id);
