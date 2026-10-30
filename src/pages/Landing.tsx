import {
  ArrowRight,
  Cloud,
  Layers,
  MessageSquare,
  Send,
  Share2,
  Smartphone,
  Sparkles,
  User,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { flushCloudEvents, listCloudTemplates, trackCloudEvent } from '../cloud'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { Button, ColorDot, Field } from '../components/ui'
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
  const [shared, setShared] = useState<CloudTemplate[]>(FALLBACK_SHARED)
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const pref = user?.theme ?? (localStorage.getItem('bluxit:theme') as 'light' | 'dark' | 'system') ?? 'system'
    applyTheme(pref)
  }, [prefersDark, user?.theme])

  useEffect(() => {
    void listCloudTemplates().then((rows) => {
      setShared(rows.slice(0, 6))
    })
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
      <header className="sticky top-0 z-30 border-b border-transparent bg-[var(--glass)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" aria-label="bluxit home">
            <Logo className="text-base md:text-2xl" markClassName="h-7 w-7 md:h-10 md:w-10" />
          </Link>
          <nav className="hidden items-center gap-5 text-sm font-medium md:flex">
            {(
              [
                ['#templates', 'Wallet Templates'],
                ['#lifestyle', 'Lifestyle'],
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
        <section className="mx-auto grid max-w-5xl gap-10 px-4 py-14 md:grid-cols-2 md:items-center md:py-20">
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
            </div>
          </div>
          <HeroCard />
        </section>

        <section className="border-y border-line/60 bg-surface/35">
          <div className="mx-auto grid max-w-5xl gap-6 px-4 py-14 md:grid-cols-2">
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
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 md:grid-cols-2 md:items-center">
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
            {shared.length === 0 ? (
              <p className="card p-4 text-sm text-muted">
                No templates uploaded on the cloud yet. Share a template from the app to list it here.
              </p>
            ) : (
              <ul className="grid gap-3">
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
        </section>

        <section id="contact" className="mx-auto max-w-lg scroll-mt-20 px-4 py-16">
          <h2 className="text-2xl font-semibold">No reason to reach out, but here you can.</h2>
          <p className="mt-2 text-sm text-muted">
            No ticket system. The note stays on this device for now.
          </p>
          <form
            className="card mt-6 grid gap-3 p-5"
            onSubmit={(e) => {
              e.preventDefault()
              const text = message.trim()
              if (!text) return
              const note: Note = {
                id: uid(),
                name: name.trim() || 'Anonymous',
                message: text,
                at: new Date().toISOString(),
                read: false,
              }
              const next = [note, ...notes]
              setNotes(next)
              saveNotes(next)
              setMessage('')
              setToastKey(Date.now())
            }}
          >
            <Field label="Name" icon={<User size={16} />}>
              <input
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="If you want"
              />
            </Field>
            <Field label="A few words" icon={<MessageSquare size={16} />}>
              <textarea
                className="field min-h-28 resize-y"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </Field>
            <Button type="submit">
              <Send size={16} />
              Send anyway
            </Button>
          </form>
          {notes.length ? (
            <div className="card mt-6 px-5 py-4">
              <ul className="list-disc space-y-2 pl-5 text-sm">
                {notes.map((note) => (
                  <li key={note.id} className="text-ink">
                    <span
                      className={cn(
                        'mr-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                        note.read ? 'bg-ok/15 text-ok' : 'bg-brand-soft text-brand',
                      )}
                    >
                      {note.read ? 'Read' : 'Unread'}
                    </span>
                    {previewMessage(note.message)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
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
            <a href="#contact" className="text-muted hover:text-ink">
              Contact
            </a>
          </div>
        </div>
        <p className="border-t border-line px-4 py-4 text-center text-xs text-muted">
          © {new Date().getFullYear()} bluxit
        </p>
      </footer>
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
