function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type RatingStats = {
  count: number
  average: number
  histogram: [number, number, number, number, number]
}
type RatingRow = { stars: number; at: string }
type RatingStore = { byDevice: Record<string, RatingRow> }

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

function summarize(store: RatingStore): RatingStats {
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

async function readStore(): Promise<RatingStore> {
  try {
    const { get } = await import('@vercel/blob')
    const file = await get(BLOB_PATH, { access: 'private' })
    if (!file || file.statusCode !== 200 || !file.stream) return emptyStore()
    return parseStore(await new Response(file.stream).text())
  } catch {
    return emptyStore()
  }
}

async function writeStore(store: RatingStore) {
  const { put } = await import('@vercel/blob')
  await put(BLOB_PATH, JSON.stringify(store), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export async function GET() {
  return json(summarize(await readStore()))
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { deviceId?: string; stars?: unknown }
    const stars = clampStars(payload.stars)
    const deviceId = String(payload.deviceId ?? '')
    if (!stars) return json({ error: 'Pick 1 to 5 stars.' }, 400)
    if (!DEVICE_RE.test(deviceId)) return json({ error: 'Missing device.' }, 400)
    const store = await readStore()
    store.byDevice[deviceId] = { stars, at: new Date().toISOString() }
    await writeStore(store)
    return json(summarize(store))
  } catch {
    return json({ error: 'Could not save that rating.' }, 400)
  }
}
