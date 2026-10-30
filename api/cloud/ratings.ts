import { getRatingStats, saveRating } from '../../server/ratings'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function GET() {
  return json(await getRatingStats())
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { deviceId?: string; stars?: unknown }
    const result = await saveRating(String(payload.deviceId ?? ''), payload.stars)
    if ('error' in result) return json({ error: result.error }, result.status)
    return json(result)
  } catch {
    return json({ error: 'Could not save that rating.' }, 400)
  }
}
