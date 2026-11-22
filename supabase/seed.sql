-- =====================================================================
-- Datos del viaje (21/12/2026 → 14/01/2027)
--
-- Solo lo que está confirmado. Lo que falta queda como "pendiente" y se
-- completa desde la app. El PIN NO va acá: se pone con set_trip_pin().
-- Los gastos NO se precargan: los carga cada una desde la app con la
-- división que corresponda.
-- =====================================================================

begin;

-- Viaje -----------------------------------------------------------------
insert into public.trips (id, slug, name, start_date, end_date, base_currency, home_tz) values
  ('00000000-0000-4000-a000-000000000001', 'viaje-2026', 'Israel · Madrid · Niza · Roma',
   '2026-12-21', '2027-01-14', 'USD', 'America/Argentina/Buenos_Aires');

-- Integrantes ------------------------------------------------------------
insert into public.members (id, trip_id, name, color, sort) values
  ('00000000-0000-4000-a000-000000000101', '00000000-0000-4000-a000-000000000001', 'Wile',   '#C62E65', 1),
  ('00000000-0000-4000-a000-000000000102', '00000000-0000-4000-a000-000000000001', 'Lara',   '#972DB5', 2),
  ('00000000-0000-4000-a000-000000000103', '00000000-0000-4000-a000-000000000001', 'Juli',   '#624763', 3),
  ('00000000-0000-4000-a000-000000000104', '00000000-0000-4000-a000-000000000001', 'Ivi',    '#2F1847', 4),
  ('00000000-0000-4000-a000-000000000105', '00000000-0000-4000-a000-000000000001', 'Meli',   '#F9B3D1', 5),
  ('00000000-0000-4000-a000-000000000106', '00000000-0000-4000-a000-000000000001', 'Solcha', '#EDA6FC', 6);

-- Lugares (para hora local y clima) ---------------------------------------
-- Israel: se usa Tel Aviv para el clima por defecto; cada día se puede cambiar.
insert into public.places (id, trip_id, name, country, tz, lat, lon, iata) values
  ('00000000-0000-4000-a000-000000000201', '00000000-0000-4000-a000-000000000001', 'Buenos Aires', 'AR', 'America/Argentina/Buenos_Aires', -34.6037, -58.3816, 'EZE'),
  ('00000000-0000-4000-a000-000000000202', '00000000-0000-4000-a000-000000000001', 'Madrid',       'ES', 'Europe/Madrid',  40.4168,  -3.7038, 'MAD'),
  ('00000000-0000-4000-a000-000000000203', '00000000-0000-4000-a000-000000000001', 'Tel Aviv',     'IL', 'Asia/Jerusalem', 32.0853,  34.7818, 'TLV'),
  ('00000000-0000-4000-a000-000000000204', '00000000-0000-4000-a000-000000000001', 'Valencia',     'ES', 'Europe/Madrid',  39.4699,  -0.3763, null),
  ('00000000-0000-4000-a000-000000000205', '00000000-0000-4000-a000-000000000001', 'Niza',         'FR', 'Europe/Paris',   43.7102,   7.2620, 'NCE'),
  ('00000000-0000-4000-a000-000000000206', '00000000-0000-4000-a000-000000000001', 'Roma',         'IT', 'Europe/Rome',    41.9028,  12.4964, 'FCO');

