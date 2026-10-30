import { getVersion } from '@tauri-apps/api/app'
import { relaunch } from '@tauri-apps/plugin-process'
import { check } from '@tauri-apps/plugin-updater'
import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from './ui'

type Status =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'latest'; version: string }
  | { kind: 'downloading'; version: string; received: number; total: number }
  | { kind: 'installing'; version: string }
  | { kind: 'error'; message: string }

function percent(received: number, total: number) {
  if (total <= 0) return null
  return Math.min(100, Math.round((received / total) * 100))
}

function friendlyUpdateError(raw: string) {
  const lower = raw.toLowerCase()
  if (
    lower.includes('404') ||
    lower.includes('not found') ||
    lower.includes('failed to fetch') ||
    lower.includes('could not fetch')
  ) {
    return 'No signed desktop release is up yet. After the next tagged release, this button will install it.'
  }
  if (lower.includes('network') || lower.includes('timed out') || lower.includes('dns')) {
    return 'Could not reach the update server. Check the network and try again.'
  }
  return raw || 'Could not check for updates.'
}

export function DesktopUpdateCard() {
  const [current, setCurrent] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  useEffect(() => {
    void getVersion().then(setCurrent).catch(() => setCurrent(''))
  }, [])

  const busy =
    status.kind === 'checking' || status.kind === 'downloading' || status.kind === 'installing'

  const label =
    status.kind === 'checking'
      ? 'Checking…'
      : status.kind === 'downloading'
        ? `Downloading${percent(status.received, status.total) == null ? '…' : ` ${percent(status.received, status.total)}%`}`
        : status.kind === 'installing'
          ? 'Installing…'
          : 'Check for updates'

  return (
    <section className="card mb-4 grid gap-3 p-4">
      <h2 className="font-semibold">App updates</h2>
      <p className="text-sm text-muted">
        Check for a newer installer and install it here. Your wallet file stays where it is.
      </p>
      {current ? (
        <p className="text-sm text-muted">
          Installed version <span className="font-medium text-ink">{current}</span>
        </p>
      ) : null}
      {status.kind === 'latest' ? (
        <p className="text-sm text-ok">
          You already have the newest version{status.version ? ` (${status.version})` : ''}.
        </p>
      ) : null}
      {status.kind === 'downloading' ? (
        <p className="text-sm text-muted">Retrieving {status.version}…</p>
      ) : null}
      {status.kind === 'error' ? <p className="text-sm text-danger">{status.message}</p> : null}
      <div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            void (async () => {
              setStatus({ kind: 'checking' })
              try {
                const update = await check()
                if (!update) {
                  setStatus({ kind: 'latest', version: current })
                  return
                }
                setStatus({
                  kind: 'downloading',
                  version: update.version,
                  received: 0,
                  total: 0,
                })
                let received = 0
                let total = 0
                await update.downloadAndInstall((event) => {
                  if (event.event === 'Started') {
                    total = event.data.contentLength ?? 0
                    setStatus({
                      kind: 'downloading',
                      version: update.version,
                      received: 0,
                      total,
                    })
                  } else if (event.event === 'Progress') {
                    received += event.data.chunkLength
                    setStatus({
                      kind: 'downloading',
                      version: update.version,
                      received,
                      total,
                    })
                  } else if (event.event === 'Finished') {
                    setStatus({ kind: 'installing', version: update.version })
                  }
                })
                setStatus({ kind: 'installing', version: update.version })
                await relaunch()
              } catch (err) {
                const raw = err instanceof Error ? err.message : String(err)
                setStatus({ kind: 'error', message: friendlyUpdateError(raw) })
              }
            })()
          }}
        >
          <RefreshCw size={16} />
          {label}
        </Button>
      </div>
    </section>
  )
}
