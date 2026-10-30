import { readJson, writeJson } from './json-store'

const BLOB_PATH = 'cloud-events.json'
const FS_REL = '../../data/cloud-events.json'
const EVENT_CODE = /^(begin|pin_unlock)_([A-Za-z0-9-]+)_(\d{10,})$/

type EventStore = {
  counters: { begin: number; pin_unlock: number }
  seen: Record<string, true>
}

function emptyEvents(): EventStore {
  return { counters: { begin: 0, pin_unlock: 0 }, seen: {} }
}

async function loadEvents(): Promise<EventStore> {
  const parsed = await readJson<Partial<EventStore> | null>(BLOB_PATH, null, FS_REL)
  if (!parsed) return emptyEvents()
  return {
    counters: {
      begin: Number(parsed.counters?.begin) || 0,
      pin_unlock: Number(parsed.counters?.pin_unlock) || 0,
    },
    seen: parsed.seen && typeof parsed.seen === 'object' ? parsed.seen : {},
  }
}

export async function storeEvent(code: string) {
  const match = EVENT_CODE.exec(code)
  if (!match) return { stored: false }
  const eventId = match[1] as 'begin' | 'pin_unlock'
  const store = await loadEvents()
  if (store.seen[code]) return { stored: false }
  store.seen[code] = true
  store.counters[eventId] += 1
  await writeJson(BLOB_PATH, store, FS_REL)
  return { stored: true }
}
