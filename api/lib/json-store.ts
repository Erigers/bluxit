import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
}

export async function readJson<T>(blobPath: string, fallback: T, fsRel: string): Promise<T> {
  if (useBlob()) {
    try {
      const { get } = await import('@vercel/blob')
      const file = await get(blobPath, { access: 'private' })
      if (!file || file.statusCode !== 200 || !file.stream) return fallback
      const text = await new Response(file.stream).text()
      return JSON.parse(text) as T
    } catch {
      return fallback
    }
  }
  try {
    const full = path.resolve(path.dirname(fileURLToPath(import.meta.url)), fsRel)
    return JSON.parse(fs.readFileSync(full, 'utf8')) as T
  } catch {
    return fallback
  }
}

export async function writeJson(blobPath: string, value: unknown, fsRel: string): Promise<void> {
  const body = JSON.stringify(value)
  if (useBlob()) {
    const { put } = await import('@vercel/blob')
    await put(blobPath, body, { access: 'private', addRandomSuffix: false, allowOverwrite: true })
    return
  }
  const full = path.resolve(path.dirname(fileURLToPath(import.meta.url)), fsRel)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, JSON.stringify(value, null, 2))
}
