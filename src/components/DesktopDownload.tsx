import { Monitor } from 'lucide-react'
import { DESKTOP_DOWNLOAD_HREF, desktopDownloadLabel } from '../desktop-release'
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
  return (
    <a href={DESKTOP_DOWNLOAD_HREF} className={cn('btn shrink-0', variant === 'primary' ? 'btn-primary' : 'btn-soft', className)}>
      <span className="btn-label">
        <Monitor size={16} />
        {compact ? 'Download' : desktopDownloadLabel()}
      </span>
    </a>
  )
}