-- Capítulos ----------------------------------------------------------------
insert into public.chapters (id, trip_id, name, color, accent, emoji, start_date, end_date, place_id, currency, sort) values
  ('00000000-0000-4000-a000-000000000301', '00000000-0000-4000-a000-000000000001', 'Ida',    '#2F1847', '#F9B3D1', '✈️', '2026-12-21', '2026-12-22', '00000000-0000-4000-a000-000000000201', 'USD', 1),
  ('00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000001', 'Israel', '#624763', '#D63AF9', '🌊', '2026-12-23', '2027-01-01', '00000000-0000-4000-a000-000000000203', 'ILS', 2),
  ('00000000-0000-4000-a000-000000000303', '00000000-0000-4000-a000-000000000001', 'Madrid', '#C62E65', '#F9B3D1', '💃', '2027-01-02', '2027-01-05', '00000000-0000-4000-a000-000000000202', 'EUR', 3),
  ('00000000-0000-4000-a000-000000000304', '00000000-0000-4000-a000-000000000001', 'Niza',   '#972DB5', '#EDA6FC', '🍋', '2027-01-06', '2027-01-10', '00000000-0000-4000-a000-000000000205', 'EUR', 4),
  ('00000000-0000-4000-a000-000000000305', '00000000-0000-4000-a000-000000000001', 'Roma',   '#F9B3D1', '#D63AF9', '🍕', '2027-01-11', '2027-01-14', '00000000-0000-4000-a000-000000000206', 'EUR', 5);

-- Días ------------------------------------------------------------------------
insert into public.days (trip_id, date, chapter_id, place_id, title, night_override)
select '00000000-0000-4000-a000-000000000001', d::date, c, p, t, n
from (values
  ('2026-12-21', '00000000-0000-4000-a000-000000000301'::uuid, '00000000-0000-4000-a000-000000000201'::uuid, 'Salida desde Buenos Aires', 'En el avión ✈️'),
  ('2026-12-22', '00000000-0000-4000-a000-000000000301', '00000000-0000-4000-a000-000000000202', 'Escala en Madrid · a la noche vuelo a Tel Aviv', 'En el avión ✈️'),
  ('2026-12-23', '00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203', 'Taglit', 'Taglit (lo organiza el programa)'),
  ('2026-12-24', '00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203', 'Taglit', 'Taglit (lo organiza el programa)'),
  ('2026-12-25', '00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203', 'Taglit', 'Taglit (lo organiza el programa)'),
  ('2026-12-26', '00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203', 'Taglit', 'Taglit (lo organiza el programa)'),
  ('2026-12-27', '00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203', 'Taglit', 'Taglit (lo organiza el programa)'),
  ('2026-12-28', '00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203', 'Taglit', 'Taglit (lo organiza el programa)'),
  ('2026-12-29', '00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203', 'Taglit (fin a confirmar)', null),
  ('2026-12-30', '00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203', 'Israel por nuestra cuenta', null),
  ('2026-12-31', '00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203', 'Año Nuevo en Israel 🎆', null),
  ('2027-01-01', '00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203', 'Último día en Israel', null),
  ('2027-01-02', '00000000-0000-4000-a000-000000000303', '00000000-0000-4000-a000-000000000202', 'Llegada a Madrid', null),
  ('2027-01-03', '00000000-0000-4000-a000-000000000303', '00000000-0000-4000-a000-000000000204', 'Excursión a Valencia', null),
  ('2027-01-04', '00000000-0000-4000-a000-000000000303', '00000000-0000-4000-a000-000000000202', 'Madrid', null),
  ('2027-01-05', '00000000-0000-4000-a000-000000000303', '00000000-0000-4000-a000-000000000202', 'Madrid · a la noche vuelo a Niza', null),
  ('2027-01-06', '00000000-0000-4000-a000-000000000304', '00000000-0000-4000-a000-000000000205', 'Niza', null),
  ('2027-01-07', '00000000-0000-4000-a000-000000000304', '00000000-0000-4000-a000-000000000205', 'Niza', null),
  ('2027-01-08', '00000000-0000-4000-a000-000000000304', '00000000-0000-4000-a000-000000000205', 'Niza', null),
  ('2027-01-09', '00000000-0000-4000-a000-000000000304', '00000000-0000-4000-a000-000000000205', 'Niza', null),
  ('2027-01-10', '00000000-0000-4000-a000-000000000304', '00000000-0000-4000-a000-000000000205', 'Niza · a la noche micro a Roma', 'En el micro 🚌'),
  ('2027-01-11', '00000000-0000-4000-a000-000000000305', '00000000-0000-4000-a000-000000000206', 'Llegada a Roma', null),
  ('2027-01-12', '00000000-0000-4000-a000-000000000305', '00000000-0000-4000-a000-000000000206', 'Roma', null),
  ('2027-01-13', '00000000-0000-4000-a000-000000000305', '00000000-0000-4000-a000-000000000206', 'Roma', null),
  ('2027-01-14', '00000000-0000-4000-a000-000000000305', '00000000-0000-4000-a000-000000000206', 'Roma · último día', null)
) as v(d, c, p, t, n);

