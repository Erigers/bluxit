import { resolveDesktopDownload } from '../../server/desktop'

export async function GET(request: Request) {
  const href = await resolveDesktopDownload(request.headers.get('user-agent') ?? '')
  return Response.redirect(href, 302)
}
