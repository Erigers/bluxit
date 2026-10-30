const VERSION = '0.1.3'
const FILES = {
  windows: `bluxit_${VERSION}_x64-setup.exe`,
  macos: `bluxit_${VERSION}_aarch64.dmg`,
  linux: `bluxit_${VERSION}_amd64.AppImage`,
} as const

function installerHref(ua: string) {
  let file: string = FILES.windows
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))) {
    return `https://github.com/Erigers/bluxit/releases/latest`
  }
  if (/Mac OS X|Macintosh/i.test(ua)) file = FILES.macos
  else if (/Linux/i.test(ua)) file = FILES.linux
  return `https://github.com/Erigers/bluxit/releases/download/v${VERSION}/${file}`
}

export function GET(request: Request) {
  return new Response(null, {
    status: 302,
    headers: { Location: installerHref(request.headers.get('user-agent') ?? '') },
  })
}
