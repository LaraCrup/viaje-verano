-- =====================================================================
-- Acceso, sync, validaciones, historial y RLS
-- =====================================================================

grant usage on schema private to authenticated, anon;

-- ---------------------------------------------------------------------
-- Quién soy en este viaje
-- ---------------------------------------------------------------------

create or replace function private.is_trip_member(p_trip_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_sessions s
    where s.auth_uid = (select auth.uid()) and s.trip_id = p_trip_id
  );
$$;

create or replace function private.current_member_id(p_trip_id uuid)
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select s.member_id from public.trip_sessions s
  where s.auth_uid = (select auth.uid()) and s.trip_id = p_trip_id;
$$;

-- Un uuid inválido en una ruta de Storage no tiene que romper la policy.
create or replace function private.try_uuid(p text)
returns uuid
language plpgsql immutable
set search_path = ''
as $$
begin
  return p::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function private.is_trip_member(uuid) to authenticated, anon;
grant execute on function private.current_member_id(uuid) to authenticated;
grant execute on function private.try_uuid(text) to authenticated, anon;

-- ---------------------------------------------------------------------
-- Metadatos de sync + "gana la última edición"
--
-- Si llega una edición hecha ANTES que la que ya está guardada (por ejemplo, un
-- celular que estuvo sin señal), se descarta en silencio: gana la edición más
-- reciente según cuándo se hizo, no según cuándo llegó. Nada se pierde: el
-- historial guarda cada versión.
-- ---------------------------------------------------------------------

create or replace function private.tg_sync_meta()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_member uuid := private.current_member_id(coalesce(new.trip_id, old.trip_id));
begin
  if tg_op = 'UPDATE' then
    if new.client_updated_at is not null and old.client_updated_at is not null
       and new.client_updated_at < old.client_updated_at then
      return null;
    end if;
    new.trip_id := old.trip_id;          -- no se puede mover a otro viaje
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.version := old.version + 1;
  else
    new.version := 1;
    new.created_at := now();
    new.created_by := coalesce(v_member, new.created_by);
  end if;
  new.updated_at := clock_timestamp();
  new.updated_by := coalesce(v_member, new.updated_by);
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Historial
-- ---------------------------------------------------------------------

create or replace function private.tg_activity_log()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_action text;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
  elsif old.deleted_at is null and new.deleted_at is not null then
    v_action := 'delete';
  elsif old.deleted_at is not null and new.deleted_at is null then
    v_action := 'restore';
  else
    v_action := 'update';
  end if;
  insert into public.activity_log (trip_id, entity, entity_id, action, actor_member_id, before, after)
  values (
    new.trip_id, tg_table_name, new.id, v_action,
    private.current_member_id(new.trip_id),
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new)
  );
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- Validaciones de dinero (la misma regla que shared/money, del lado del servidor)
-- ---------------------------------------------------------------------

create or replace function private.is_party(p_trip_id uuid, p_id uuid, p_currency text default null)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.members m where m.id = p_id and m.trip_id = p_trip_id)
      or exists (
        select 1 from public.pots p
        where p.id = p_id and p.trip_id = p_trip_id
          and (p_currency is null or p.currency = p_currency)
      );
$$;

create or replace function private.tg_validate_expense()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_sum bigint;
  v_key text;
  v_val jsonb;
