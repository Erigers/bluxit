import {
  ArrowRight,
  Cloud,
  Layers,
  Monitor,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { fetchRatings, flushCloudEvents, listCloudTemplates, trackCloudEvent, type RatingStats } from '../cloud'
import { DesktopDownload } from '../components/DesktopDownload'
import { RatingStars } from '../components/RateApp'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { Button, ColorDot } from '../components/ui'
import { applyTheme, cn, uid } from '../lib'
import { usePrefersDark, useStore } from '../store'
import type { CloudTemplate } from '../types'

function Cta({
  to,
  children,
  variant = 'primary',
  className,
  onClick,
}: {
  to: string
  children: ReactNode
  variant?: 'primary' | 'soft'
  className?: string
  onClick?: () => void
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn('btn', variant === 'primary' ? 'btn-primary' : 'btn-soft', className)}
    >
      <span className="btn-label">{children}</span>
    </Link>
  )
}

const CONTACT_KEY = 'bluxit:contact:v2'
const MESSAGE_PREVIEW = 80
const TOAST_MS = 7000

type Note = {
  id: string
  name: string
  message: string
  at: string
  read: boolean
}

function loadNotes(): Note[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CONTACT_KEY) || '[]') as Partial<Note>[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((n) => ({
        id: typeof n.id === 'string' ? n.id : uid(),
        name: n.name?.trim() || 'Anonymous',
        message: n.message?.trim() || '',
        at: n.at || new Date().toISOString(),
        read: n.read === true,
      }))
      .filter((n) => n.message)
  } catch {
    return []
  }
}

function saveNotes(notes: Note[]) {
  localStorage.setItem(CONTACT_KEY, JSON.stringify(notes))
}

function previewMessage(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= MESSAGE_PREVIEW) return compact
  return `${compact.slice(0, MESSAGE_PREVIEW).trimEnd()}...`
}

const TEMPLATES = [
  {
    name: 'Everyday',
    note: 'Pay, save, live',
    accounts: [
      { name: 'Daily', color: '#4eb8ea' },
      { name: 'Savings', color: '#14b8a6' },
      { name: 'Fun', color: '#f97316' },
    ],
  },
  {
    name: 'Travel month',
    note: 'Tickets, stays, cash',
    accounts: [
      { name: 'Tickets', color: '#6366f1' },
      { name: 'Stay', color: '#0ea5e9' },
      { name: 'Pocket', color: '#eab308' },
    ],
  },
  {
    name: 'Freelance',
    note: 'Tax aside, life aside',
    accounts: [
      { name: 'Ops', color: '#64748b' },
      { name: 'Tax pot', color: '#22c55e' },
      { name: 'Life', color: '#ec4899' },
    ],
  },
]

const FALLBACK_SHARED: CloudTemplate[] = []

