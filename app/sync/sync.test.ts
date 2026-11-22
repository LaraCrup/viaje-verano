import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { getDb, setDb, TripDB, type SyncTable } from './db'
import { enqueue, flush, pendingCount, softDelete } from './outbox'
import { applyRemoteRows, pullAll } from './pull'
import type { Remote, RemoteResult } from './remote'

const TRIP = 'trip-1'

/** Servidor falso en memoria que imita las reglas de la base (versión + gana la última edición). */
class FakeServer implements Remote {
  rows = new Map<string, Record<string, any>>()
  online = true
  reject: string | null = null
  clock = 0

  private key(t: string, id: string) {
    return `${t}:${id}`
  }

  async upsert(table: SyncTable, row: Record<string, unknown>): Promise<RemoteResult> {
    if (!this.online) return { kind: 'network', message: 'Failed to fetch' }
    if (this.reject) return { kind: 'rejected', message: this.reject }
    const k = this.key(table, row.id as string)
    const old = this.rows.get(k)
    if (old && old.client_updated_at && row.client_updated_at && (row.client_updated_at as string) < old.client_updated_at) {
      return { kind: 'ok', row: null }
    }
    const next = { ...old, ...row, version: (old?.version ?? 0) + 1, updated_at: new Date(Date.UTC(2027, 0, 1, 0, 0, ++this.clock)).toISOString() }
    this.rows.set(k, next)
    return { kind: 'ok', row: next }
  }
  update(table: SyncTable, row: Record<string, unknown>) {
    return this.upsert(table, row)
  }
  async fetchOne(table: SyncTable, id: string): Promise<RemoteResult> {
    if (!this.online) return { kind: 'network', message: 'offline' }
    return { kind: 'ok', row: this.rows.get(this.key(table, id)) ?? null }
  }
  async select(table: string, _trip: string, since: string | null, offset: number, limit: number) {
    if (!this.online) return { kind: 'network' as const, message: 'offline' }
    const rows = [...this.rows.entries()]
      .filter(([k]) => k.startsWith(`${table}:`))
      .map(([, r]) => r)
      .filter(r => !since || r.updated_at > since)
      .sort((a, b) => (a.updated_at < b.updated_at ? -1 : 1))
    return { kind: 'ok' as const, rows: rows.slice(offset, offset + limit) }
  }
  /** Otra amiga edita directo en el servidor. */
  editAsOther(table: string, id: string, patch: Record<string, unknown>) {
    const k = this.key(table, id)
    const old = this.rows.get(k)!
    this.rows.set(k, { ...old, ...patch, version: old.version + 1, updated_at: new Date(Date.UTC(2027, 0, 1, 0, 0, ++this.clock)).toISOString() })
  }
}

let n = 0
const clockAt = (iso: string) => () => iso

beforeEach(async () => {
  setDb(new TripDB(`test-${++n}`))
})

