import { Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import { desktopDownloadLink, RELEASES_URL } from '../desktop-release'
import { cn } from '../lib'

export function DesktopDownload({
  className,
  variant = 'soft',
  compact = false,
}: {
  className?: string
  variant?: 'primary' | 'soft'
  compact?: boolean
}) {
  const [offer, setOffer] = useState({ href: RELEASES_URL, label: 'Download desktop app' })

  useEffect(() => {
    void desktopDownloadLink().then(setOffer)
  }, [])

  return (
    <a
      href={offer.href}
      className={cn('btn shrink-0', variant === 'primary' ? 'btn-primary' : 'btn-soft', className)}
    >
      <span className="btn-label">
        <Monitor size={16} />
        {compact ? 'Download' : offer.label}
      </span>
    </a>
  )
}
