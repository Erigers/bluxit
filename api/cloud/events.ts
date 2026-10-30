import { storeEvent } from '../lib/events'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { code?: string }
    return json(await storeEvent(String(payload.code ?? '').trim()))
  } catch {
    return json({ stored: false }, 400)
  }
}