export function Landing() {
  const { user } = useStore()
  const prefersDark = usePrefersDark()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [toastKey, setToastKey] = useState(0)
  const [sending, setSending] = useState(false)
  const [shared, setShared] = useState<CloudTemplate[]>(FALLBACK_SHARED)
  const [ratings, setRatings] = useState<RatingStats | null>(null)
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const pref = user?.theme ?? (localStorage.getItem('bluxit:theme') as 'light' | 'dark' | 'system') ?? 'system'
    applyTheme(pref)
  }, [prefersDark, user?.theme])

  useEffect(() => {
    void listCloudTemplates().then((rows) => {
      setShared(rows.slice(0, 6))
    })
    void fetchRatings().then(setRatings)
    void flushCloudEvents()
  }, [])

  useEffect(() => {
    if (!toastKey) return
    const timer = window.setTimeout(() => setToastKey(0), TOAST_MS)
    return () => window.clearTimeout(timer)
  }, [toastKey])

  useEffect(() => {
    const onHash = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const begin = user ? '/home' : '/login?begin=1'
  const onBegin = () => {
    if (!user) trackCloudEvent('begin')
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="top-banner-offset sticky top-0 z-30 border-b border-transparent bg-[var(--glass)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" aria-label="bluxit home">
            <Logo className="text-base md:text-2xl" markClassName="h-7 w-7 md:h-10 md:w-10" />
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
            {(
              [
                ['#templates', 'Wallet Templates'],
                ['#lifestyle', 'Lifestyle'],
                ['#desktop', 'Desktop'],
                ['#contact', 'Contact'],
              ] as const
            ).map(([href, label]) => (
              <a
                key={href}
                href={href}
                className={cn(
                  hash === href ? 'text-ink' : 'text-muted hover:text-ink',
                )}
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle compact />
            {user ? (
              <Cta to="/home">
                <Wallet size={16} />
                Open app
              </Cta>
            ) : (
              <Cta to={begin} onClick={onBegin}>
                <Sparkles size={16} />
                Just begin
              </Cta>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="hero-sky" aria-hidden="true">
            <div className="hero-stars" />
            <div className="hero-stars-2" />
            <div className="hero-stars-3" />
          </div>
          <div className="relative mx-auto grid max-w-5xl gap-10 px-4 py-24 md:grid-cols-2 md:items-center md:py-40">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">Free money tracker</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
                No more sign up, just begin.
              </h1>
              <p className="mt-4 text-lg text-muted">
                Everything lives on your device. The one thing you can put on our servers is a template —
                never the money.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Cta to={begin} className="px-6 text-base" onClick={user ? undefined : onBegin}>
                  {user ? <Wallet size={18} /> : <Sparkles size={18} />}
                  {user ? 'Open your wallet' : 'Just begin'}
                  <ArrowRight size={16} />
                </Cta>
                <DesktopDownload className="px-6 text-base" />
              </div>
            </div>
            <HeroCard />
          </div>
        </section>

        <section>
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:grid-cols-[auto_1fr] sm:items-center md:py-16">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">From people using it</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">How bluxit is rated</h2>
              <p className="mt-2 text-muted">
                Everyone who taps stars on Home adds to this average. Wallets stay on-device; the score
                is the one public tally.
              </p>
            </div>
            <div className="card p-5 sm:justify-self-end">
              {ratings && ratings.count > 0 ? (
                <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
                  <div>
                    <p className="num text-4xl font-semibold leading-none">{ratings.average.toFixed(1)}</p>
                    <RatingStars value={ratings.average} size={20} />
                    <p className="mt-1 text-sm text-muted">
                      {ratings.count} {ratings.count === 1 ? 'rating' : 'ratings'}
                    </p>
                  </div>
                  <ul className="grid min-w-[9.5rem] gap-1 text-xs text-muted">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const n = ratings.histogram[star - 1]
                      const pct = ratings.count ? Math.round((n / ratings.count) * 100) : 0
                      return (
                        <li key={star} className="flex items-center gap-2">
                          <span className="w-3 tabular-nums">{star}</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--control)]">
                            <span
                              className="block h-full rounded-full bg-brand"
                              style={{ width: `${pct}%` }}
                            />
                          </span>
                          <span className="w-6 text-right tabular-nums">{n}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  No ratings yet. Open the app and tap stars on Home — the collection shows up here.
                </p>
              )}
            </div>
          </div>
        </section>

        <section id="desktop" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16 md:py-24">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <Monitor className="text-brand" size={28} />
              <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-brand">Desktop app</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Run bluxit on your computer.
              </h2>
              <p className="mt-3 text-muted">
                Same wallet, as a window. On first launch you pick the file. Change that path later in
                Settings. Windows, macOS, and Linux.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <DesktopDownload variant="primary" />
              </div>
            </div>
            <article className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Your file</p>
              <p className="mt-3 font-mono text-sm text-ink">Documents/bluxit/bluxit.json</p>
              <p className="mt-2 text-sm text-muted">
                Income, accounts, and spending stay in that JSON — not in a browser profile, not on our
                servers.
              </p>
            </article>
          </div>
        </section>

        <section className="border-y border-line/60 bg-surface/35">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 md:grid-cols-2 md:py-32">
            <article className="card p-6">
              <Smartphone className="text-brand" size={28} />
              <h2 className="mt-4 text-2xl font-semibold">Everything on your device.</h2>
              <p className="mt-2 text-muted">
                Templates, accounts, income, expenses, and your PIN stay in this browser. No account
                vendor. No subscription. You start, and the wallet is already yours.
              </p>
            </article>
            <article className="card p-6">
              <Cloud className="text-brand" size={28} />
              <h2 className="mt-4 text-2xl font-semibold">You decide what you want on cloud.</h2>
              <p className="mt-2 text-muted">
                Share a template name, the accounts inside it, and expense types with their colors.
                Income, balances, and spending stay here. Credit it with your username, or share
                anonymously — then only the template name is listed.
              </p>
            </article>
          </div>
        </section>

        <section id="templates" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">Customized templates</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Manage your wallet how is best for you.
            </h2>
            <p className="mt-3 text-muted">
              A template is a set of accounts with colors, currencies, and splits. Build one for
              weekdays, another for a trip. Switch when life switches.
            </p>
          </div>
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {TEMPLATES.map((t) => (
              <li key={t.name} className="card p-5">
                <p className="flex items-center gap-2 font-semibold">
                  <Layers size={16} className="text-brand" />
                  {t.name}
                </p>
                <p className="mt-1 text-sm text-muted">{t.note}</p>
                <ul className="mt-4 grid gap-2">
                  {t.accounts.map((a) => (
                    <li key={a.name} className="flex items-center gap-2 text-sm">
                      <ColorDot color={a.color} />
                      {a.name}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>

        <section id="lifestyle" className="border-y border-line/60 bg-surface/35">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center md:py-32">
            <div>
              <Wallet className="text-brand" size={28} />
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                A wallet adapts to your lifestyle, not the other way around.
              </h2>
              <p className="mt-3 text-lg text-muted">
                Create your wallet template or adapt what others have shared.
              </p>
              <Cta
                to={user ? '/templates#catalog' : begin}
                variant="soft"
                className="mt-6"
                onClick={user ? undefined : onBegin}
              >
                {user ? <Layers size={16} /> : <Sparkles size={16} />}
                {user ? 'Browse the catalog' : 'Start from a blank template'}
              </Cta>
            </div>
            <div className="grid justify-items-center gap-6">
              <SignalLoader />
              {shared.length === 0 ? (
                <p className="card w-full p-4 text-sm text-muted">
                  No templates uploaded on the cloud yet. Share a template from the app to list it here.
                </p>
              ) : (
                <ul className="grid w-full gap-3">
                  {shared.map((s) => (
                    <li key={s.id} className="card flex items-center justify-between gap-3 p-4">
                      <span className="flex items-center gap-3">
                        <ColorDot color={s.accounts[0]?.color ?? '#4eb8ea'} size={14} />
                        <span>
                          <span className="block font-semibold">{s.name}</span>
                          <span className="text-sm text-muted">
                            {s.authorUsername ? `Shared by ${s.authorUsername}` : 'Name only'}
                          </span>
                        </span>
                      </span>
                      <Share2 size={16} className="text-muted" />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16 pb-24 md:py-24 md:pb-32">
          <div className="grid items-start gap-10 md:grid-cols-2">
            <div className="max-w-md">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand">Not a mailbox</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                No reason to reach out, but here you can.
              </h2>
              <p className="mt-3 text-muted">
                There is no ticket queue. Write a note, send it anyway, and it stays in this browser —
                like a scrap of paper in a drawer.
              </p>
            </div>
            <div>
              <form
                className={cn('contact-note', sending && 'sending')}
                onSubmit={(e) => {
                  e.preventDefault()
                  const text = message.trim()
                  if (!text || sending) return
                  const note: Note = {
                    id: uid(),
                    name: name.trim() || 'Anonymous',
                    message: text,
                    at: new Date().toISOString(),
                    read: false,
                  }
                  setSending(true)
                  window.setTimeout(() => {
                    const next = [note, ...loadNotes()]
                    setNotes(next)
                    saveNotes(next)
                    setName('')
                    setMessage('')
                    setSending(false)
                    setToastKey(Date.now())
                  }, 520)
                }}
              >
                <span className="contact-stamp">Local only</span>
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">From</span>
                  <input
                    className="contact-from"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Anonymous is fine"
                    autoComplete="nickname"
                  />
                </label>
                <label className="mt-5 grid gap-1 text-sm">
                  <span className="font-medium text-ink">The thing you were going to say</span>
                  <textarea
                    className="contact-lines"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write it like a note on the fridge."
                    required
                  />
                </label>
                <p className="mt-2 text-xs text-muted">
                  {message.trim()
                    ? `${message.trim().length} characters of pretending`
                    : 'Still empty. That is also a message.'}
                </p>
                <Button type="submit" className="mt-5" disabled={sending}>
                  <Send size={16} />
                  {sending ? 'Tucking it away' : 'Send anyway'}
                </Button>
              </form>
              {notes.length ? (
                <ul className="contact-slips mt-8">
                  {notes.map((note, i) => (
                    <li key={note.id} className="contact-slip" style={{ '--tilt': `${i % 2 ? 1.2 : -1.1}deg` } as CSSProperties}>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                          note.read ? 'bg-ok/15 text-ok' : 'bg-brand-soft text-brand',
                        )}
                      >
                        {note.read ? 'Read' : 'In the drawer'}
                      </span>
                      <p className="mt-2 text-sm text-ink">{previewMessage(note.message)}</p>
                      <p className="mt-1 text-xs text-muted">
                        {note.name}
                        {' · '}
                        {new Date(note.at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </section>
        {toastKey ? (
          <div
            className="card fixed inset-x-4 top-20 z-50 mx-auto max-w-md p-4 md:inset-x-auto md:right-6"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              <p className="text-sm text-ink">
                thank you for pretending to reach out to us. When we are ready to receive your
                message, you will see it marked as “Read” in this section.
              </p>
              <button
                type="button"
                className="btn btn-ghost min-h-8 px-2"
                onClick={() => setToastKey(0)}
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="border-t border-line/60 bg-[var(--glass)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Logo className="text-base md:text-2xl" markClassName="h-7 w-7 md:h-10 md:w-10" />
            <p className="mt-2 max-w-sm text-sm text-muted">
              Track your money. Keep your freedom. Free, no payments. Wallets stay on-device;
              templates can be shared.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <Link to={begin} className="text-brand" onClick={onBegin}>
              Just begin
            </Link>
            <a href="#desktop" className="text-muted hover:text-ink">
              Desktop
            </a>
            <a href="#contact" className="text-muted hover:text-ink">
              Contact
            </a>
          </div>
        </div>
        <div className="border-t border-line px-4 py-4">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>all rights not reserved © {new Date().getFullYear()} bluxit</p>
            <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span>visit link:</span>
              <a
                href="https://bluxit.vercel.app"
                className="text-brand hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                https://bluxit.vercel.app
              </a>
              <span>or run it on your machine:</span>
              <a
                href="https://github.com/Erigers/bluxit"
                className="inline-flex items-center gap-1 font-medium text-ink hover:text-brand"
                target="_blank"
                rel="noreferrer"
              >
                <GithubMark className="h-3.5 w-3.5" />
                Github
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.523 2 12 2z" />
    </svg>
  )
}

function SignalLoader() {
  return (
    <div className="landing-signal" aria-hidden="true">
      <div className="loader">
        <div className="loader__bar" />
        <div className="loader__bar" />
        <div className="loader__bar" />
        <div className="loader__bar" />
        <div className="loader__bar" />
        <div className="loader__ball" />
      </div>
    </div>
  )
}

function HeroCard() {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">On this device</p>
      <p className="mt-3 num text-3xl font-semibold">$4,450</p>
      <p className="text-sm text-muted">this month’s inflow · not on a server</p>
      <div className="mt-5 grid gap-2">
        {[
          { name: 'Daily', color: '#4eb8ea', pct: '55%' },
          { name: 'Savings', color: '#14b8a6', pct: '30%' },
          { name: 'Fun', color: '#f97316', pct: '15%' },
        ].map((a) => (
          <div key={a.name} className="flex items-center justify-between rounded-full bg-[var(--control)] px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <ColorDot color={a.color} />
              {a.name}
            </span>
            <span className="num text-muted">{a.pct}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
