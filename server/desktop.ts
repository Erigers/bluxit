export const GITHUB_REPO = 'Erigers/bluxit'
export const DESKTOP_VERSION = '0.1.1'
export const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`

export type GuestOs = 'windows' | 'macos' | 'linux' | 'other'

const FILES: Record<Exclude<GuestOs, 'other'>, string> = {
  windows: `bluxit_${DESKTOP_VERSION}_x64-setup.exe`,
  macos: `bluxit_${DESKTOP_VERSION}_aarch64.dmg`,
  linux: `bluxit_${DESKTOP_VERSION}_amd64.AppImage`,
}

export function osFromUserAgent(ua: string): GuestOs {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua))) return 'other'
  if (/Windows/i.test(ua)) return 'windows'
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macos'
  if (/Linux/i.test(ua)) return 'linux'
  return 'other'
}

export function installerUrl(os: GuestOs): string | null {
  if (os === 'other') return null
  return `https://github.com/${GITHUB_REPO}/releases/latest/download/${FILES[os]}`
}

async function installerExists(url: string): Promise<boolean | null> {
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      headers: { 'User-Agent': 'bluxit' },
    })
    if (res.status === 404) return false
    if (res.status >= 200 && res.status < 400) return true
    return null
  } catch {
    return null
  }
}

export async function resolveDesktopDownload(ua: string): Promise<string> {
  const url = installerUrl(osFromUserAgent(ua))
  if (!url) return RELEASES_URL
  const exists = await installerExists(url)
  if (exists === false) return RELEASES_URL
  return url
}