describe('cola de cambios offline', () => {
  it('guarda al instante en el celular aunque no haya señal', async () => {
    const server = new FakeServer()
    server.online = false
    await enqueue('plans', { id: 'p1', trip_id: TRIP, title: 'Mónaco' })
    expect((await getDb().plans.get('p1'))?.title).toBe('Mónaco')
    expect(await flush(server)).toBe('offline')
    expect(await pendingCount()).toBe(1)
    expect((await getDb().outbox.toArray())[0]!.attempts).toBe(1)
  })

  it('al volver la señal manda todo en orden y vacía la cola', async () => {
    const server = new FakeServer()
    server.online = false
    await enqueue('plans', { id: 'p1', trip_id: TRIP, title: 'A' })
    await enqueue('plans', { id: 'p2', trip_id: TRIP, title: 'B' })
    await flush(server)
    server.online = true
    expect(await flush(server)).toBe('done')
    expect(await pendingCount()).toBe(0)
    expect(server.rows.size).toBe(2)
    expect((await getDb().plans.get('p1'))?.version).toBe(1)
  })

  it('varias ediciones de la misma fila sin señal se mandan como una sola', async () => {
    const server = new FakeServer()
    server.online = false
    await enqueue('plans', { id: 'p1', trip_id: TRIP, title: 'A' })
    await enqueue('plans', { id: 'p1', trip_id: TRIP, title: 'AB' })
    await enqueue('plans', { id: 'p1', trip_id: TRIP, title: 'ABC' })
    expect(await pendingCount()).toBe(1)
    server.online = true
    await flush(server)
    expect(server.rows.get('plans:p1')!.title).toBe('ABC')
    expect(server.rows.get('plans:p1')!.version).toBe(1)
  })

  it('reintentar no duplica (el id lo genera el celular)', async () => {
    const server = new FakeServer()
    await enqueue('plans', { id: 'p1', trip_id: TRIP, title: 'A' })
    await flush(server)
    await enqueue('plans', { id: 'p1', trip_id: TRIP, title: 'A' })
    await flush(server)
    expect(server.rows.size).toBe(1)
  })

  it('avisa si otra amiga editó lo mismo en el medio (y queda la versión más nueva)', async () => {
    const server = new FakeServer()
    await enqueue('expenses', { id: 'e1', trip_id: TRIP, description: 'Cena' }, { clock: clockAt('2027-01-06T20:00:00Z') })
    await flush(server)
    // Juli lo edita en su celular
    server.editAsOther('expenses', 'e1', { description: 'Cena (Juli)', client_updated_at: '2027-01-06T20:05:00Z' })
    // Lara, sin haber bajado eso, lo edita después
    const local = await getDb().expenses.get('e1')
    await enqueue('expenses', { ...local!, description: 'Cena (Lara)' } as any, { clock: clockAt('2027-01-06T20:10:00Z') })
    const avisos: string[] = []
    await flush(server, { onConcurrentEdit: (_i, row) => avisos.push(row.description) })
    expect(avisos).toEqual(['Cena (Lara)'])
    expect(server.rows.get('expenses:e1')!.description).toBe('Cena (Lara)')
  })

  it('una edición vieja que llega tarde se descarta y se trae la del servidor', async () => {
    const server = new FakeServer()
    await enqueue('expenses', { id: 'e1', trip_id: TRIP, description: 'Taxi' }, { clock: clockAt('2027-01-06T10:00:00Z') })
    await flush(server)
    server.editAsOther('expenses', 'e1', { description: 'Taxi al aeropuerto', client_updated_at: '2027-01-06T12:00:00Z' })
    // Este celular editó a las 11 pero recién ahora tiene señal
    await enqueue('expenses', { id: 'e1', trip_id: TRIP, description: 'Taxi viejo' }, { clock: clockAt('2027-01-06T11:00:00Z') })
    const descartadas: string[] = []
    await flush(server, { onSuperseded: (_i, row) => descartadas.push(row?.description) })
    expect(descartadas).toEqual(['Taxi al aeropuerto'])
    expect((await getDb().expenses.get('e1'))?.description).toBe('Taxi al aeropuerto')
  })

  it('si la base rechaza un cambio, se avisa, se guarda aparte y se vuelve a lo del servidor', async () => {
    const server = new FakeServer()
    server.reject = 'Lo pagado (2900) no suma el total (3000)'
    await enqueue('expenses', { id: 'e9', trip_id: TRIP, description: 'Mal' })
    const errores: string[] = []
    await flush(server, { onRejected: (_i, m) => errores.push(m) })
    expect(errores[0]).toMatch(/no suma/)
    expect(await pendingCount()).toBe(0)
    expect(await getDb().failed.count()).toBe(1)
    expect(await getDb().expenses.get('e9')).toBeUndefined()
  })

  it('borrar es lógico y se sincroniza', async () => {
    const server = new FakeServer()
    await enqueue('plans', { id: 'p1', trip_id: TRIP, title: 'A' })
    await flush(server)
    await softDelete('plans', (await getDb().plans.get('p1'))!)
    await flush(server)
    expect(server.rows.get('plans:p1')!.deleted_at).toBeTruthy()
  })
})

describe('bajada de cambios', () => {
  it('trae todo la primera vez y después solo lo nuevo', async () => {
    const server = new FakeServer()
    await server.upsert('plans', { id: 'p1', trip_id: TRIP, title: 'A' })
    await server.upsert('days', { id: 'd1', trip_id: TRIP, date: '2027-01-06' })
    await pullAll(server, TRIP)
    expect(await getDb().plans.count()).toBe(1)
    expect(await getDb().days.count()).toBe(1)
    server.editAsOther('plans', 'p1', { title: 'A editado' })
    await pullAll(server, TRIP)
    expect((await getDb().plans.get('p1'))?.title).toBe('A editado')
  })

  it('no pisa cambios locales que todavía no se mandaron', async () => {
    const server = new FakeServer()
    await server.upsert('plans', { id: 'p1', trip_id: TRIP, title: 'Servidor' })
    server.online = true
    const offline = new FakeServer()
    offline.online = false
    await enqueue('plans', { id: 'p1', trip_id: TRIP, title: 'Local' })
    await flush(offline)
    await pullAll(server, TRIP)
    expect((await getDb().plans.get('p1'))?.title).toBe('Local')
  })

  it('ignora versiones viejas que llegan desordenadas por Realtime', async () => {
    await applyRemoteRows('plans', [{ id: 'p1', trip_id: TRIP, title: 'v3', version: 3 }])
    await applyRemoteRows('plans', [{ id: 'p1', trip_id: TRIP, title: 'v2', version: 2 }])
    expect((await getDb().plans.get('p1'))?.title).toBe('v3')
  })

  it('normaliza el tipo de cambio a texto exacto', async () => {
    await applyRemoteRows('expenses', [{ id: 'e1', trip_id: TRIP, fx_rate: 0.000689655172, amount_minor: 100 }])
    expect((await getDb().expenses.get('e1'))?.fx_rate).toBe('0.000689655172')
  })

  it('sin señal no avanza el cursor', async () => {
    const server = new FakeServer()
    server.online = false
    expect(await pullAll(server, TRIP)).toBe('offline')
  })
})
