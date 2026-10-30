import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '../lib'

export function PinInput({
  value,
  onChange,
  autoFocus = false,
  disabled = false,
  ariaLabel = 'PIN',
}: {
  value: string
  onChange: (pin: string) => void
  autoFocus?: boolean
  disabled?: boolean
  ariaLabel?: string
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([null, null, null, null])
  const digits = Array.from({ length: 4 }, (_, i) => value[i] ?? '')

  const setAt = (index: number, char: string) => {
    const next = digits.slice()
    next[index] = char
    onChange(next.join('').slice(0, 4))
  }

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!text) return
    onChange(text)
    refs.current[Math.min(text.length, 3)]?.focus()
  }

  const onKey = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[index]) setAt(index, '')
      else {
        setAt(Math.max(index - 1, 0), '')
        refs.current[Math.max(index - 1, 0)]?.focus()
      }
      return
    }
    if (e.key === 'ArrowLeft') {
      refs.current[Math.max(index - 1, 0)]?.focus()
      return
    }
    if (e.key === 'ArrowRight') {
      refs.current[Math.min(index + 1, 3)]?.focus()
    }
  }

  return (
    <div className="flex justify-center gap-2" role="group" aria-label={ariaLabel}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el
          }}
          className={cn(
            'pin-digit h-14 w-12 rounded-2xl border border-transparent bg-[var(--control)] text-center text-2xl text-ink outline-none',
            'focus:border-brand/40 focus:bg-surface/80 focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_16%,transparent)]',
            disabled && 'opacity-50',
          )}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          value={digit}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          aria-label={`${ariaLabel} digit ${index + 1}`}
          onChange={(e) => {
            const char = e.target.value.replace(/\D/g, '').slice(-1)
            if (!char) {
              setAt(index, '')
              return
            }
            setAt(index, char)
            refs.current[Math.min(index + 1, 3)]?.focus()
          }}
          onKeyDown={(e) => onKey(index, e)}
          onPaste={onPaste}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  )
}
