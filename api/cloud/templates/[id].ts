import { deleteTemplate, getTemplate, updateTemplate } from '../../lib/templates'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function idFrom(request: Request) {
  const parts = new URL(request.url).pathname.split('/').filter(Boolean)
  return decodeURIComponent(parts[parts.length - 1] ?? '')
}

export async function GET(request: Request) {
  const found = await getTemplate(idFrom(request))
  if (!found) return json({ error: 'Not found' }, 404)
  return json(found)
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
    const result = await updateTemplate(idFrom(request), payload)
    if ('error' in result) return json({ error: result.error }, result.status)
    return json(result.body, result.status)
  } catch {
    return json({ error: 'Could not update that template.' }, 400)
  }
}

export async function DELETE(request: Request) {
  try {
    const payload = (await request.json()) as { ownerId?: string }
    const result = await deleteTemplate(idFrom(request), String(payload.ownerId ?? '').trim())
    if ('error' in result) return json({ error: result.error }, result.status)
    return json(result)
  } catch {
    return json({ error: 'Could not remove that template.' }, 400)
  }
}
