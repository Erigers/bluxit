import { Download, FolderOpen, HardDrive, KeyRound, LogOut, Trash2, Upload, User } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { InstallApp } from '../components/InstallApp'
import { PinInput } from '../components/PinInput'
import { ThemeToggle } from '../components/ThemeToggle'
import { Button, Field, Modal, PageHeader } from '../components/ui'
import {
  getWalletPath,
  isDesktop,
  moveWallet,
  pickExistingWalletFile,
  pickNewWalletFile,
  setWalletPath,
} from '../desktop'
import { downloadJson, isPin } from '../lib'
import { emptyState } from '../storage'
import { useStore } from '../store'
import type { AppState } from '../types'

export function Settings() {
  const { user, updateProfile, logout, importState, clearMyData, state, changePin } = useStore()
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const hasPin = Boolean(user?.pinHash)
  const [currentPin, setCurrentPin] = useState('')
  const [nextPin, setNextPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMessage, setPinMessage] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinBusy, setPinBusy] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle={
          isDesktop()
            ? 'Everything here is stored in the wallet file you chose.'
            : 'Everything here is stored on this device.'
        }
      />

      {isDesktop() ? <WalletFileCard /> : (
        <section className="card mb-4 grid gap-3 p-4">
          <h2 className="font-semibold">Install app</h2>
          <InstallApp />
        </section>
      )}

      <section className="card mb-4 grid gap-3 p-4">
        <h2 className="font-semibold">Profile</h2>
        <Field label="Display name" icon={<User size={16} />}>
          <input
            className="field"
            value={user?.displayName ?? ''}
            onChange={(e) => updateProfile({ displayName: e.target.value })}
          />
        </Field>
        <p className="text-sm text-muted">
          Signed in as <span className="font-medium text-ink">{user?.username}</span>
        </p>
      </section>

      <section className="card mb-4 grid gap-3 p-4">
        <h2 className="font-semibold">{hasPin ? 'Change PIN' : 'Set a PIN'}</h2>
        <p className="text-sm text-muted">
          After 20 minutes without using the app, bluxit asks for this 4-digit PIN. It stays on this
          device.
        </p>
        {hasPin ? (
          <Field label="Current PIN">
            <PinInput value={currentPin} onChange={setCurrentPin} ariaLabel="Current PIN" />
          </Field>
        ) : null}
        <Field label="New PIN">
          <PinInput value={nextPin} onChange={setNextPin} ariaLabel="New PIN" />
        </Field>
        <Field label="Confirm new PIN">
          <PinInput value={confirmPin} onChange={setConfirmPin} ariaLabel="Confirm new PIN" />
        </Field>
        {pinError ? <p className="text-sm text-danger">{pinError}</p> : null}
        {pinMessage ? <p className="text-sm text-ok">{pinMessage}</p> : null}
        <div>
          <Button
            disabled={pinBusy}
            onClick={() => {
              void (async () => {
                setPinError('')
                setPinMessage('')
                if (!isPin(nextPin) || nextPin !== confirmPin) {
                  setPinError('New PIN must be 4 digits, entered twice the same way.')
                  return
                }
                setPinBusy(true)
                const result = await changePin(nextPin, hasPin ? currentPin : undefined)
                setPinBusy(false)
                if (!result.ok) {
                  setPinError(result.error)
                  return
                }
                setCurrentPin('')
                setNextPin('')
                setConfirmPin('')
                setPinMessage(hasPin ? 'PIN updated.' : 'PIN saved. The lock will use it after 20 minutes idle.')
              })()
            }}
          >
            <KeyRound size={16} />
            {pinBusy ? 'Saving…' : hasPin ? 'Update PIN' : 'Save PIN'}
          </Button>
        </div>
      </section>

      <section className="card mb-4 grid gap-3 p-4">
        <h2 className="font-semibold">Appearance</h2>
        <p className="text-sm text-muted">Light, dark, or follow the device.</p>
        <ThemeToggle />
      </section>

      <section className="card mb-4 grid gap-3 p-4">
        <h2 className="font-semibold">On this device</h2>
        <p className="text-sm text-muted">
          {isDesktop()
            ? 'Templates, accounts, income, expenses, and debts stay in your wallet file. Export a copy if you want a second backup.'
            : 'Templates, accounts, income, expenses, and debts stay in local storage. Server sync can come later — export a copy if you switch phones.'}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() =>
              downloadJson(`bluxit-${user?.username ?? 'backup'}.json`, state)
            }
          >
            <Download size={16} />
            Export my data
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload size={16} />
            Import backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const parsed = JSON.parse(await file.text()) as Partial<AppState>
                if (!confirm('Replace data on this device with the backup file?')) return
                importState({ ...emptyState(), ...parsed, sessionUserId: state.sessionUserId })
              } catch {
                alert('That file is not a valid bluxit backup.')
              }
            }}
          />
        </div>
      </section>

      <section className="card mb-4 grid gap-3 p-4">
        <h2 className="font-semibold">Clear this device</h2>
        <p className="text-sm text-muted">
          Wipe the wallet stored in this browser — templates, accounts, salaries, bonuses, types,
          expenses, and local debts. Your username and PIN stay, so you can set the device up again.
          This cannot be undone.
        </p>
        <div>
          <Button variant="danger" onClick={() => setClearOpen(true)}>
            <Trash2 size={16} />
            Clear data on this device
          </Button>
        </div>
      </section>

      <section className="card grid gap-3 p-4">
        <h2 className="font-semibold">Session</h2>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              logout()
              navigate('/login')
            }}
          >
            <LogOut size={16} />
            Log out
          </Button>
        </div>
      </section>

      <Modal
        open={clearOpen}
        title="Clear data on this device?"
        onClose={() => setClearOpen(false)}
      >
        <div className="grid gap-3 text-sm">
          <p>
            This permanently deletes the wallet saved in this browser: templates, accounts, income,
            bonuses, expense types, expenses, allocations, and local debts.
          </p>
          <p className="text-muted">
            Your username and PIN are not removed. Catalog listings you already shared stay on the
            server. Export a copy first if you might need this wallet later.
          </p>
          <p className="font-semibold text-danger">This cannot be undone.</p>
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setClearOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              clearMyData()
              setClearOpen(false)
            }}
          >
            <Trash2 size={16} />
            Clear this device
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function WalletFileCard() {
  const [path, setPath] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getWalletPath().then(setPath)
  }, [])

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await work()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change that location.')
      setBusy(false)
    }
  }

  return (
    <section className="card mb-4 grid gap-3 p-4">
      <h2 className="font-semibold">Wallet file</h2>
      <p className="text-sm text-muted">
        This desktop app writes your accounts and spending to a JSON file you choose. Change the
        place any time — a copy of the current wallet is written there.
      </p>
      <p className="break-all rounded-2xl bg-[var(--control)] px-3 py-2 text-xs text-ink">
        {path || 'No location chosen yet.'}
      </p>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const next = await pickNewWalletFile(path || 'bluxit.json')
              if (!next) throw new Error('Pick a file to continue.')
              await moveWallet(next)
            })
          }
        >
          <HardDrive size={16} />
          {busy ? 'Moving…' : 'Change location'}
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const next = await pickExistingWalletFile()
              if (!next) throw new Error('Pick a wallet file to continue.')
              await setWalletPath(next)
            })
          }
        >
          <FolderOpen size={16} />
          Open a different file
        </Button>
      </div>
    </section>
  )
}
