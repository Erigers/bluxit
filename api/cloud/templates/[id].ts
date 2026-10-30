function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

type CloudType = { name: string; color: string }
type CloudAccount = { name: string; color: string; currency: string; types: CloudType[] }
type CloudRecord = {
  id: string
  name: string
  ownerId: string
  authorUsername: string | null
  publishedAt: string
  accounts: CloudAccount[]
}

const BLOB_PATH = 'cloud-templates.json'

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

function idFrom(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  return decodeURIComponent(parts[parts.length - 1] ?? '')
}

async function load(): Promise<CloudRecord[]> {
  try {
    const { get } = await import('@vercel/blob')
    const file = await get(BLOB_PATH, { access: 'private' })
    if (!file || file.statusCode !== 200 || !file.stream) return []
    const parsed = JSON.parse(await new Response(file.stream).text()) as CloudRecord[]
    return Array.isArray(parsed) ? parsed.filter((r) => !String(r.id).startsWith('seed-')) : []
  } catch {
    return []
  }
}

async function save(records: CloudRecord[]) {
  const { put } = await import('@vercel/blob')
  await put(BLOB_PATH, JSON.stringify(records), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export async function GET(request: Request) {
  const found = (await load()).find((r) => r.id === idFrom(request))
  if (!found) return json({ error: 'Not found' }, 404)
  return json(publicView(found))
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: string
      ownerId?: string
      username?: string
      anonymous?: boolean
      accounts?: unknown
    }
    const records = await load()
    const found = records.find((r) => r.id === idFrom(request))
    const ownerId = String(payload.ownerId ?? '').trim()
    if (!found || found.ownerId !== ownerId) {
      return json({ error: 'You can only update a template you shared.' }, 403)
    }
    const next: CloudRecord = {
      ...found,
      name: String(payload.name ?? found.name).trim() || found.name,
      authorUsername: payload.anonymous ? null : String(payload.username ?? '').trim() || null,
      accounts: sanitizeAccounts(payload.accounts),
    }
    await save(records.map((r) => (r.id === next.id ? next : r)))
    return json(publicView(next))
  } catch {
    return json({ error: 'Could not update that template.' }, 400)
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as { ownerId?: string }
    const records = await load()
    const found = records.find((r) => r.id === idFrom(request))
    const ownerId = String(payload.ownerId ?? '').trim()
    if (!found || found.ownerId !== ownerId) {
      return json({ error: 'You can only remove a template you shared.' }, 403)
    }
    await save(records.filter((r) => r.id !== found.id))
    return json({ ok: true })
  } catch {
    return json({ error: 'Could not remove that template.' }, 400)
  }
}
