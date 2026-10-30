import { Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import { desktopDownloadLink, RELEASES_URL } from '../desktop-release'
import { isDesktop } from '../desktop'
import { cn } from '../lib'

export function DesktopDownload({
  className,
  variant = 'soft',
}: {
  className?: string
  variant?: 'primary' | 'soft'
}) {
  const hidden = isDesktop()
  const [offer, setOffer] = useState({ href: RELEASES_URL, label: 'Download desktop app' })

  useEffect(() => {
    if (hidden) return
    void desktopDownloadLink().then(setOffer)
  }, [hidden])

  if (hidden) return null

  return (
    <a
      href={offer.href}
      className={cn('btn', variant === 'primary' ? 'btn-primary' : 'btn-soft', className)}
    >
      <span className="btn-label">
        <Monitor size={16} />
        {offer.label}
      </span>
    </a>
  )
}
