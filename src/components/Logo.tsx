import { cn } from '../lib'

export function Logo({
  className,
  markClassName,
}: {
  className?: string
  markClassName?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <svg
        viewBox="0 0 32 32"
        className={cn('h-8 w-8', markClassName)}
        aria-hidden
      >
        <rect width="32" height="32" rx="8" fill="currentColor" className="text-brand" />
        <circle cx="16" cy="16" r="8.2" fill="none" stroke="#fff" strokeWidth="2.4" />
        <path d="M16 16 L16 8.2 A7.8 7.8 0 0 1 23.2 16 Z" fill="#fff" />
      </svg>
      bluxit
    </span>
  )
}
