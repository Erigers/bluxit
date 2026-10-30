import { useEffect, useState, type ReactNode } from 'react'
import { getWalletPath, isDesktop } from '../desktop'
import { Logo } from './Logo'
import { PickWallet } from './PickWallet'

export function DesktopShell({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<'web' | 'boot' | 'pick' | 'ready'>(() =>
    isDesktop() ? 'boot' : 'web',
  )

  useEffect(() => {
    if (!isDesktop()) return
    void getWalletPath()
      .then((path) => setPhase(path ? 'ready' : 'pick'))
      .catch(() => setPhase('pick'))
  }, [])

  if (phase === 'web' || phase === 'ready') return children

  if (phase === 'pick') return <PickWallet onReady={() => setPhase('ready')} />

  return (
    <div className="grid min-h-dvh place-items-center bg-bg text-ink">
      <Logo className="text-2xl" />
    </div>
  )
}
