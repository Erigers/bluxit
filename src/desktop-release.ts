export const DESKTOP_VERSION = '0.1.3'
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

const FILES: Record<Exclude<GuestOs, 'other'>, string> = {
  windows: `bluxit_${DESKTOP_VERSION}_x64-setup.exe`,
  macos: `bluxit_${DESKTOP_VERSION}_aarch64.dmg`,
  linux: `bluxit_${DESKTOP_VERSION}_amd64.AppImage`,
}

const LABELS: Record<GuestOs, string> = {
  windows: 'Download for Windows',
  macos: 'Download for macOS',
  linux: 'Download for Linux',
  other: 'Download desktop app',
}

export function desktopDownloadHref(): string {
  const os = guestOs()
  if (os === 'other') return RELEASES_URL
  return `https://github.com/${GITHUB_REPO}/releases/download/v${DESKTOP_VERSION}/${FILES[os]}`
}

export function desktopDownloadLabel(): string {
  return LABELS[guestOs()]
}