-- Traslados (hora local de cada lugar → UTC) ---------------------------------------
insert into public.transports
  (id, trip_id, kind, status, code, carrier, origin_label, origin_place_id, dest_label, dest_place_id,
   depart_at, depart_tz, arrive_at, arrive_tz, purchased_by, expense_id, notes)
values
  ('00000000-0000-4000-a000-000000000501', '00000000-0000-4000-a000-000000000001', 'flight', 'booked', 'IB108', 'Iberia',
   'Buenos Aires (EZE)', '00000000-0000-4000-a000-000000000201', 'Madrid (MAD)', '00000000-0000-4000-a000-000000000202',
   '2026-12-21 22:15'::timestamp at time zone 'America/Argentina/Buenos_Aires', 'America/Argentina/Buenos_Aires',
   '2026-12-22 14:00'::timestamp at time zone 'Europe/Madrid', 'Europe/Madrid', null, null, null),
  ('00000000-0000-4000-a000-000000000502', '00000000-0000-4000-a000-000000000001', 'flight', 'booked', 'IB1873', 'Iberia',
   'Madrid (MAD)', '00000000-0000-4000-a000-000000000202', 'Tel Aviv (TLV)', '00000000-0000-4000-a000-000000000203',
   '2026-12-22 21:25'::timestamp at time zone 'Europe/Madrid', 'Europe/Madrid',
   '2026-12-23 04:30'::timestamp at time zone 'Asia/Jerusalem', 'Asia/Jerusalem', null, null,
   'Unas 7 horas de escala en Madrid.'),
  ('00000000-0000-4000-a000-000000000503', '00000000-0000-4000-a000-000000000001', 'flight', 'booked', 'IB1874', 'Iberia',
   'Tel Aviv (TLV)', '00000000-0000-4000-a000-000000000203', 'Madrid (MAD)', '00000000-0000-4000-a000-000000000202',
   '2027-01-02 05:30'::timestamp at time zone 'Asia/Jerusalem', 'Asia/Jerusalem',
   null, 'Europe/Madrid', null, null, 'Hora de llegada: pendiente de cargar.'),
  ('00000000-0000-4000-a000-000000000504', '00000000-0000-4000-a000-000000000001', 'flight', 'booked', 'IB1217', 'Iberia',
   'Madrid (MAD)', '00000000-0000-4000-a000-000000000202', 'Niza (NCE)', '00000000-0000-4000-a000-000000000205',
   '2027-01-05 22:00'::timestamp at time zone 'Europe/Madrid', 'Europe/Madrid',
   null, 'Europe/Paris', null, null, 'Hora de llegada: pendiente. Ojo: el check-in en el hostel va a ser muy tarde, avisarles.'),
  ('00000000-0000-4000-a000-000000000505', '00000000-0000-4000-a000-000000000001', 'bus', 'booked', null, null,
   'Aeropuerto de Niza', '00000000-0000-4000-a000-000000000205', 'Roma', '00000000-0000-4000-a000-000000000206',
   '2027-01-10 23:45'::timestamp at time zone 'Europe/Paris', 'Europe/Paris',
   null, 'Europe/Rome', '00000000-0000-4000-a000-000000000104', null,
   'Micro nocturno. Hora de llegada: pendiente.'),
  ('00000000-0000-4000-a000-000000000506', '00000000-0000-4000-a000-000000000001', 'flight', 'pending', null, null,
   'Roma', '00000000-0000-4000-a000-000000000206', null, null,
   null, 'Europe/Rome', null, null, null, null, 'Vuelo de vuelta: todavía sin cargar.');

