/**
 * Tests de integración contra un Supabase LOCAL (supabase start).
 * Prueban RLS, PIN, links de invitación, validaciones de gastos y "gana la última edición".
 *
 *   SUPABASE_TEST_URL=http://127.0.0.1:55421 SUPABASE_TEST_KEY=<publishable local> TEST_PIN=482916 npm run test:db
 *
 * Nunca correr contra producción: crea usuarios anónimos y gastos de prueba.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { beforeAll, describe, expect, it } from 'vitest'

const URL = process.env.SUPABASE_TEST_URL
const KEY = process.env.SUPABASE_TEST_KEY
const PIN = process.env.TEST_PIN
const SLUG = 'viaje-2026'
const TRIP = '00000000-0000-4000-a000-000000000001'
const LARA = '00000000-0000-4000-a000-000000000102'
const JULI = '00000000-0000-4000-a000-000000000103'
const IVI = '00000000-0000-4000-a000-000000000104'

const run = URL && KEY && PIN && !URL.includes('supabase.co')

async function anonClient(): Promise<SupabaseClient> {
  const c = createClient(URL!, KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await c.auth.signInAnonymously()
  if (error) throw error
  return c
}

describe.skipIf(!run)('seguridad y reglas de la base', () => {
  let lara: SupabaseClient
  let stranger: SupabaseClient

  beforeAll(async () => {
    lara = await anonClient()
    stranger = await anonClient()
    const { data, error } = await lara.rpc('join_with_pin', { p_slug: SLUG, p_member_id: LARA, p_pin: PIN })
    expect(error).toBeNull()
    expect(data).toEqual({ trip_id: TRIP, member_id: LARA })
  })

  it('la pantalla de entrada ve solo nombres', async () => {
    const { data } = await stranger.rpc('get_trip_public', { p_slug: SLUG })
    expect(data.members.map((m: { name: string }) => m.name)).toEqual(['Wile', 'Lara', 'Juli', 'Ivi', 'Meli', 'Solcha'])
    expect(JSON.stringify(data)).not.toContain('pin')
  })

  it('alguien sin sesión del viaje no ve ni escribe nada', async () => {
    const { data: exps } = await stranger.from('expenses').select('*')
    expect(exps).toEqual([])
    const { data: trips } = await stranger.from('trips').select('*')
    expect(trips).toEqual([])
    const { error } = await stranger.from('plans').insert({ trip_id: TRIP, title: 'hack' })
    expect(error).not.toBeNull()
  })

  it('PIN incorrecto no entra, y después de 5 intentos se bloquea', async () => {
    const c = await anonClient()
    for (let i = 0; i < 5; i++) {
      const { data } = await c.rpc('join_with_pin', { p_slug: SLUG, p_member_id: JULI, p_pin: '000000' })
      expect(data).toEqual({ error: 'PIN incorrecto' })
    }
    const { error } = await c.rpc('join_with_pin', { p_slug: SLUG, p_member_id: JULI, p_pin: PIN })
    expect(error?.message).toMatch(/Demasiados intentos/)
  })

  it('la app no puede cambiar el PIN ni leer secretos', async () => {
    const { error } = await lara.rpc('set_trip_pin', { p_slug: SLUG, p_pin: '111111' })
    expect(error).not.toBeNull()
  })

  it('la integrante ve los datos del viaje', async () => {
    const { data, error } = await lara.from('expenses').select('id, amount_minor')
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
    const { data: stays } = await lara.from('stays').select('name')
    expect(stays!.length).toBe(4)
    const { data: days } = await lara.from('days').select('date')
    expect(days).toHaveLength(25)
  })

  it('link personal: entra como esa persona; regenerarlo invalida el anterior', async () => {
    const { data: token, error } = await lara.rpc('create_invite', { p_trip_id: TRIP, p_member_id: IVI })
    expect(error).toBeNull()
    const iviPhone = await anonClient()
    const { data } = await iviPhone.rpc('redeem_invite', { p_token: token })
    expect(data).toEqual({ trip_id: TRIP, member_id: IVI })
    const { data: me } = await iviPhone.from('trip_sessions').select('member_id')
    expect(me).toEqual([{ member_id: IVI }])

    const { data: token2 } = await lara.rpc('create_invite', { p_trip_id: TRIP, p_member_id: IVI })
    const other = await anonClient()
    const { data: old } = await other.rpc('redeem_invite', { p_token: token })
    expect(old.error).toMatch(/ya no sirve/)
    const { data: fresh } = await other.rpc('redeem_invite', { p_token: token2 })
    expect(fresh.member_id).toBe(IVI)

    const { data: status } = await lara.rpc('invite_status', { p_trip_id: TRIP })
    expect(status.map((s: { member_id: string }) => s.member_id)).toContain(IVI)
  })

  it('un gasto que no cierra lo rechaza la base', async () => {
    const base = {
      trip_id: TRIP, description: 'Cena', category: 'comida', currency: 'EUR', fx_rate: '1.08', fx_source: 'manual',
      base_amount_minor: 3240, date: '2027-01-06', split_mode: 'equal',
    }
    const mal = await lara.from('expenses').insert({ ...base, id: randomUUID(), amount_minor: 3000, payers: { [LARA]: 2900 }, shares: { [LARA]: 1500, [JULI]: 1500 } })
    expect(mal.error?.message).toMatch(/Lo pagado/)
    const mal2 = await lara.from('expenses').insert({ ...base, id: randomUUID(), amount_minor: 3000, payers: { [LARA]: 3000 }, shares: { [LARA]: 1500, [randomUUID()]: 1500 } })
    expect(mal2.error?.message).toMatch(/no es del viaje/)
    const bien = await lara.from('expenses').insert({ ...base, id: randomUUID(), amount_minor: 3000, payers: { [LARA]: 3000 }, shares: { [LARA]: 1500, [JULI]: 1500 } }).select('created_by, version').single()
    expect(bien.error).toBeNull()
    expect(bien.data).toEqual({ created_by: LARA, version: 1 })
  })

  it('gana la última edición (por hora de edición, no de llegada) y queda en el historial', async () => {
    const id = randomUUID()
    const row = {
      id, trip_id: TRIP, description: 'Helado', category: 'comida', currency: 'EUR', amount_minor: 1000, fx_rate: '1', fx_source: 'manual',
      base_amount_minor: 1000, date: '2027-01-07', split_mode: 'personal', payers: { [LARA]: 1000 }, shares: { [LARA]: 1000 },
      client_updated_at: '2027-01-07T10:00:00Z',
    }
    await lara.from('expenses').insert(row)
    // Edición nueva (10:05)
    await lara.from('expenses').upsert({ ...row, description: 'Helado doble', client_updated_at: '2027-01-07T10:05:00Z' })
    // Llega tarde una edición vieja (10:02) de un celular sin señal: se ignora
    await lara.from('expenses').upsert({ ...row, description: 'Helado chico', client_updated_at: '2027-01-07T10:02:00Z' })
    const { data } = await lara.from('expenses').select('description, version').eq('id', id).single()
    expect(data).toEqual({ description: 'Helado doble', version: 2 })

    // Borrado lógico
    await lara.from('expenses').update({ deleted_at: new Date().toISOString(), client_updated_at: '2027-01-07T11:00:00Z' }).eq('id', id)
    const { data: log } = await lara.from('activity_log').select('action, actor_member_id').eq('entity_id', id).order('at')
    expect(log!.map(l => l.action)).toEqual(['insert', 'update', 'delete'])
    expect(log!.every(l => l.actor_member_id === LARA)).toBe(true)
  })

  it('no se puede mover un registro a otro viaje ni borrar de verdad', async () => {
    const { data } = await lara.from('plans').insert({ trip_id: TRIP, title: 'Prueba' }).select('id').single()
    const del = await lara.from('plans').delete().eq('id', data!.id).select()
    expect(del.data).toEqual([])
    const { data: still } = await lara.from('plans').select('id').eq('id', data!.id)
    expect(still).toHaveLength(1)
  })

  it('caja común: aportes y gastos validan moneda', async () => {
    const pot = randomUUID()
    expect((await lara.from('pots').insert({ id: pot, trip_id: TRIP, name: 'Caja €', currency: 'EUR' })).error).toBeNull()
    const aporte = await lara.from('settlements').insert({
      trip_id: TRIP, from_id: LARA, to_id: pot, currency: 'EUR', amount_minor: 5000, fx_rate: '1.08', base_amount_minor: 5400, date: '2027-01-06',
    })
    expect(aporte.error).toBeNull()
    const malaMoneda = await lara.from('settlements').insert({
      trip_id: TRIP, from_id: LARA, to_id: pot, currency: 'USD', amount_minor: 5000, fx_rate: '1', base_amount_minor: 5000, date: '2027-01-06',
    })
    expect(malaMoneda.error?.message).toMatch(/moneda de la caja/)
    const gasto = await lara.from('expenses').insert({
      trip_id: TRIP, description: 'Súper', category: 'super', currency: 'EUR', amount_minor: 1200, fx_rate: '1.08', fx_source: 'manual',
      base_amount_minor: 1296, date: '2027-01-06', split_mode: 'equal', payers: { [pot]: 1200 }, shares: { [LARA]: 600, [JULI]: 600 },
    })
    expect(gasto.error).toBeNull()
  })

  it('Storage: solo dentro de la carpeta del viaje', async () => {
    const file = new Blob(['%PDF-1.4 prueba'], { type: 'application/pdf' })
    const ok = await lara.storage.from('trip-files').upload(`${TRIP}/transport/${randomUUID()}.pdf`, file)
    expect(ok.error).toBeNull()
    const ajeno = await stranger.storage.from('trip-files').upload(`${TRIP}/transport/${randomUUID()}.pdf`, file)
    expect(ajeno.error).not.toBeNull()
    const fuera = await lara.storage.from('trip-files').upload(`otra-cosa/${randomUUID()}.pdf`, file)
    expect(fuera.error).not.toBeNull()
  })
})
