import {
  ArrowLeftRight,
  ChevronRight,
  House,
  Layers,
  LogOut,
  PiggyBank,
  Settings,
} from 'lucide-react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { ThemeToggle } from '../components/ThemeToggle'
import { cn } from '../lib'
import { useStore } from '../store'

export function More() {
  const { logout } = useStore()
  const navigate = useNavigate()
  const links = [
    { to: '/', label: 'Landing Page', icon: House, end: true },
    { to: '/income', label: 'Income & bonuses', icon: PiggyBank },
    { to: '/templates', label: 'Wallet Templates', icon: Layers },
    { to: '/debts', label: 'Local debts', icon: ArrowLeftRight },
    { to: '/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div>
      <div className="mb-4 flex justify-center md:hidden">
        <Logo className="text-lg" />
      </div>
      <ul className="card divide-y divide-line overflow-hidden p-0">
        {links.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3.5 text-sm font-medium',
                  isActive
                    ? 'bg-brand-soft text-brand'
                    : 'hover:bg-brand-soft/50 active:bg-brand-soft',
                )
              }
            >
              <item.icon size={18} className="text-brand" />
              <span className="flex-1">{item.label}</span>
              <ChevronRight size={16} className="text-muted" />
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-4 card p-4">
        <p className="mb-3 text-sm font-medium">Theme</p>
        <ThemeToggle />
      </div>
      <button
        type="button"
        className="btn btn-ghost mt-4 w-full justify-start text-danger"
        onClick={() => {
          logout()
          navigate('/login')
        }}
      >
        <LogOut size={18} />
        Log out
      </button>
    </div>
  )
}
