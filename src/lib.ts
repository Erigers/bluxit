import type { ThemePreference } from './types'

export const STORAGE_KEY = 'bluxit:v2'
export const THEME_KEY = 'bluxit:theme'
export const CLOUD_KEY = 'bluxit:cloud'
export const DEVICE_KEY = 'bluxit:device-id'
export const EVENT_QUEUE_KEY = 'bluxit:event-queue'
export const PIN_IDLE_MS = 20 * 60 * 1000

export const PALETTE = [
  '#4eb8ea',
  '#8fd4f5',
  '#6366f1',
  '#22d3ee',
  '#34d399',
  '#f5a524',
  '#fb923c',
  '#a78bfa',
  '#38bdf8',
  '#f472b6',
  '#94a3b8',
  '#14b8a6',
  '#e11d48',
  '#818cf8',
  '#fbbf24',
]

export const SUGGESTED_TYPES = [
  'Leisure',
  'Groceries',
  'Housing',
  'Rent',
  'Utilities',
  'Transport',
  'Dining',
  'Coffee',
  'Health',
  'Subscriptions',
  'Education',
  'Shopping',
  'Gifts',
  'Travel',
  'Other',
]

export const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CAD',
  'AUD',
  'CHF',
  'CNY',
  'INR',
  'BRL',
  'MXN',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'RON',
  'TRY',
  'ZAR',
  'KRW',
  'SGD',
  'HKD',
  'NZD',
  'AED',
]

export function uid(): string {
  return crypto.randomUUID()
}

export function deviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY)
    if (existing) return existing
    const id = uid()
    localStorage.setItem(DEVICE_KEY, id)
    return id
  } catch {
    return 'unknown'
  }
}

export function nowISO(): string {
  return new Date().toISOString()
}

export function isoDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function currentMonth(): { year: number; month: number } {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function inMonth(isoDateStr: string, year: number, month: number): boolean {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return isoDateStr.startsWith(prefix)
}

export function firstMonday(year: number, month: number): Date {
  const d = new Date(year, month - 1, 1)
  const dow = d.getDay()
  const add = dow === 0 ? 1 : dow === 1 ? 0 : 8 - dow
  return new Date(year, month - 1, 1 + add)
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function nextColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}

export function isPin(value: string): boolean {
  return /^\d{4}$/.test(value)
}

export function lastActiveKey(userId: string): string {
  return `bluxit:last-active:${userId}`
}

export function touchActivity(userId: string): void {
  localStorage.setItem(lastActiveKey(userId), String(Date.now()))
}

export function clearActivity(userId: string): void {
  localStorage.removeItem(lastActiveKey(userId))
}

export function idleSince(userId: string): number {
  const raw = localStorage.getItem(lastActiveKey(userId))
  if (!raw) return 0
  return Date.now() - Number(raw)
}

export function isIdle(userId: string): boolean {
  return idleSince(userId) >= PIN_IDLE_MS
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function resolveTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'dark') return 'dark'
  if (pref === 'light') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function applyTheme(pref: ThemePreference): void {
  const resolved = resolveTheme(pref)
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
  localStorage.setItem(THEME_KEY, pref)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#121212' : '#e8e8e8')
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
