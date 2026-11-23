# Viaje Taglit · Israel · Madrid · Niza · Roma

App del viaje (21/12/2026 → 14/01/2027) para las 6. Tiene itinerario, traslados, alojamientos, gastos compartidos, planes con votaciones, listas, info por país, diario y un Wrapped al final.

Es un PWA (se instala desde el navegador) y funciona sin conexión.

- **Stack:** Nuxt 4 (SPA) + Tailwind v4 + Supabase (Postgres, Realtime, Storage, Anonymous Sign-In) + Dexie (IndexedDB) + @vite-pwa/nuxt.
- **Deploy:** Vercel. Sirve el SPA estático sin configuración, tiene previews por rama y ya se usa en otros proyectos.

---

## 1. Crear el proyecto de Supabase

1. Entrá a [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
   - **Nombre:** `viaje-2026`.
   - **Región:** Central EU (Frankfurt).
   - **Contraseña de la base:** generala y guardala.
2. Activá el ingreso sin cuenta: **Authentication → Sign In / Providers → Allow anonymous sign-ins → ON**.
3. Copiá la **Project URL** y la **Publishable key** desde **Connect** o **Project Settings → API Keys**. Nunca uses la secret key.
4. Cargá las tablas y los datos con una de estas dos opciones:
   - **Opción A:** pedile a Claude que aplique las migraciones con el conector de Supabase.
   - **Opción B:** en **SQL Editor**, pegá y corré en orden todos los archivos de `supabase/migrations/` (del `…01_schema` al último) y al final `supabase/seed.sql`.
5. Poné el PIN del grupo en el **SQL Editor**. Tiene que tener 6 dígitos o más, y nunca va al repo:
   ```sql
   select set_trip_pin('viaje-2026', 'TU_PIN');
   ```
   Esta función solo se puede correr desde el SQL Editor. La app no puede llamarla.

## 2. Correr la app

```bash
cp .env.example .env               # completar con la URL y la publishable key
npm install --legacy-peer-deps     # npm 10.9 tiene un bug con Nuxt 4 sin esta opción
npm run dev
```

> Node: Nuxt 4.6 pide Node ≥ 22.21. Con 22.14 funciona, pero avisa. Conviene actualizar.

## 3. Deploy en Vercel

1. Subí el repo a GitHub e importalo en Vercel. Detecta Nuxt solo.
2. En **Settings → Environment Variables**, cargá `NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY` y `NUXT_PUBLIC_TRIP_SLUG=viaje-2026`.
3. El plan free de Supabase pausa el proyecto después de 7 días sin uso. Si pasa, entrá al dashboard y tocá **Restore**. Durante el viaje se usa todos los días, así que no debería pausarse.

## 4. Invitar a las chicas

1. Pasales el link de la app y el PIN del grupo por privado.
2. Cada una abre la app, toca su nombre y pone el PIN (distingue mayúsculas de minúsculas).
3. Queda guardado en el celular: la próxima vez entra directo, aunque no tenga señal.
4. Cada una la agrega a la pantalla de inicio del iPhone: **Compartir → Agregar a inicio**. Así abre como una app y el celular no borra los datos guardados.

---

## Cómo está hecho

### Datos
- Todo cuelga de `trips`, así la base sirve para más de un viaje.
- Los montos son enteros en unidades menores (`bigint`): no se usan floats en ningún paso.
- Los horarios se guardan en UTC (`timestamptz`) junto con la zona IANA del lugar.
- Cada gasto es una sola fila. Quién pagó (`payers`) y cómo se dividió (`shares`) van en `jsonb`, así se guarda y sincroniza todo junto. Un trigger valida que lo pagado y lo dividido sumen el total.
- Los borrados son lógicos (`deleted_at`). `activity_log` guarda quién hizo cada cambio y cómo estaba antes, y se puede volver a una versión anterior desde la app.

### Seguridad
- Cada celular inicia una sesión anónima de Supabase. Para vincularla con una integrante usa la RPC `join_with_pin` (nombre + PIN, con bcrypt y límite de 5 intentos cada 10 minutos) (en la base también existe `redeem_invite`, para links personales, pero la app ya no lo usa).
- Las policies RLS hacen que solo las integrantes del viaje lean y escriban. No hay `DELETE`.
- Los votos y el "momento del día" solo los puede editar su dueña.
- Storage es privado, con rutas `{trip_id}/…`.

### Offline y sync (`app/sync`)
- **Lectura:** la UI siempre lee de IndexedDB.
- **Escritura:** cada cambio se guarda al instante en el celular y entra a una cola (`outbox`), que se manda en orden cuando hay señal. Los ids se generan en el celular, así que reintentar no duplica nada.
- **Conflictos:** gana la edición más reciente según cuándo se hizo (`client_updated_at`), no según cuándo llegó. Si alguien más había editado lo mismo, aparece un aviso. Nada se pierde, porque queda en el historial.
- **Bajada de cambios:** se trae solo lo que cambió (por `updated_at`, con 2 minutos de margen). Con conexión, Realtime trae los cambios al instante.
- **Cuándo sincroniza:** al abrir la app, al volver la señal, al volver a la app, después de cada cambio y cada 30 segundos. iPhone no tiene sincronización en segundo plano, por eso se manda al abrir.
- **Archivos:** quedan guardados en el celular. Las fotos se achican antes de subirse. **Más → Bajar todo** descarga lo que falte para usar sin conexión.

### Carpetas
```
app/            pantallas, componentes, composables, sync (Dexie + cola + bajada de cambios)
shared/money    lógica de gastos (funciones puras, testeadas)
shared/time     zonas horarias y calendario del viaje
shared/plans    votaciones
supabase/       migraciones + seed
tests/db        integración contra Supabase local (RLS, PIN, links, validaciones)
tests/e2e       Playwright en iPhone 14 y Pixel 7
```

## Tests

```bash
npm test                     # unitarios: gastos, redondeo, deudas, monedas, zonas horarias, sync, votos
supabase start               # Supabase local (Docker)
TEST_PIN=123456 npm run test:db     # seguridad de la base (el PIN local se setea con set_trip_pin)
npm run build && PORT=3200 node .output/server/index.mjs
E2E_BASE_URL=http://localhost:3200 TEST_PIN=123456 npm run test:e2e
```

Para ver cómo queda un día del viaje, abrí `/?fecha=2027-01-06`. Para volver a la fecha real, `/?fecha=hoy`.

## Datos pendientes (se completan desde la app)
- Alojamiento de Israel (30/12 → 02/01).
- Alojamiento de Madrid (02/01 → 05/01).
- Vuelo de vuelta desde Roma.
- Horas de llegada de IB1874, IB1217 y del micro a Roma.
- Direcciones, horarios de check-in, wifi y códigos de los alojamientos.
- Itinerario de Taglit (lo carga el programa).
- Info por país marcada "Falta verificar": emergencias, consulados, transporte y propinas.
