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
  ('2026-12-29', '00000000-0000-4000-a000-000000000302', '00000000-0000-4000-a000-000000000203', 'Taglit', 'Taglit (lo organiza el programa)'),
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
   'Alojamiento en Israel', null, 'pending', '2026-12-30', '2027-01-02', 6, null, null, 'Sin definir todavía.'),
  ('00000000-0000-4000-a000-000000000402', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000303',
   'Alojamiento en Madrid', null, 'pending', '2027-01-02', '2027-01-05', 6, null, null, 'Sin definir todavía.'),
  ('00000000-0000-4000-a000-000000000403', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000304',
   'Hostel Ozz', 'Hostel', 'booked', '2027-01-05', '2027-01-10', 6,
   'https://www.hostel-ozz.com/en/', null, null),
  ('00000000-0000-4000-a000-000000000404', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000305',
   'Yellow Square', 'Hostel', 'booked', '2027-01-11', '2027-01-14', 6,
   'https://yellowsquare.com/rome/', null, null);

-- ---------------------------------------------------------------------
-- Info útil por país (V2). Verificada en noviembre de 2026 (consulados en
-- las páginas oficiales de Cancillería; precios de transporte de 2026).
-- Formato: un dato por renglón; "Título: texto" se muestra con título y "Ojo: …" como aviso
-- (ver shared/info/blocks.ts).
-- ---------------------------------------------------------------------
insert into public.country_info (trip_id, country, section, title, body, needs_check, sort)
select t.id, v.country, v.section, v.title, v.body, v.needs_check, v.sort
from public.trips t
cross join (values
  -- Israel
  ('IL', 'emergencias', $q$Emergencias$q$, $q$Policía: 100
Ambulancia (Magen David Adom): 101
Bomberos: 102
Guardia consular argentina: +972 52-386-9501 (también WhatsApp)$q$, false, 1),
  ('IL', 'consulado', $q$Embajada y consulado argentino$q$, $q$Dirección: Medinat HaYehudim 85, 2° piso, Herzliya Pituach (al norte de Tel Aviv).
Teléfono: +972 73-252-0800
Atención: lunes a jueves de 8 a 14 h y viernes de 8 a 13 h, solo con turno.
Guardia para emergencias graves (accidentes, internaciones, detenciones): +972 52-386-9501 (también WhatsApp)
Si no contestan: guardia de Cancillería en Buenos Aires, +54 9 11 5040-7243 (llamadas) o +54 9 11 5061-5903 (WhatsApp).$q$, false, 2),
  ('IL', 'shabat', $q$Shabat$q$, $q$Cuándo: desde el viernes, un rato antes de que se ponga el sol, hasta el sábado a la noche.
Qué no funciona: trenes, casi todos los colectivos y el tren ligero de Tel Aviv. También cierran muchos comercios.
Qué sí funciona: taxis y sherut (combis compartidas).
Viernes 25/12: empieza ≈ 16:20 y termina el sábado 26 ≈ 17:25.
Viernes 1/1: empieza ≈ 16:25 y termina el sábado 2 ≈ 17:30.
Son horarios aproximados para Tel Aviv; los exactos de cada semana están en hebcal.com.
Ojo: el vuelo del sábado 2/1 a las 05:30 sale en pleno Shabat. No hay tren al aeropuerto: hay que ir en taxi, conviene reservarlo antes.$q$, false, 3),
  ('IL', 'transporte', $q$Transporte$q$, $q$Tarjeta Rav-Kav: se compra en el aeropuerto Ben Gurion (en el centro de información de transporte, unos 5 ₪) o en las estaciones grandes, y se le carga plata. Sirve para tren, colectivos y tren ligero. En el tren no se puede pagar en efectivo.
Apps: Moovit para ver recorridos y pagar; Pango también sirve para pagar desde el celular.
Del aeropuerto a Tel Aviv: tren desde el nivel S de la Terminal 3, unos 15 minutos.
Taxis: Gett o Yango (en inglés y con precio en la app, así no te cobran de más).
En Shabat: no hay tren y casi no hay colectivos; solo taxis y sherut.$q$, false, 4),
  ('IL', 'propinas', $q$Propinas$q$, $q$Restaurantes y bares: entre 10 % y 15 %. Fijate si la cuenta ya dice que incluye el servicio.
Taxis: no es obligatoria, se redondea.$q$, false, 5),
  ('IL', 'enchufes', $q$Enchufes$q$, $q$Tomas: tipo H (tres agujeros en triángulo) y tipo C. Los H nuevos aceptan la ficha C (dos patas redondas finitas).
Tensión: 230 V, como en Argentina. Los cargadores de celular y notebook andan sin transformador (fijate que digan 100–240 V).
Qué llevar: un adaptador de ficha argentina a tipo C. Sirve para todo el viaje.$q$, false, 6),
  ('IL', 'frases', $q$Frases útiles (hebreo)$q$, $q$Hola / chau: Shalom
Gracias: Todá
Por favor: Bevakashá
Sí / no: Ken / Lo
¿Cuánto cuesta?: Kamá zé olé?$q$, false, 7),
  -- España
  ('ES', 'emergencias', $q$Emergencias$q$, $q$Emergencias (todas): 112
Policía Nacional: 091
Urgencias médicas: 061
Guardia consular argentina: +34 609 24 04 08$q$, false, 1),
  ('ES', 'consulado', $q$Consulado argentino en Madrid$q$, $q$Dirección: Paseo de la Castellana 16, Madrid. Se mudó ahí; antes estaba en Fernando el Santo 15.
Teléfono: +34 91 402 5115
Guardia para emergencias graves: +34 609 24 04 08
Si no contestan: guardia de Cancillería en Buenos Aires, +54 9 11 5040-7243 (llamadas) o +54 9 11 5061-5903 (WhatsApp).$q$, false, 2),
  ('ES', 'transporte', $q$Transporte$q$, $q$Metro y colectivos (EMT): se usa la Tarjeta Transporte Público (se compra en las máquinas del metro) cargada con 10 viajes: 7,30 € en 2026, con un descuento que dura hasta el 31/12; en enero puede volver a subir.
Aeropuerto: metro línea 8 (se suma un suplemento de 3 €) o el colectivo Exprés Aeropuerto (5 €; ahí no sirve el de 10 viajes).
Abono turístico: viajes ilimitados y no paga el suplemento del aeropuerto (desde unos 10 € por día).
Tren a Valencia: alta velocidad (Renfe, Iryo u Ouigo) desde Madrid-Atocha o Chamartín hasta Valencia Joaquín Sorolla, entre 1 h 40 y 2 h. Conviene sacar los pasajes con anticipación.$q$, false, 3),
  ('ES', 'propinas', $q$Propinas$q$, $q$Restaurantes: no es obligatoria. Si el servicio fue bueno, se redondea o se deja entre 5 % y 10 %.
Bares y cafés: alcanza con dejar el cambio.$q$, false, 4),
  ('ES', 'enchufes', $q$Enchufes$q$, $q$Tomas: tipo C y F (dos patas redondas).
Tensión: 230 V, como en Argentina.
Qué llevar: el adaptador de ficha argentina a tipo C.$q$, false, 5),
  -- Francia
  ('FR', 'emergencias', $q$Emergencias$q$, $q$Emergencias (todas): 112
Urgencias médicas (SAMU): 15
Policía: 17
Bomberos: 18
Guardia consular argentina: +33 6 01 88 09 98$q$, false, 1),
  ('FR', 'consulado', $q$Consulado argentino (Francia y Mónaco)$q$, $q$En Niza no hay consulado: Francia y Mónaco los atiende la sección consular de la Embajada en París.
Dirección: 6 rue Cimarosa, París.
Teléfono: +33 1 44 05 27 00
Atención: de 9:30 a 14 h, con turno.
Guardia para emergencias graves: +33 6 01 88 09 98
Si no contestan: guardia de Cancillería en Buenos Aires, +54 9 11 5040-7243 (llamadas) o +54 9 11 5061-5903 (WhatsApp).$q$, false, 2),
  ('FR', 'transporte', $q$Transporte$q$, $q$Tranvía y colectivos: los de Niza son de Lignes d'Azur. Boleto Solo 1,70 €, vale 74 minutos con combinaciones.
Pases: 1 día 7 € · 7 días 20 €.
Aeropuerto: tranvía línea 2, va al centro y al puerto. Hay un boleto de ida y vuelta al aeropuerto de 10 €.
Mónaco, Menton, Cannes y Antibes: trenes regionales (TER) desde la estación Nice-Ville. Los pasajes se sacan en las máquinas de la estación o en la app SNCF Connect.$q$, false, 3),
  ('FR', 'propinas', $q$Propinas$q$, $q$Restaurantes: el servicio ya viene incluido en la cuenta («service compris»).
Si te atendieron bien: se dejan unas monedas o se redondea; no es obligatorio.$q$, false, 4),
  ('FR', 'enchufes', $q$Enchufes$q$, $q$Tomas: tipo C y E. El E tiene una patita arriba, pero la ficha C entra igual.
Tensión: 230 V, como en Argentina.
Qué llevar: el adaptador de ficha argentina a tipo C.$q$, false, 5),
  ('FR', 'frases', $q$Frases útiles (francés)$q$, $q$Hola: Bonjour
Buenas noches: Bonsoir
Gracias: Merci
Por favor: S'il vous plaît
¿Cuánto cuesta?: Combien ça coûte ?
La cuenta, por favor: L'addition, s'il vous plaît$q$, false, 6),
  -- Italia
  ('IT', 'emergencias', $q$Emergencias$q$, $q$Emergencias (todas): 112
Ambulancia: 118
Guardia consular argentina: +39 335 603 1207$q$, false, 1),
  ('IT', 'consulado', $q$Consulado argentino en Roma$q$, $q$Dirección: Via Barberini 67, 2° piso (cerca de Piazza Barberini).
Teléfono: +39 06 4287 0023
Atención: lunes a viernes de 8:30 a 13 h, solo con turno.
Guardia para emergencias (no para consultas ni turnos): +39 335 603 1207
Si no contestan: guardia de Cancillería en Buenos Aires, +54 9 11 5040-7243 (llamadas) o +54 9 11 5061-5903 (WhatsApp).$q$, false, 2),
  ('IT', 'transporte', $q$Transporte$q$, $q$Metro, colectivos y tranvías: son de ATAC. Boleto BIT 1,50 €, vale 100 minutos. También se puede pagar directo con la tarjeta o el celular en los molinetes y en los colectivos (tap & go). Puede que aumente a 2 €.
Pases: 24 h 8,50 € · 48 h 15 € · 72 h 22 €
Llegada desde Niza: el micro llega a Tiburtina, que es estación de la línea B del metro.
Aeropuerto de Fiumicino: tren Leonardo Express hasta Termini (unos 30 minutos). Los boletos de ATAC no sirven en ese tren.$q$, false, 3),
  ('IT', 'propinas', $q$Propinas$q$, $q$En la cuenta: muchos restaurantes cobran «coperto» (cubierto, por persona) y a veces «servizio».
Propina: no es obligatoria; si querés, redondeá o dejá unas monedas.$q$, false, 4),
  ('IT', 'enchufes', $q$Enchufes$q$, $q$Tomas: tipo C, F y L. El L tiene tres agujeros en línea; la ficha C entra en todos.
Tensión: 230 V, como en Argentina.
Qué llevar: el adaptador de ficha argentina a tipo C.$q$, false, 5),
  ('IT', 'frases', $q$Frases útiles (italiano)$q$, $q$Hola: Ciao / Buongiorno
Gracias: Grazie
Por favor: Per favore
¿Cuánto cuesta?: Quanto costa?
La cuenta, por favor: Il conto, per favore$q$, false, 6)
) as v(country, section, title, body, needs_check, sort)
where t.slug = 'viaje-2026';

commit;
