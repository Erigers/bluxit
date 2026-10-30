import { FolderOpen, HardDrive, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  defaultWalletPath,
  pickExistingWalletFile,
  pickNewWalletFile,
  setWalletPath,
} from '../desktop'
import { Logo } from './Logo'
import { Button } from './ui'

export function PickWallet({ onReady }: { onReady: () => void }) {
  const [suggested, setSuggested] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void defaultWalletPath().then(setSuggested)
  }, [])

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try {
      await work()
      onReady()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not use that location.')
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Logo className="justify-center text-2xl" />
          <p className="mt-3 text-lg font-medium text-ink">Where should this wallet live?</p>
          <p className="mt-2 text-sm text-muted">
            On the desktop app, you choose the file. bluxit will keep using it until you change it in
            Settings.
          </p>
        </div>
        <div className="card grid gap-4 p-5">
          <h1 className="text-xl font-semibold">Choose a location</h1>
          {suggested ? (
            <p className="break-all rounded-2xl bg-[var(--control)] px-3 py-2 text-xs text-muted">
              {suggested}
            </p>
          ) : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button
            disabled={busy || !suggested}
            onClick={() =>
              void run(async () => {
                await setWalletPath(suggested)
              })
            }
          >
            <Sparkles size={16} />
            {busy ? 'Saving…' : 'Use this place'}
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const path = await pickNewWalletFile(suggested || 'bluxit.json')
                if (!path) throw new Error('Pick a file to continue.')
                await setWalletPath(path)
              })
            }
          >
            <HardDrive size={16} />
            Choose a different place
          </Button>
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const path = await pickExistingWalletFile()
                if (!path) throw new Error('Pick a wallet file to continue.')
                await setWalletPath(path)
              })
            }
          >
            <FolderOpen size={16} />
            Open an existing wallet
          </Button>
        </div>
      </div>
    </div>
  )
}
