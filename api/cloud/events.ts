function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const BLOB_PATH = 'cloud-events.json'
const EVENT_CODE = /^(begin|pin_unlock)_([A-Za-z0-9-]+)_(\d{10,})$/

type EventStore = {
  counters: { begin: number; pin_unlock: number }
  seen: Record<string, true>
}

function emptyEvents(): EventStore {
  return { counters: { begin: 0, pin_unlock: 0 }, seen: {} }
}

async function loadEvents(): Promise<EventStore> {
  try {
    const { get } = await import('@vercel/blob')
    const file = await get(BLOB_PATH, { access: 'private' })
    if (!file || file.statusCode !== 200 || !file.stream) return emptyEvents()
    const parsed = JSON.parse(await new Response(file.stream).text()) as Partial<EventStore>
    return {
      counters: {
        begin: Number(parsed.counters?.begin) || 0,
        pin_unlock: Number(parsed.counters?.pin_unlock) || 0,
      },
      seen: parsed.seen && typeof parsed.seen === 'object' ? parsed.seen : {},
    }
  } catch {
    return emptyEvents()
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { code?: string }
    const code = String(payload.code ?? '').trim()
    const match = EVENT_CODE.exec(code)
    if (!match) return json({ stored: false })
    const eventId = match[1] as 'begin' | 'pin_unlock'
    const store = await loadEvents()
    if (store.seen[code]) return json({ stored: false })
    store.seen[code] = true
    store.counters[eventId] += 1
    const { put } = await import('@vercel/blob')
    await put(BLOB_PATH, JSON.stringify(store), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    return json({ stored: true })
  } catch {
    return json({ stored: false }, 400)
  }
}
