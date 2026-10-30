import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export type RatingStats = {
  count: number
  average: number
  histogram: [number, number, number, number, number]
}

type RatingRow = { stars: number; at: string }
type RatingStore = { byDevice: Record<string, RatingRow> }

const DATA_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/cloud-ratings.json')
const BLOB_PATH = 'cloud-ratings.json'
const DEVICE_RE = /^[A-Za-z0-9-]{8,80}$/

function emptyStore(): RatingStore {
  return { byDevice: {} }
}

function clampStars(value: unknown): number | null {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 5) return null
  return n
}

export function summarize(store: RatingStore): RatingStats {
  const histogram: RatingStats['histogram'] = [0, 0, 0, 0, 0]
  let sum = 0
  let count = 0
  for (const row of Object.values(store.byDevice)) {
    if (row.stars < 1 || row.stars > 5) continue
    histogram[row.stars - 1] += 1
    sum += row.stars
    count += 1
  }
  return {
    count,
    average: count ? Math.round((sum / count) * 10) / 10 : 0,
    histogram,
  }
}

function parseStore(raw: string): RatingStore {
  try {
    const parsed = JSON.parse(raw) as Partial<RatingStore>
    if (!parsed.byDevice || typeof parsed.byDevice !== 'object') return emptyStore()
    const byDevice: Record<string, RatingRow> = {}
    for (const [id, row] of Object.entries(parsed.byDevice)) {
      const stars = clampStars(row?.stars)
      if (!stars) continue
      byDevice[id] = { stars, at: typeof row.at === 'string' ? row.at : new Date().toISOString() }
    }
    return { byDevice }
  } catch {
    return emptyStore()
  }
}

function useBlob() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)
}

async function readStore(): Promise<RatingStore> {
  if (useBlob()) {
    try {
      const { get } = await import('@vercel/blob')
      const file = await get(BLOB_PATH, { access: 'private' })
      if (!file || file.statusCode !== 200 || !file.stream) return emptyStore()
      const text = await new Response(file.stream).text()
      return parseStore(text)
    } catch {
      return emptyStore()
    }
  }
  try {
    return parseStore(fs.readFileSync(DATA_FILE, 'utf8'))
  } catch {
    return emptyStore()
  }
}

async function writeStore(store: RatingStore): Promise<void> {
  const body = JSON.stringify(store)
  if (useBlob()) {
    const { put } = await import('@vercel/blob')
    await put(BLOB_PATH, body, {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    return
  }
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2))
}

export async function getRatingStats(): Promise<RatingStats> {
  return summarize(await readStore())
}

export async function saveRating(deviceId: string, starsInput: unknown): Promise<RatingStats | { error: string; status: number }> {
  const stars = clampStars(starsInput)
  if (!stars) return { error: 'Pick 1 to 5 stars.', status: 400 }
  if (!DEVICE_RE.test(deviceId)) return { error: 'Missing device.', status: 400 }
  const store = await readStore()
  store.byDevice[deviceId] = { stars, at: new Date().toISOString() }
  await writeStore(store)
  return summarize(store)
}
