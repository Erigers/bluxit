import {
  ArrowLeftRight,
  House,
  LayoutDashboard,
  Layers,
  MoreHorizontal,
  PiggyBank,
  Receipt,
  Settings,
  Tags,
  Wallet,
} from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { flushCloudEvents } from '../cloud'
import { applyTheme, cn } from '../lib'
import { usePrefersDark, useStore, useWorkspace } from '../store'
import { CloudEdge } from './CloudEdge'
import { Logo } from './Logo'
import { PinLock } from './PinLock'
import { SetupGuide } from './SetupGuide'
import { ThemeToggle } from './ThemeToggle'

const PRIMARY = [
  { to: '/home', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/expenses', label: 'Spend', icon: Receipt },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/types', label: 'Types', icon: Tags },
  { to: '/more', label: 'More', icon: MoreHorizontal },
]

const MORE = [
  { to: '/', label: 'Landing Page', icon: House, end: true },
  { to: '/income', label: 'Income', icon: PiggyBank },
  { to: '/templates', label: 'Wallet Templates', icon: Layers },
  { to: '/debts', label: 'Local debts', icon: ArrowLeftRight },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function AppShell() {
  const { user } = useStore()
  const { template } = useWorkspace()
  const { pathname } = useLocation()
  const prefersDark = usePrefersDark()
  const theme = user?.theme ?? 'system'
  const moreSection = MORE.some((item) =>
    item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`),
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme, prefersDark])

  useEffect(() => {
    void flushCloudEvents()
  }, [])

  useEffect(() => {
    document.documentElement.classList.add('app-locked')
    return () => document.documentElement.classList.remove('app-locked')
  }, [])

  return (
    <div className="app-shell fixed inset-0 flex flex-col overflow-hidden bg-bg text-ink">
      <header className="z-40 shrink-0 overflow-visible">
        <div className="flex h-14 items-center gap-3 bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] px-4 backdrop-blur-xl md:h-16 md:px-6">
          <Link to="/home" aria-label="bluxit home" className="shrink-0">
            <Logo className="text-base md:text-2xl" markClassName="h-7 w-7 md:h-10 md:w-10" />
          </Link>
          <div className="min-h-8 min-w-0 flex-1" aria-label="News from the cloud" />
          <div className="max-w-[46%] shrink-0 text-right">
            <p className="truncate text-sm font-semibold leading-tight">
              {template?.name ?? 'No template'}
            </p>
            <p className="truncate text-xs text-muted">{user?.displayName || user?.username}</p>
          </div>
        </div>
        <CloudEdge className="-mt-px" />
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="z-30 hidden w-60 shrink-0 flex-col overflow-y-auto border-r border-line/70 bg-[var(--glass)] px-4 pb-5 pt-8 backdrop-blur-xl md:flex">
          <nav className="grid gap-1 text-sm">
            {PRIMARY.filter((i) => i.to !== '/more').map((item) => (
              <SideLink key={item.to} {...item} />
            ))}
            <div className="my-3 h-px bg-line" />
            {MORE.map((item) => (
              <SideLink key={item.to} {...item} />
            ))}
          </nav>
          <div className="mt-auto grid gap-3 px-1">
            <ThemeToggle compact />
          </div>
        </aside>

        <main className="app-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-2 md:px-8 md:pb-10 md:pt-4">
          <div className="mx-auto max-w-5xl">
            <SetupGuide />
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="safe-bottom z-30 shrink-0 border-t border-line/70 bg-[var(--glass)] px-2 pt-2 backdrop-blur-xl md:hidden">
        <ul className="grid grid-cols-5">
          {PRIMARY.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => {
                  const current = isActive || (item.to === '/more' && moreSection)
                  return cn(
                    'flex flex-col items-center gap-1 rounded-full px-1 py-1.5 text-[11px] font-medium',
                    current ? 'bg-brand-soft text-brand' : 'text-muted active:bg-brand-soft/60',
                  )
                }}
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <PinLock />
    </div>
  )
}

function SideLink({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-full px-3 py-2.5 font-medium',
          isActive
            ? 'bg-brand-soft text-brand'
            : 'text-muted hover:bg-brand-soft/60 hover:text-ink active:bg-brand-soft',
        )
      }
    >
      <Icon size={18} />
      {label}
    </NavLink>
  )
}
