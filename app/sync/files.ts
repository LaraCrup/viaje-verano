/**
 * Archivos (pasajes, tarjetas de embarque, tickets, fotos).
 *
 * - La ruta se decide al momento de adjuntar, así la fila que la referencia se
 *   puede guardar enseguida aunque no haya señal; el archivo se sube después.
 * - Todo lo que se abre una vez queda guardado en el celular (IndexedDB) y se
 *   puede ver sin conexión. "Bajar todo" descarga lo que falte.
 * - Las fotos se achican antes de subir (roaming caro).
 */
import { sb, uuid } from '~/lib/supabase'
import { getDb } from './db'

const BUCKET = 'trip-files'

export function newFilePath(tripId: string, kind: string, mime: string): string {
  const ext = mime === 'application/pdf' ? 'pdf' : mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
  return `${tripId}/${kind}/${uuid()}.${ext}`
}

/** Achica una foto a 1600 px de lado y JPEG 0,78. Los PDF quedan igual. */
export async function compressIfImage(file: File | Blob): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.78))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

/** Guarda el archivo en el celular y lo deja listo para subir. */
export async function storeFile(tripId: string, kind: string, file: File | Blob) {
  const blob = await compressIfImage(file)
  const mime = blob.type || 'application/octet-stream'
  const path = newFilePath(tripId, kind, mime)
  await getDb().files.put({ path, blob, mime, cachedAt: new Date().toISOString(), pendingUpload: true })
  void uploadPendingFiles()
  return { path, mime, size: blob.size }
}

let uploading: Promise<void> | null = null

export function uploadPendingFiles(): Promise<void> {
  if (!uploading) {
    uploading = (async () => {
      const db = getDb()
      const pending = await db.files.filter(f => f.pendingUpload).toArray()
      for (const f of pending) {
        const { error } = await sb().storage.from(BUCKET).upload(f.path, f.blob, { contentType: f.mime, upsert: true })
        if (error && !/already exists|Duplicate/i.test(error.message)) break // sin señal: se reintenta después
        await db.files.update(f.path, { pendingUpload: false })
      }
    })().finally(() => (uploading = null))
  }
  return uploading
}

export async function isCached(path: string) {
  return !!(await getDb().files.get(path))
}

/** Devuelve una URL local para mostrar el archivo (lo baja y lo guarda si hace falta). */
export async function fileUrl(path: string): Promise<string | null> {
  const db = getDb()
  const cached = await db.files.get(path)
  if (cached) return URL.createObjectURL(cached.blob)
  const { data, error } = await sb().storage.from(BUCKET).download(path)
  if (error || !data) return null
  await db.files.put({ path, blob: data, mime: data.type, cachedAt: new Date().toISOString(), pendingUpload: false })
  return URL.createObjectURL(data)
}

/** "Bajar todo para usar sin conexión". Devuelve cuántos archivos se bajaron. */
export async function prefetchFiles(paths: string[], onProgress?: (done: number, total: number) => void): Promise<number> {
  const db = getDb()
  const missing: string[] = []
  for (const p of paths) if (!(await db.files.get(p))) missing.push(p)
  let done = 0
  for (const p of missing) {
    const { data } = await sb().storage.from(BUCKET).download(p)
    if (data) await db.files.put({ path: p, blob: data, mime: data.type, cachedAt: new Date().toISOString(), pendingUpload: false })
    onProgress?.(++done, missing.length)
  }
  return done
}
