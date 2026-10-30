import { createTemplate, listTemplates } from '../lib/templates'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function GET() {
  return json(await listTemplates())
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
    const result = await createTemplate(payload)
    if ('error' in result) return json({ error: result.error }, result.status)
    return json(result.body, result.status)
  } catch {
    return json({ error: 'Could not save that template.' }, 400)
  }
}
