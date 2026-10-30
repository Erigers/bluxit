export const GITHUB_REPO = 'Erigers/bluxit'
export const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases/latest`

export type GuestOs = 'windows' | 'macos' | 'linux' | 'other'

export function guestOs(): GuestOs {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'other'
  }
  if (/Windows/i.test(ua)) return 'windows'
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macos'
  if (/Linux/i.test(ua)) return 'linux'
  return 'other'
}

const LABELS: Record<GuestOs, string> = {
  windows: 'Download for Windows',
  macos: 'Download for macOS',
  linux: 'Download for Linux',
  other: 'Download desktop app',
}

type Asset = { name: string; browser_download_url: string }

function pickAsset(os: GuestOs, assets: Asset[]) {
  const rows = assets.filter((a) => !a.name.toLowerCase().endsWith('.sig'))
  const has = (test: (name: string) => boolean) => rows.find((a) => test(a.name.toLowerCase()))
  if (os === 'windows') return has((n) => n.endsWith('.exe')) ?? has((n) => n.endsWith('.msi'))
  if (os === 'macos') return has((n) => n.endsWith('.dmg'))
  if (os === 'linux') return has((n) => n.endsWith('.appimage')) ?? has((n) => n.endsWith('.deb'))
  return undefined
}

export async function desktopDownloadLink(): Promise<{ href: string; label: string }> {
  const os = guestOs()
  const label = LABELS[os]
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return { href: RELEASES_URL, label }
    const data = (await res.json()) as { html_url?: string; assets?: Asset[] }
    const asset = pickAsset(os, data.assets ?? [])
    if (asset) return { href: asset.browser_download_url, label }
    return { href: data.html_url || RELEASES_URL, label }
  } catch {
    return { href: RELEASES_URL, label }
  }
}
