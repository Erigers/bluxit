import { Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from './ui'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallApp() {
  const [installed, setInstalled] = useState(isStandalone)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      setPromptEvent(event)
    }
    const onInstalled = () => {
      setInstalled(true)
      setPromptEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (installed) {
    return (
      <p className="text-sm text-muted">
        bluxit is installed on this device. Wallet data stays here and the app works offline.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-muted">
        Install bluxit like an app. After that it opens on its own and keeps working without a
        network — templates, accounts, and spending stay on this device.
      </p>
      {promptEvent ? (
        <Button
          onClick={() => {
            void (async () => {
              await promptEvent.prompt()
              const choice = await promptEvent.userChoice
              if (choice.outcome === 'accepted') setInstalled(true)
              setPromptEvent(null)
            })()
          }}
        >
          <Download size={16} />
          Install bluxit
        </Button>
      ) : isIos() ? (
        <p className="text-sm text-muted">
          On iPhone or iPad: tap Share, then <span className="font-medium text-ink">Add to Home Screen</span>.
        </p>
      ) : (
        <p className="text-sm text-muted">
          Use your browser’s install or “Add to Home Screen” control when it appears.
        </p>
      )}
    </div>
  )
}
