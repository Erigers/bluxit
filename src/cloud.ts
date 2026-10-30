import { CLOUD_KEY, EVENT_QUEUE_KEY, deviceId, uid } from './lib'
import type { AppState, CloudAccount, CloudTemplate, CloudType } from './types'

export type CloudShareDraft = {
  name: string
  accounts: CloudAccount[]
}

type CloudRecord = CloudTemplate & { ownerId: string }

function publicView(record: CloudRecord): CloudTemplate {
  return {
    id: record.id,
    name: record.name,
    authorUsername: record.authorUsername,
    publishedAt: record.publishedAt,
    accounts: record.accounts,
  }
}

function readLocal(): CloudRecord[] {
  try {
    const raw = localStorage.getItem(CLOUD_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CloudRecord[]
    return Array.isArray(parsed) ? parsed.filter((r) => !String(r.id).startsWith('seed-')) : []
  } catch {
    return []
  }
}

function writeLocal(records: CloudRecord[]) {
  localStorage.setItem(CLOUD_KEY, JSON.stringify(records))
}

type ApiResult<T> =
  | { kind: 'ok'; data: T }
  | { kind: 'http'; status: number }
  | { kind: 'down' }

async function request<T>(path: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api/cloud${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    })
    if (!res.ok) return { kind: 'http', status: res.status }
    if (res.status === 204) return { kind: 'ok', data: undefined as T }
    return { kind: 'ok', data: (await res.json()) as T }
  } catch {
    return { kind: 'down' }
  }
}

export function snapshotTemplate(
  state: AppState,
  userId: string,
  templateId: string,
): CloudShareDraft | null {
  const template = state.templates.find((t) => t.id === templateId && t.userId === userId)
  if (!template) return null
  const accounts = state.accounts.filter((a) => a.templateId === templateId)
  const assignments = state.expenseTypeAssignments.filter((a) => a.templateId === templateId)
  const types = state.expenseTypes.filter((t) => t.userId === userId)
  return {
    name: template.name,
    accounts: accounts.map((account) => ({
      name: account.name,
      color: account.color,
      currency: account.currency,
      types: assignments
        .filter((a) => a.accountId === account.id)
        .map((a) => types.find((t) => t.id === a.expenseTypeId))
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .map((t) => ({ name: t.name, color: t.color })),
    })),
  }
}

export function sanitizeDraft(draft: CloudShareDraft): CloudShareDraft {
  return {
    name: draft.name.trim() || 'Untitled',
    accounts: draft.accounts
      .map((account) => ({
        name: account.name.trim(),
        color: account.color,
        currency: account.currency || 'USD',
        types: account.types
          .map((t) => ({ name: t.name.trim(), color: t.color }))
          .filter((t) => t.name),
      }))
      .filter((account) => account.name),
  }
}

export async function listCloudTemplates(): Promise<CloudTemplate[]> {
  const remote = await request<CloudTemplate[]>('/templates')
  if (remote.kind === 'ok') return remote.data
  return readLocal().map(publicView)
}

export async function getCloudTemplate(id: string): Promise<CloudTemplate | null> {
  const remote = await request<CloudTemplate>(`/templates/${id}`)
  if (remote.kind === 'ok') return remote.data
  if (remote.kind === 'http') return null
  const found = readLocal().find((r) => r.id === id)
  return found ? publicView(found) : null
}

export async function publishCloudTemplate(input: {
  draft: CloudShareDraft
  ownerId: string
  username: string
  anonymous: boolean
  cloudId?: string | null
}): Promise<CloudTemplate | null> {
  const draft = sanitizeDraft(input.draft)
  const body = JSON.stringify({
    name: draft.name,
    ownerId: input.ownerId,
    username: input.username,
    anonymous: input.anonymous,
    accounts: draft.accounts,
  })
  const path = input.cloudId ? `/templates/${input.cloudId}` : '/templates'
  const method = input.cloudId ? 'PUT' : 'POST'
  const remote = await request<CloudTemplate>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body,
  })
  if (remote.kind === 'ok') return remote.data
  if (remote.kind === 'http') return null

  const records = readLocal()
  const existing = input.cloudId ? records.find((r) => r.id === input.cloudId) : undefined
  if (existing && existing.ownerId !== input.ownerId) return null
  const record: CloudRecord = {
    id: existing?.id ?? uid(),
    name: draft.name,
    ownerId: input.ownerId,
    authorUsername: input.anonymous ? null : input.username,
    publishedAt: existing?.publishedAt ?? new Date().toISOString(),
    accounts: draft.accounts,
  }
  writeLocal(existing ? records.map((r) => (r.id === record.id ? record : r)) : [record, ...records])
  return publicView(record)
}

export async function unpublishCloudTemplate(id: string, ownerId: string): Promise<boolean> {
  const remote = await request<{ ok: boolean }>(`/templates/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerId }),
  })
  if (remote.kind === 'ok') return true
  if (remote.kind === 'http') return false
  const records = readLocal()
  const found = records.find((r) => r.id === id)
  if (!found || found.ownerId !== ownerId) return false
  writeLocal(records.filter((r) => r.id !== id))
  return true
}

export type CloudEventId = 'begin' | 'pin_unlock'

function readEventQueue(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(EVENT_QUEUE_KEY) || '[]') as unknown
    return Array.isArray(parsed) ? parsed.filter((code): code is string => typeof code === 'string') : []
  } catch {
    return []
  }
}

function writeEventQueue(codes: string[]) {
  localStorage.setItem(EVENT_QUEUE_KEY, JSON.stringify(codes))
}

export function trackCloudEvent(eventId: CloudEventId) {
  const code = `${eventId}_${deviceId()}_${Date.now()}`
  const queue = readEventQueue()
  if (!queue.includes(code)) writeEventQueue([...queue, code])
  void flushCloudEvents()
}

export async function flushCloudEvents() {
  const queue = readEventQueue()
  if (!queue.length) return
  const kept: string[] = []
  for (const code of queue) {
    try {
      const res = await fetch('/api/cloud/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ code }),
        keepalive: true,
      })
      if (res.status === 429) kept.push(code)
      else if (!res.ok && res.status >= 500) kept.push(code)
    } catch {
      kept.push(code)
    }
  }
  writeEventQueue(kept)
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    void flushCloudEvents()
  })
}

export function typeCount(accounts: CloudAccount[]): number {
  return accounts.reduce((n, a) => n + a.types.length, 0)
}

export function uniqueTypes(accounts: CloudAccount[]): CloudType[] {
  const seen = new Set<string>()
  const out: CloudType[] = []
  for (const account of accounts) {
    for (const t of account.types) {
      const key = t.name.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(t)
    }
  }
  return out
}
