import { Delete, LogOut } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trackCloudEvent } from '../cloud'
import { isIdle, isPin, touchActivity } from '../lib'
import { useStore } from '../store'
import { Logo } from './Logo'
import { PinInput } from './PinInput'
import { Button } from './ui'

export function PinLock() {
  const { user, verifyPin, logout } = useStore()
  const navigate = useNavigate()
  const [locked, setLocked] = useState(false)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const lockedRef = useRef(false)
  const userId = user?.id
  const hasPin = Boolean(user?.pinHash)

  useEffect(() => {
    lockedRef.current = locked
  }, [locked])

  const lock = useCallback(() => {
    lockedRef.current = true
    setLocked(true)
    setPin('')
    setError('')
  }, [])

  useEffect(() => {
    if (!userId || !hasPin) {
      setLocked(false)
      return
    }
    if (isIdle(userId)) lock()
    else touchActivity(userId)

    const onActivity = (event: Event) => {
      if (lockedRef.current) return
      if (isIdle(userId)) {
        event.preventDefault()
        event.stopPropagation()
        lock()
        return
      }
      touchActivity(userId)
    }

    const tick = () => {
      if (!lockedRef.current && isIdle(userId)) lock()
    }

    const events = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const
    for (const name of events) window.addEventListener(name, onActivity, true)
    document.addEventListener('visibilitychange', tick)
    const interval = window.setInterval(tick, 1000)
    return () => {
      for (const name of events) window.removeEventListener(name, onActivity, true)
      document.removeEventListener('visibilitychange', tick)
      window.clearInterval(interval)
    }
  }, [hasPin, lock, userId])

  useEffect(() => {
    if (!locked) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [locked])

  const unlock = useCallback(
    async (value: string) => {
      if (!isPin(value) || busy) return
      setBusy(true)
      setError('')
      const ok = await verifyPin(value)
      setBusy(false)
      if (!ok) {
        setError('Wrong PIN.')
        setPin('')
        return
      }
      if (userId) touchActivity(userId)
      lockedRef.current = false
      setLocked(false)
      setPin('')
      trackCloudEvent('pin_unlock')
    },
    [busy, userId, verifyPin],
  )

  useEffect(() => {
    if (locked && isPin(pin)) void unlock(pin)
  }, [locked, pin, unlock])

  if (!locked || !hasPin) return null

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-bg/95 px-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-lock-title"
    >
      <div className="card w-full max-w-sm p-6 text-center">
        <Logo className="mb-5 justify-center text-xl" />
        <h2 id="pin-lock-title" className="text-lg font-semibold">
          {user?.displayName ? `Welcome back, ${user.displayName}` : 'Welcome back'}
        </h2>
        <p className="mt-1 text-sm text-muted">Enter your 4-digit PIN to keep going.</p>
        <div className="mt-5">
          <PinInput value={pin} onChange={setPin} autoFocus disabled={busy} ariaLabel="Unlock PIN" />
        </div>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : <div className="mt-3 h-5" />}
        <Keypad
          onDigit={(d) => {
            if (pin.length >= 4 || busy) return
            setPin((p) => (p + d).slice(0, 4))
          }}
          onBack={() => setPin((p) => p.slice(0, -1))}
        />
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-danger"
          onClick={() => {
            logout()
            navigate('/login')
          }}
        >
          <LogOut size={16} />
          Log out
        </button>
      </div>
    </div>
  )
}

function Keypad({
  onDigit,
  onBack,
}: {
  onDigit: (digit: string) => void
  onBack: () => void
}) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {keys.map((key) => {
        if (!key) return <span key="empty" />
        if (key === 'back') {
          return (
            <Button key="back" variant="ghost" className="h-10" onClick={onBack} aria-label="Delete">
              <Delete size={18} />
            </Button>
          )
        }
        return (
          <Button key={key} variant="soft" className="h-10 text-lg num" onClick={() => onDigit(key)}>
            {key}
          </Button>
        )
      })}
    </div>
  )
}
