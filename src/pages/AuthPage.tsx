import { Sparkles, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { PinInput } from '../components/PinInput'
import { ThemeToggle } from '../components/ThemeToggle'
import { Button, Field } from '../components/ui'
import { flushCloudEvents, trackCloudEvent } from '../cloud'
import { applyTheme, isPin } from '../lib'
import { postAuthPath } from '../setup'
import { usePrefersDark, useStore } from '../store'

export function AuthPage() {
  const { user, register, login, state } = useStore()
  const prefersDark = usePrefersDark()
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const pref = (localStorage.getItem('bluxit:theme') as 'light' | 'dark' | 'system') || 'system'
    applyTheme(pref)
  }, [prefersDark])

  useEffect(() => {
    void flushCloudEvents()
  }, [])

  if (user) return <Navigate to={postAuthPath(state, user)} replace />

  const submit = async () => {
    setBusy(true)
    setError('')
    const name = username.trim().toLowerCase()
    if (name.length < 3) {
      setError('Username must be at least 3 characters.')
      setBusy(false)
      return
    }
    if (!isPin(pin) || pin !== pinConfirm) {
      setError('PIN must be 4 digits, entered twice the same way.')
      setBusy(false)
      return
    }
    const existing = state.users.some((u) => u.username === name)
    const result = existing ? await login(name, pin) : await register({ username: name, pin })
    if (!result.ok) setError(result.error)
    else if (!existing) trackCloudEvent('begin')
    setBusy(false)
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-8">
      <div className="absolute right-4 top-4">
        <ThemeToggle compact />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex justify-center">
            <Logo className="justify-center text-2xl" />
          </Link>
          <p className="mt-3 text-lg font-medium text-ink">Track your money. Keep your freedom.</p>
          <p className="mt-2 text-sm text-muted">
            Free forever. Username, PIN, and wallet stay on this device — never uploaded to check uniqueness.
          </p>
        </div>
        <form
          className="card grid gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <h1 className="text-xl font-semibold">Begin journey</h1>
          <Field
            label="Username"
            hint="Only checked against accounts already on this device. Nothing is sent to a server."
            icon={<User size={16} />}
          >
            <input
              className="field"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={3}
              required
            />
          </Field>
          <Field
            label="4-digit PIN"
            hint="Stored only on this device. After 20 minutes idle, bluxit asks for it."
          >
            <PinInput value={pin} onChange={setPin} ariaLabel="PIN" />
          </Field>
          <Field label="Confirm PIN">
            <PinInput
              value={pinConfirm}
              onChange={setPinConfirm}
              ariaLabel="Confirm PIN"
            />
          </Field>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            <Sparkles size={16} />
            {busy ? 'Please wait…' : 'Begin'}
          </Button>
        </form>
      </div>
    </div>
  )
}
