import { RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Button } from './ui'

const CHECK_MS = 15 * 60 * 1000

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        void registration.update()
      }
      window.setInterval(check, CHECK_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  useEffect(() => {
    document.documentElement.classList.toggle('has-app-update', needRefresh)
    return () => document.documentElement.classList.remove('has-app-update')
  }, [needRefresh])

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[90] border-b border-brand/25 bg-brand-soft pt-[env(safe-area-inset-top)] text-ink">
      <div className="mx-auto flex min-h-11 max-w-5xl items-center gap-3 px-4 py-2">
        <RefreshCw size={16} className="shrink-0 text-brand" aria-hidden />
        <p className="min-w-0 flex-1 text-sm font-medium">A newer bluxit is ready on this device.</p>
        <Button
          className="shrink-0"
          onClick={() => {
            void updateServiceWorker(true)
          }}
        >
          Update
        </Button>
      </div>
    </div>
  )
}
