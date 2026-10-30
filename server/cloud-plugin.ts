import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Connect, Plugin } from 'vite'

type CloudType = { name: string; color: string }
type CloudAccount = {
  name: string
  color: string
  currency: string
  types: CloudType[]
}
type CloudRecord = {
  id: string
  name: string
  ownerId: string
  authorUsername: string | null
  publishedAt: string
  accounts: CloudAccount[]
}

const DATA_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/cloud-templates.json')
const EVENTS_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/cloud-events.json')
const EVENT_CODE = /^(begin|pin_unlock)_([A-Za-z0-9-]+)_(\d{10,})$/
const EVENT_LIMIT = 100
const EVENT_WINDOW_MS = 60_000
const eventHits = new Map<string, number[]>()

type EventStore = {
  counters: { begin: number; pin_unlock: number }
  seen: Record<string, true>
}

function publicView(record: CloudRecord) {
  return {
    id: record.id,
    name: record.name,
    authorUsername: record.authorUsername,
    publishedAt: record.publishedAt,
    accounts: record.accounts,
  }
}

function load(): CloudRecord[] {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8')
    const parsed = JSON.parse(raw) as CloudRecord[]
    if (Array.isArray(parsed)) return parsed.filter((r) => !String(r.id).startsWith('seed-'))
  } catch {
    /* first run */
  }
  save([])
  return []
}

function save(records: CloudRecord[]) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
  fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2))
}

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function emptyEvents(): EventStore {
  return { counters: { begin: 0, pin_unlock: 0 }, seen: {} }
}

function loadEvents(): EventStore {
  try {
    const raw = fs.readFileSync(EVENTS_FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<EventStore>
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

function saveEvents(store: EventStore) {
  fs.mkdirSync(path.dirname(EVENTS_FILE), { recursive: true })
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(store, null, 2))
}

function clientKey(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress ?? 'unknown'
}

function allowEvent(req: IncomingMessage): boolean {
  const now = Date.now()
  const key = clientKey(req)
  const recent = (eventHits.get(key) ?? []).filter((t) => now - t < EVENT_WINDOW_MS)
  if (recent.length >= EVENT_LIMIT) {
    eventHits.set(key, recent)
    return false
  }
  recent.push(now)
  eventHits.set(key, recent)
  return true
}

function sanitizeAccounts(input: unknown): CloudAccount[] {
  if (!Array.isArray(input)) return []
  return input
    .map((row) => {
      const account = row as Partial<CloudAccount>
      return {
        name: String(account.name ?? '').trim(),
        color: String(account.color ?? '#4eb8ea'),
        currency: String(account.currency ?? 'USD') || 'USD',
        types: Array.isArray(account.types)
          ? account.types
              .map((t) => ({
                name: String((t as CloudType).name ?? '').trim(),
                color: String((t as CloudType).color ?? '#64748b'),
              }))
              .filter((t) => t.name)
          : [],
      }
    })
    .filter((account) => account.name)
}

const handler: Connect.NextHandleFunction = (req, res, next) => {
  const rawUrl = req.url ?? ''
  const q = rawUrl.indexOf('?')
  const pathname = q === -1 ? rawUrl : rawUrl.slice(0, q)
  if (!pathname.startsWith('/api/cloud')) {
    next()
    return
  }

  void (async () => {
    const method = (req.method ?? 'GET').toUpperCase()
    const rest = pathname.slice('/api/cloud'.length)

    if (method === 'POST' && rest === '/events') {
      if (!allowEvent(req)) {
        send(res, 429, { error: 'Too many events' })
        return
      }
      const payload = JSON.parse((await readBody(req)) || '{}') as { code?: string }
      const code = String(payload.code ?? '').trim()
      const match = EVENT_CODE.exec(code)
      if (!match) {
        send(res, 200, { stored: false })
        return
      }
      const eventId = match[1] as 'begin' | 'pin_unlock'
      const store = loadEvents()
      if (store.seen[code]) {
        send(res, 200, { stored: false })
        return
      }
      store.seen[code] = true
      store.counters[eventId] += 1
      saveEvents(store)
      send(res, 200, { stored: true })
      return
    }

    const listMatch = rest === '/templates'
    const itemMatch = rest.match(/^\/templates\/([^/]+)$/)
    const records = load()

    if (method === 'GET' && listMatch) {
      send(res, 200, records.map(publicView))
      return
    }

    if (method === 'GET' && itemMatch) {
      const found = records.find((r) => r.id === itemMatch[1])
      if (!found) {
        send(res, 404, { error: 'Not found' })
        return
      }
      send(res, 200, publicView(found))
      return
    }

    if (method === 'POST' && listMatch) {
      const payload = JSON.parse((await readBody(req)) || '{}') as {
        name?: string
        ownerId?: string
        username?: string
        anonymous?: boolean
        accounts?: unknown
      }
      const name = String(payload.name ?? '').trim()
      const ownerId = String(payload.ownerId ?? '').trim()
      if (!name || !ownerId) {
        send(res, 400, { error: 'Name and owner are required.' })
        return
      }
      const record: CloudRecord = {
        id: crypto.randomUUID(),
        name,
        ownerId,
        authorUsername: payload.anonymous ? null : String(payload.username ?? '').trim() || null,
        publishedAt: new Date().toISOString(),
        accounts: sanitizeAccounts(payload.accounts),
      }
      save([record, ...records])
      send(res, 201, publicView(record))
      return
    }

    if (method === 'PUT' && itemMatch) {
      const payload = JSON.parse((await readBody(req)) || '{}') as {
        name?: string
        ownerId?: string
        username?: string
        anonymous?: boolean
        accounts?: unknown
      }
      const found = records.find((r) => r.id === itemMatch[1])
      const ownerId = String(payload.ownerId ?? '').trim()
      if (!found || found.ownerId !== ownerId) {
        send(res, 403, { error: 'You can only update a template you shared.' })
        return
      }
      const next: CloudRecord = {
        ...found,
        name: String(payload.name ?? found.name).trim() || found.name,
        authorUsername: payload.anonymous ? null : String(payload.username ?? '').trim() || null,
        accounts: sanitizeAccounts(payload.accounts),
      }
      save(records.map((r) => (r.id === next.id ? next : r)))
      send(res, 200, publicView(next))
      return
    }

    if (method === 'DELETE' && itemMatch) {
      const payload = JSON.parse((await readBody(req)) || '{}') as { ownerId?: string }
      const found = records.find((r) => r.id === itemMatch[1])
      const ownerId = String(payload.ownerId ?? '').trim()
      if (!found || found.ownerId !== ownerId) {
        send(res, 403, { error: 'You can only remove a template you shared.' })
        return
      }
      save(records.filter((r) => r.id !== found.id))
      send(res, 200, { ok: true })
      return
    }

    send(res, 404, { error: 'Unknown cloud route' })
  })().catch((err: unknown) => {
    send(res, 500, { error: err instanceof Error ? err.message : 'Cloud error' })
  })
}

export function cloudApiPlugin(): Plugin {
  return {
    name: 'bluxit-cloud-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}
