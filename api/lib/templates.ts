import { readJson, writeJson } from './json-store'

type CloudType = { name: string; color: string }
type CloudAccount = {
  name: string
  color: string
  currency: string
  types: CloudType[]
}
export type CloudRecord = {
  id: string
  name: string
  ownerId: string
  authorUsername: string | null
  publishedAt: string
  accounts: CloudAccount[]
}

const BLOB_PATH = 'cloud-templates.json'
const FS_REL = '../../data/cloud-templates.json'

function publicView(record: CloudRecord) {
  return {
    id: record.id,
    name: record.name,
    authorUsername: record.authorUsername,
    publishedAt: record.publishedAt,
    accounts: record.accounts,
  }
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

async function load(): Promise<CloudRecord[]> {
  const parsed = await readJson<CloudRecord[]>(BLOB_PATH, [], FS_REL)
  return Array.isArray(parsed) ? parsed.filter((r) => !String(r.id).startsWith('seed-')) : []
}

async function save(records: CloudRecord[]) {
  await writeJson(BLOB_PATH, records, FS_REL)
}

export async function listTemplates() {
  return (await load()).map(publicView)
}

export async function getTemplate(id: string) {
  const found = (await load()).find((r) => r.id === id)
  return found ? publicView(found) : null
}

export async function createTemplate(payload: {
  name?: string
  ownerId?: string
  username?: string
  anonymous?: boolean
  accounts?: unknown
}) {
  const name = String(payload.name ?? '').trim()
  const ownerId = String(payload.ownerId ?? '').trim()
  if (!name || !ownerId) return { error: 'Name and owner are required.', status: 400 as const }
  const record: CloudRecord = {
    id: crypto.randomUUID(),
    name,
    ownerId,
    authorUsername: payload.anonymous ? null : String(payload.username ?? '').trim() || null,
    publishedAt: new Date().toISOString(),
    accounts: sanitizeAccounts(payload.accounts),
  }
  const records = await load()
  await save([record, ...records])
  return { status: 201 as const, body: publicView(record) }
}

export async function updateTemplate(
  id: string,
  payload: {
    name?: string
    ownerId?: string
    username?: string
    anonymous?: boolean
    accounts?: unknown
  },
) {
  const records = await load()
  const found = records.find((r) => r.id === id)
  const ownerId = String(payload.ownerId ?? '').trim()
  if (!found || found.ownerId !== ownerId) {
    return { error: 'You can only update a template you shared.', status: 403 as const }
  }
  const next: CloudRecord = {
    ...found,
    name: String(payload.name ?? found.name).trim() || found.name,
    authorUsername: payload.anonymous ? null : String(payload.username ?? '').trim() || null,
    accounts: sanitizeAccounts(payload.accounts),
  }
  await save(records.map((r) => (r.id === next.id ? next : r)))
  return { status: 200 as const, body: publicView(next) }
}

export async function deleteTemplate(id: string, ownerId: string) {
  const records = await load()
  const found = records.find((r) => r.id === id)
  if (!found || found.ownerId !== ownerId) {
    return { error: 'You can only remove a template you shared.', status: 403 as const }
  }
  await save(records.filter((r) => r.id !== found.id))
  return { ok: true }
}
