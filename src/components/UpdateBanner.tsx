import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { isAppleHandheld, subscribeAppleUpdate } from '../pwa'

export function UpdateBanner() {
  const [ready, setReady] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const apple = isAppleHandheld()

  useEffect(() => {
    if (!apple) return
    return subscribeAppleUpdate(setReady)
  }, [apple])

  useEffect(() => {
    const el = barRef.current
    if (!ready || !apple || !el) {
      document.documentElement.classList.remove('has-app-update')
      document.documentElement.style.removeProperty('--update-banner-h')
      return
    }

    const apply = () => {
      document.documentElement.style.setProperty('--update-banner-h', `${el.offsetHeight}px`)
      document.documentElement.classList.add('has-app-update')
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => {
      observer.disconnect()
      document.documentElement.classList.remove('has-app-update')
      document.documentElement.style.removeProperty('--update-banner-h')
    }
  }, [apple, ready])

  if (!apple || !ready) return null

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 top-0 z-[90] border-b border-brand/25 bg-brand-soft pt-[env(safe-area-inset-top)] text-ink"
      role="status"
    >
      <div className="mx-auto flex min-h-11 max-w-5xl items-start gap-3 px-4 py-2">
        <RefreshCw size={16} className="mt-0.5 shrink-0 text-brand" aria-hidden />
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
          A new version is ready. Close the app and open it again to view the update.
        </p>
      </div>
    </div>
  )
}
