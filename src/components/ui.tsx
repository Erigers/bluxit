import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { PALETTE, cn } from '../lib'

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
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {action}
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
  return (
    <div className="fixed inset-0 z-50 grid place-items-end p-0 md:place-items-center md:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="card relative z-10 w-full max-h-[92dvh] overflow-auto rounded-t-3xl p-5 md:max-w-lg md:rounded-3xl">
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
    </div>
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
  const label = new Date(year, month - 1, 1).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  })
  const shift = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    onChange(d.getFullYear(), d.getMonth() + 1)
  }
  return (
    <div className="flex items-center gap-1">
      <button type="button" className="btn btn-muted min-h-9 px-2.5" onClick={() => shift(-1)} aria-label="Previous month">
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-32 text-center text-sm font-medium">{label}</span>
      <button type="button" className="btn btn-muted min-h-9 px-2.5" onClick={() => shift(1)} aria-label="Next month">
        <ChevronRight size={16} />
      </button>
    </div>
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
