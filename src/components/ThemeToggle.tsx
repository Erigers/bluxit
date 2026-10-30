import { Monitor, Moon, Sun } from 'lucide-react'
import { applyTheme, cn } from '../lib'
import { useStore } from '../store'
import type { ThemePreference } from '../types'

const OPTIONS: Array<{ id: ThemePreference; label: string; icon: typeof Sun }> = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
]

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { user, updateProfile } = useStore()
  const value: ThemePreference = user?.theme ?? (localStorage.getItem('bluxit:theme') as ThemePreference) ?? 'system'

  const set = (theme: ThemePreference) => {
    applyTheme(theme)
    if (user) updateProfile({ theme })
  }

  return (
    <div className="inline-flex rounded-full bg-[var(--control)] p-1">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => set(opt.id)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium',
              active ? 'bg-surface/90 text-ink shadow-sm' : 'text-muted hover:text-ink',
            )}
            aria-pressed={active}
            title={opt.label}
          >
            <Icon size={14} />
            {compact ? null : opt.label}
          </button>
        )
      })}
    </div>
  )
}
