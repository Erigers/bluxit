import { ChevronLeft, ChevronRight, ChevronsUpDown, X } from 'lucide-react'
import { useEffect, useMemo, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { PALETTE, cn, currentMonth, monthLabel } from '../lib'

export function Button({
  variant = 'primary',
  className,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline' | 'soft'
}) {
  const styles = {
    primary: 'btn-primary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    outline: 'btn-muted',
    soft: 'btn-soft',
  }[variant]
  return (
    <button type={type} className={cn('btn', styles, className)} {...props}>
      <span className="btn-label">{children}</span>
    </button>
  )
}

export function Toggle({
  checked,
  onChange,
  disabled,
  className,
  'aria-label': ariaLabel,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}) {
  return (
    <span className={cn('switch', className)}>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="slider" aria-hidden />
    </span>
  )
}

export function Field({
  label,
  hint,
  icon,
  children,
}: {
  label: string
  hint?: string
  icon?: ReactNode
  children: ReactNode
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {icon ? (
        <span className="field-icon relative block">
          <span className="pointer-events-none absolute left-3.5 top-[0.85rem] text-muted">{icon}</span>
          {children}
        </span>
      ) : (
        children
      )}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  )
}

export function ColorDot({
  color,
  size = 12,
  className,
}: {
  color: string
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn('inline-block shrink-0 rounded-full', className)}
      style={{ background: color, width: size, height: size }}
      aria-hidden
    />
  )
}

export function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'h-7 w-7 rounded-full border-2 transition',
            value === c ? 'border-ink scale-110' : 'border-transparent',
          )}
          style={{ background: c }}
          aria-label={c}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-7 cursor-pointer rounded-full border border-line bg-transparent"
        aria-label="Custom color"
      />
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 grid gap-1">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {subtitle ? <p className="text-sm text-muted">{subtitle}</p> : null}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="card grid gap-2 px-5 py-8 text-center">
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-sm text-muted">{body}</p>
      {action ? <div className="mt-2 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-[70] grid place-items-end p-0 md:place-items-center md:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="card safe-bottom relative z-10 w-full max-h-[92dvh] overflow-auto rounded-t-3xl p-5 md:max-w-lg md:rounded-3xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost min-h-9 px-2"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
        {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  )
}

export function Money({
  amount,
  currency,
  className,
  signed = false,
}: {
  amount: number
  currency: string
  className?: string
  signed?: boolean
}) {
  const formatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(signed ? amount : amount)
  let text = formatted
  try {
    text = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      signDisplay: signed ? 'exceptZero' : 'auto',
    }).format(amount)
  } catch {
    text = formatted
  }
  return <span className={cn('num', className)}>{text}</span>
}

export function MonthNav({
  year,
  month,
  onChange,
}: {
  year: number
  month: number
  onChange: (year: number, month: number) => void
}) {
  const [open, setOpen] = useState(false)
  const label = monthLabel(year, month)
  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    onChange(d.getFullYear(), d.getMonth() + 1)
  }
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn btn-muted min-h-11 px-2.5" onClick={() => shift(-1)} aria-label="Previous month">
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        className="btn btn-muted min-h-11 min-w-36 gap-1.5 px-3"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="text-sm font-medium">{label}</span>
        <ChevronsUpDown size={14} className="shrink-0 opacity-55" />
      </button>
      <button type="button" className="btn btn-muted min-h-11 px-2.5" onClick={() => shift(1)} aria-label="Next month">
        <ChevronRight size={16} />
      </button>
      <MonthBoard
        open={open}
        year={year}
        month={month}
        onClose={() => setOpen(false)}
        onPick={(nextYear, nextMonth) => {
          onChange(nextYear, nextMonth)
          setOpen(false)
        }}
      />
    </div>
  )
}

function MonthBoard({
  open,
  year,
  month,
  onClose,
  onPick,
}: {
  open: boolean
  year: number
  month: number
  onClose: () => void
  onPick: (year: number, month: number) => void
}) {
  const [viewYear, setViewYear] = useState(year)
  const now = currentMonth()

  useEffect(() => {
    if (open) setViewYear(year)
  }, [open, year])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const names = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) =>
        new Date(viewYear, i, 1).toLocaleString(undefined, { month: 'short' }),
      ),
    [viewYear],
  )

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
        aria-label="Close month picker"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Choose month"
        className="safe-bottom absolute inset-x-0 bottom-0 rounded-t-3xl border border-[var(--glass-border)] bg-[var(--surface)] p-5 shadow-[0_-18px_50px_rgba(26,26,26,0.16)] md:inset-auto md:left-1/2 md:top-1/2 md:w-[22rem] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:shadow-[0_18px_50px_rgba(26,26,26,0.16)]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line md:hidden" />
        <div className="mb-1 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Jump in time</p>
            <p className="text-sm text-muted">Tap a month. Year changes with the arrows.</p>
          </div>
          <button type="button" className="btn btn-ghost min-h-9 px-2" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            className="btn btn-muted min-h-11 min-w-11 px-0"
            onClick={() => setViewYear((y) => y - 1)}
            aria-label="Previous year"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="num text-4xl font-semibold tracking-tight tabular-nums">{viewYear}</p>
          <button
            type="button"
            className="btn btn-muted min-h-11 min-w-11 px-0"
            onClick={() => setViewYear((y) => y + 1)}
            aria-label="Next year"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          {names.map((name, i) => {
            const value = i + 1
            const selected = viewYear === year && value === month
            const isNow = viewYear === now.year && value === now.month
            return (
              <button
                key={name}
                type="button"
                onClick={() => onPick(viewYear, value)}
                className={cn(
                  'relative min-h-14 rounded-2xl text-sm font-semibold transition',
                  selected
                    ? 'bg-brand text-ink shadow-[0_8px_18px_color-mix(in_srgb,var(--brand)_35%,transparent)]'
                    : 'bg-[var(--control)] text-ink hover:bg-brand-soft',
                )}
              >
                {name}
                {isNow ? (
                  <span
                    className={cn(
                      'absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full',
                      selected ? 'bg-ink/70' : 'bg-brand',
                    )}
                    aria-hidden
                  />
                ) : null}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          className="btn btn-soft mt-4 min-h-11 w-full"
          onClick={() => onPick(now.year, now.month)}
        >
          This month
        </button>
      </div>
    </div>,
    document.body,
  )
}

export function FormActions({
  onCancel,
  submitLabel,
}: {
  onCancel: () => void
  submitLabel: string
}) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit">{submitLabel}</Button>
    </div>
  )
}
