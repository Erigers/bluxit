import { readJson, writeJson } from './json-store'

export type RatingStats = {
  count: number
  average: number
  histogram: [number, number, number, number, number]
}

type RatingRow = { stars: number; at: string }
type RatingStore = { byDevice: Record<string, RatingRow> }

const BLOB_PATH = 'cloud-ratings.json'
const FS_REL = '../../data/cloud-ratings.json'
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

function parseStore(raw: RatingStore | Partial<RatingStore> | null): RatingStore {
  if (!raw?.byDevice || typeof raw.byDevice !== 'object') return emptyStore()
  const byDevice: Record<string, RatingRow> = {}
  for (const [id, row] of Object.entries(raw.byDevice)) {
    const stars = clampStars(row?.stars)
    if (!stars) continue
    byDevice[id] = { stars, at: typeof row.at === 'string' ? row.at : new Date().toISOString() }
  }
  return { byDevice }
}

async function readStore(): Promise<RatingStore> {
  return parseStore(await readJson<RatingStore | null>(BLOB_PATH, null, FS_REL))
}

async function writeStore(store: RatingStore): Promise<void> {
  await writeJson(BLOB_PATH, store, FS_REL)
}

export async function getRatingStats(): Promise<RatingStats> {
  return summarize(await readStore())
}

export async function saveRating(
  deviceId: string,
  starsInput: unknown,
): Promise<RatingStats | { error: string; status: number }> {
  const stars = clampStars(starsInput)
  if (!stars) return { error: 'Pick 1 to 5 stars.', status: 400 }
  if (!DEVICE_RE.test(deviceId)) return { error: 'Missing device.', status: 400 }
  const store = await readStore()
  store.byDevice[deviceId] = { stars, at: new Date().toISOString() }
  await writeStore(store)
  return summarize(store)
}
