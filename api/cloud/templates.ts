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

export async function GET() {
  return json((await load()).map(publicView))
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      name?: string
      ownerId?: string
      username?: string
      anonymous?: boolean
      accounts?: unknown
    }
    const name = String(payload.name ?? '').trim()
    const ownerId = String(payload.ownerId ?? '').trim()
    if (!name || !ownerId) return json({ error: 'Name and owner are required.' }, 400)
    const record: CloudRecord = {
      id: crypto.randomUUID(),
      name,
      ownerId,
      authorUsername: payload.anonymous ? null : String(payload.username ?? '').trim() || null,
      publishedAt: new Date().toISOString(),
      accounts: sanitizeAccounts(payload.accounts),
    }
    await save([record, ...(await load())])
    return json(publicView(record), 201)
  } catch {
    return json({ error: 'Could not save that template.' }, 400)
  }
}