-- Alojamientos ---------------------------------------------------------------------------
insert into public.stays
  (id, trip_id, chapter_id, name, kind, status, check_in_date, check_out_date, guests, booking_url, expense_id, notes)
values
  ('00000000-0000-4000-a000-000000000401', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000302',
   'Airbnb Israel', 'Airbnb', 'booked', '2026-12-30', '2027-01-01', 6,
   'https://www.airbnb.com.ar/rooms/927451540234687186', null, null),
  ('00000000-0000-4000-a000-000000000402', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000303',
   'Alojamiento en Madrid', null, 'pending', '2027-01-02', '2027-01-05', 6, null, null, 'Sin definir todavía.'),
  ('00000000-0000-4000-a000-000000000403', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000304',
   'Hostel Ozz', 'Hostel', 'booked', '2027-01-05', '2027-01-10', 6,
   'https://www.hostel-ozz.com/en/', null, null),
  ('00000000-0000-4000-a000-000000000404', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000305',
   'Yellow Square', 'Hostel', 'booked', '2027-01-11', '2027-01-14', 6,
   'https://yellowsquare.com/rome/', null, null);

-- Planes ------------------------------------------------------------------------------------
-- Valencia, ya con día asignado.
insert into public.plans (trip_id, chapter_id, day_id, title, sort)
select '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000303', d.id, 'Excursión a Valencia', 1
from public.days d where d.trip_id = '00000000-0000-4000-a000-000000000001' and d.date = '2027-01-03';

-- Ideas para Niza y alrededores, agrupadas en "días posibles" (sin día fijo).
insert into public.plans (trip_id, chapter_id, title, group_label, sort)
select '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000304', t, g, s
from (values
  ('Niza', 'Día 1', 1),
  ('Vieux Nice', 'Día 2', 2), ('Colline du Château', 'Día 2', 3),
  ('Èze', 'Día 3', 4), ('Villefranche-sur-Mer', 'Día 3', 5),
  ('Saint-Paul-de-Vence', 'Día 4', 6), ('Vence', 'Día 4', 7),
  ('Menton', 'Día 5', 8), ('Mónaco', 'Día 5', 9),
  ('Antibes', 'Día 6', 10), ('Biot', 'Día 6', 11), ('Saint-Tropez', 'Día 6', 12),
  ('Grasse', 'Día 7', 13), ('Gourdon', 'Día 7', 14), ('Cannes', 'Día 7', 15)
) as v(t, g, s);

