export const DESKTOP_DOWNLOAD_HREF = '/api/cloud/desktop'

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

export function desktopDownloadLabel(): string {
  return LABELS[guestOs()]
}