begin
  if jsonb_typeof(new.payers) <> 'object' or jsonb_typeof(new.shares) <> 'object' then
    raise exception 'payers y shares tienen que ser objetos';
  end if;

  v_sum := 0;
  for v_key, v_val in select * from jsonb_each(new.payers) loop
    if jsonb_typeof(v_val) <> 'number' or (v_val #>> '{}')::numeric <> trunc((v_val #>> '{}')::numeric)
       or (v_val #>> '{}')::bigint <= 0 then
      raise exception 'Monto pagado inválido para %', v_key;
    end if;
    if private.try_uuid(v_key) is null
       or not private.is_party(new.trip_id, v_key::uuid, new.currency) then
      raise exception 'Quien pagó (%) no es del viaje (o la caja es de otra moneda)', v_key;
    end if;
    v_sum := v_sum + (v_val #>> '{}')::bigint;
  end loop;
  if v_sum <> new.amount_minor then
    raise exception 'Lo pagado (%) no suma el total (%)', v_sum, new.amount_minor;
  end if;

  v_sum := 0;
  for v_key, v_val in select * from jsonb_each(new.shares) loop
    if jsonb_typeof(v_val) <> 'number' or (v_val #>> '{}')::numeric <> trunc((v_val #>> '{}')::numeric)
       or (v_val #>> '{}')::bigint < 0 then
      raise exception 'Parte inválida para %', v_key;
    end if;
    if private.try_uuid(v_key) is null or not exists (
      select 1 from public.members m where m.id = v_key::uuid and m.trip_id = new.trip_id
    ) then
      raise exception 'La división incluye a alguien que no es del viaje (%)', v_key;
    end if;
    v_sum := v_sum + (v_val #>> '{}')::bigint;
  end loop;
  if v_sum <> new.amount_minor then
    raise exception 'Lo dividido (%) no suma el total (%)', v_sum, new.amount_minor;
  end if;

  if new.split_mode = 'personal' and (select count(*) from jsonb_object_keys(new.shares)) <> 1 then
    raise exception 'Un gasto personal es de una sola persona';
  end if;
  return new;
end;
$$;

create or replace function private.tg_validate_settlement()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if not private.is_party(new.trip_id, new.from_id) or not private.is_party(new.trip_id, new.to_id) then
    raise exception 'El pago tiene que ser entre integrantes o cajas del viaje';
  end if;
  if exists (select 1 from public.pots p where p.id in (new.from_id, new.to_id) and p.currency <> new.currency) then
    raise exception 'Los movimientos de una caja van en la moneda de la caja';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Triggers
-- Los BEFORE se ejecutan en orden alfabético: a_ (sync) antes que b_ (validar).
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['members', 'places', 'chapters', 'days', 'pots', 'expenses', 'settlements',
                           'transports', 'stays', 'plans', 'attachments'] loop
    execute format('create trigger a_sync_meta before insert or update on public.%I
                    for each row execute function private.tg_sync_meta()', t);
  end loop;
  foreach t in array array['expenses', 'settlements', 'pots', 'transports', 'stays', 'plans', 'days'] loop
    execute format('create trigger z_activity_log after insert or update on public.%I
                    for each row execute function private.tg_activity_log()', t);
  end loop;
end;
$$;

create trigger b_validate before insert or update on public.expenses
  for each row execute function private.tg_validate_expense();
create trigger b_validate before insert or update on public.settlements
  for each row execute function private.tg_validate_settlement();

-- ---------------------------------------------------------------------
-- RLS: solo las integrantes del viaje leen y escriben. No hay DELETE:
-- los borrados son lógicos (deleted_at) y quedan en el historial.
-- ---------------------------------------------------------------------

alter table public.trips enable row level security;
alter table public.trip_sessions enable row level security;
alter table public.activity_log enable row level security;
alter table private.trip_secrets enable row level security;
alter table private.invites enable row level security;
alter table private.join_attempts enable row level security;

create policy "integrantes ven su viaje" on public.trips
  for select to authenticated using (private.is_trip_member(id));
create policy "integrantes editan su viaje" on public.trips
  for update to authenticated using (private.is_trip_member(id)) with check (private.is_trip_member(id));

create policy "cada dispositivo ve sus sesiones" on public.trip_sessions
  for select to authenticated using (auth_uid = (select auth.uid()));

create policy "integrantes ven el historial" on public.activity_log
  for select to authenticated using (private.is_trip_member(trip_id));

do $$
declare
  t text;
begin
  foreach t in array array['members', 'places', 'chapters', 'days', 'pots', 'expenses', 'settlements',
                           'transports', 'stays', 'plans', 'attachments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "integrantes leen" on public.%I for select to authenticated
                    using (private.is_trip_member(trip_id))', t);
    -- Las integrantes no se crean desde la app (son las 6 del viaje).
    if t <> 'members' then
      execute format('create policy "integrantes crean" on public.%I for insert to authenticated
                      with check (private.is_trip_member(trip_id))', t);
    end if;
    execute format('create policy "integrantes editan" on public.%I for update to authenticated
                    using (private.is_trip_member(trip_id)) with check (private.is_trip_member(trip_id))', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- RPCs de acceso
-- ---------------------------------------------------------------------

-- Pantalla "¿Quién sos?": solo nombres, colores y emojis.
create or replace function public.get_trip_public(p_slug text)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id,
    'name', t.name,
    'start_date', t.start_date,
    'end_date', t.end_date,
    'members', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'name', m.name, 'color', m.color, 'emoji', m.emoji) order by m.sort)
      from public.members m where m.trip_id = t.id and m.deleted_at is null
    ), '[]'::jsonb)
  )
  from public.trips t where t.slug = p_slug;
$$;

create or replace function private.check_rate_limit()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Primero hay que iniciar sesión' using errcode = '28000';
  end if;
  if (
    select count(*) from private.join_attempts a
    where a.auth_uid = (select auth.uid()) and not a.ok and a.at > now() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Demasiados intentos. Esperá unos minutos y probá de nuevo.' using errcode = 'P0429';
  end if;
end;
$$;

create or replace function private.link_session(p_trip_id uuid, p_member_id uuid, p_via text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.trip_sessions (auth_uid, trip_id, member_id, via)
  values ((select auth.uid()), p_trip_id, p_member_id, p_via)
  on conflict (auth_uid, trip_id) do update
    set member_id = excluded.member_id, via = excluded.via, last_seen = now();
  insert into private.join_attempts (auth_uid, ok) values ((select auth.uid()), true);
  return jsonb_build_object('trip_id', p_trip_id, 'member_id', p_member_id);
end;
$$;

-- Entrar con el PIN del grupo eligiendo quién sos.
create or replace function public.join_with_pin(p_slug text, p_member_id uuid, p_pin text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_trip uuid;
  v_hash text;
begin
  perform private.check_rate_limit();
  select t.id, s.pin_hash into v_trip, v_hash
  from public.trips t left join private.trip_secrets s on s.trip_id = t.id
  where t.slug = p_slug;

  if v_trip is null or v_hash is null
     or v_hash <> extensions.crypt(p_pin, v_hash)
     or not exists (select 1 from public.members m where m.id = p_member_id and m.trip_id = v_trip and m.deleted_at is null) then
    insert into private.join_attempts (auth_uid, ok) values ((select auth.uid()), false);
    return jsonb_build_object('error', 'PIN incorrecto');
  end if;
  return private.link_session(v_trip, p_member_id, 'pin');
end;
$$;

-- Entrar con el link personal.
create or replace function public.redeem_invite(p_token text)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_inv private.invites;
begin
  perform private.check_rate_limit();
  select * into v_inv from private.invites i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex') and i.revoked_at is null;

  if v_inv.id is null then
    insert into private.join_attempts (auth_uid, ok) values ((select auth.uid()), false);
    return jsonb_build_object('error', 'Este link ya no sirve. Pedile uno nuevo a alguien del grupo.');
  end if;
  update private.invites set last_used_at = now() where id = v_inv.id;
  return private.link_session(v_inv.trip_id, v_inv.member_id, 'invite');
end;
$$;

-- Generar (o regenerar) el link personal de una integrante. Lo puede hacer cualquiera del viaje.
create or replace function public.create_invite(p_trip_id uuid, p_member_id uuid)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if not private.is_trip_member(p_trip_id) then
    raise exception 'No sos parte de este viaje' using errcode = '42501';
  end if;
  if not exists (select 1 from public.members m where m.id = p_member_id and m.trip_id = p_trip_id) then
    raise exception 'Esa persona no es del viaje';
  end if;
  -- El link nuevo reemplaza al anterior (si alguien lo reenvió, deja de servir).
  update private.invites set revoked_at = now()
  where trip_id = p_trip_id and member_id = p_member_id and revoked_at is null;

  v_token := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
  insert into private.invites (trip_id, member_id, token_hash, created_by)
  values (p_trip_id, p_member_id, encode(extensions.digest(v_token, 'sha256'), 'hex'),
          private.current_member_id(p_trip_id));
  return v_token;
end;
$$;

-- Qué integrantes tienen un link activo (sin exponer los códigos).
create or replace function public.invite_status(p_trip_id uuid)
returns table (member_id uuid, created_at timestamptz, last_used_at timestamptz)
language sql stable security definer
set search_path = ''
as $$
  select i.member_id, i.created_at, i.last_used_at
  from private.invites i
  where i.trip_id = p_trip_id and i.revoked_at is null and private.is_trip_member(p_trip_id);
$$;

-- Poner o cambiar el PIN. SOLO desde el SQL Editor de Supabase (no la puede llamar la app).
create or replace function public.set_trip_pin(p_slug text, p_pin text)
returns text
language plpgsql security definer
set search_path = ''
as $$
declare
  v_trip uuid;
begin
  if length(p_pin) < 6 then
    raise exception 'Usá un PIN de 6 dígitos o más';
  end if;
  select id into v_trip from public.trips where slug = p_slug;
  if v_trip is null then
    raise exception 'No existe el viaje %', p_slug;
  end if;
  insert into private.trip_secrets (trip_id, pin_hash)
  values (v_trip, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)))
  on conflict (trip_id) do update set pin_hash = excluded.pin_hash;
  return 'PIN actualizado';
end;
$$;

revoke all on function public.set_trip_pin(text, text) from public, anon, authenticated;
revoke all on function public.join_with_pin(text, uuid, text) from public;
revoke all on function public.get_trip_public(text) from public;
revoke all on function public.redeem_invite(text) from public;
revoke all on function public.create_invite(uuid, uuid) from public;
revoke all on function public.invite_status(uuid) from public;

grant execute on function public.get_trip_public(text) to anon, authenticated;
grant execute on function public.join_with_pin(text, uuid, text) to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.create_invite(uuid, uuid) to authenticated;
grant execute on function public.invite_status(uuid) to authenticated;

-- Las funciones private.* no se exponen por la API (el schema private no está en Data API).
revoke all on all functions in schema private from public;
grant execute on function private.is_trip_member(uuid) to authenticated, anon;
grant execute on function private.current_member_id(uuid) to authenticated;
grant execute on function private.try_uuid(text) to authenticated, anon;