-- ---------------------------------------------------------------------
-- Info útil por país (V2). Todo lo sensible queda marcado para verificar
-- (needs_check = true) y el consulado va vacío a propósito.
-- ---------------------------------------------------------------------
insert into public.country_info (trip_id, country, section, title, body, needs_check, sort)
select t.id, v.country, v.section, v.title, v.body, v.needs_check, v.sort
from public.trips t
cross join (values
  -- Israel
  ('IL', 'emergencias', 'Emergencias', 'Policía: 100 · Ambulancia (Magen David Adom): 101 · Bomberos: 102' || chr(10) || '⚠️ Verificar antes de viajar.', true, 1),
  ('IL', 'consulado', 'Embajada / consulado argentino', '⚠️ Completar: dirección, teléfono y teléfono de guardia (sacarlo de cancilleria.gob.ar).', true, 2),
  ('IL', 'shabat', 'Shabat', 'Desde el viernes a la tarde hasta el sábado a la noche casi no hay transporte público y muchos comercios cierran. Planificar traslados y compras antes.' || chr(10) || '⚠️ Verificar horarios exactos de cada semana.', true, 3),
  ('IL', 'transporte', 'Transporte', '⚠️ Completar: tarjeta de transporte, apps útiles, taxis.', true, 4),
  ('IL', 'propinas', 'Propinas', '⚠️ Completar: costumbre local en restaurantes y taxis.', true, 5),
  ('IL', 'enchufes', 'Enchufes', 'Tipo H (y suele aceptar C). ⚠️ Verificar y llevar adaptador.', true, 6),
  ('IL', 'frases', 'Frases útiles (hebreo)', 'Hola / chau: Shalom' || chr(10) || 'Gracias: Todá' || chr(10) || 'Por favor: Bevakashá' || chr(10) || 'Sí / no: Ken / Lo' || chr(10) || '¿Cuánto cuesta?: Kamá zé olé?', false, 7),
  -- España
  ('ES', 'emergencias', 'Emergencias', 'Número único europeo: 112' || chr(10) || '⚠️ Verificar antes de viajar.', true, 1),
  ('ES', 'consulado', 'Consulado argentino en Madrid', '⚠️ Completar: dirección, teléfono y teléfono de guardia (sacarlo de cancilleria.gob.ar).', true, 2),
  ('ES', 'transporte', 'Transporte', '⚠️ Completar: metro, tarjeta, cómo ir del aeropuerto, tren a Valencia.', true, 3),
  ('ES', 'propinas', 'Propinas', '⚠️ Completar: costumbre local.', true, 4),
  ('ES', 'enchufes', 'Enchufes', 'Tipo C / F (230 V). ⚠️ Verificar y llevar adaptador.', true, 5),
  -- Francia
  ('FR', 'emergencias', 'Emergencias', 'Número único europeo: 112' || chr(10) || '⚠️ Verificar antes de viajar.', true, 1),
  ('FR', 'consulado', 'Consulado argentino (Francia / Mónaco)', '⚠️ Completar: el más cercano a Niza, dirección y teléfono.', true, 2),
  ('FR', 'transporte', 'Transporte', '⚠️ Completar: tranvía y buses de Niza, trenes a Mónaco, Menton, Cannes, Antibes.', true, 3),
  ('FR', 'propinas', 'Propinas', '⚠️ Completar: costumbre local.', true, 4),
  ('FR', 'enchufes', 'Enchufes', 'Tipo C / E (230 V). ⚠️ Verificar y llevar adaptador.', true, 5),
  ('FR', 'frases', 'Frases útiles (francés)', 'Hola: Bonjour · Buenas noches: Bonsoir' || chr(10) || 'Gracias: Merci' || chr(10) || 'Por favor: S''il vous plaît' || chr(10) || '¿Cuánto cuesta?: Combien ça coûte ?' || chr(10) || 'La cuenta, por favor: L''addition, s''il vous plaît', false, 6),
  -- Italia
  ('IT', 'emergencias', 'Emergencias', 'Número único europeo: 112' || chr(10) || '⚠️ Verificar antes de viajar.', true, 1),
  ('IT', 'consulado', 'Consulado argentino en Roma', '⚠️ Completar: dirección, teléfono y teléfono de guardia (sacarlo de cancilleria.gob.ar).', true, 2),
  ('IT', 'transporte', 'Transporte', '⚠️ Completar: metro y buses de Roma, boletos, cómo ir del aeropuerto.', true, 3),
  ('IT', 'propinas', 'Propinas', '⚠️ Completar: costumbre local (coperto, servicio).', true, 4),
  ('IT', 'enchufes', 'Enchufes', 'Tipo C / F / L (230 V). ⚠️ Verificar y llevar adaptador.', true, 5),
  ('IT', 'frases', 'Frases útiles (italiano)', 'Hola: Ciao / Buongiorno' || chr(10) || 'Gracias: Grazie' || chr(10) || 'Por favor: Per favore' || chr(10) || '¿Cuánto cuesta?: Quanto costa?' || chr(10) || 'La cuenta, por favor: Il conto, per favore', false, 6)
) as v(country, section, title, body, needs_check, sort)
where t.slug = 'viaje-2026';

commit;
