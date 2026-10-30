import { cn } from '../lib'

const CLUSTER = [
  { cx: 28, r: 15 },
  { cx: 70, r: 20 },
  { cx: 114, r: 14 },
]
const TILE = 168
const TILES = 16

export function CloudEdge({ className }: { className?: string }) {
  return (
    <svg
      className={cn(
        'pointer-events-none block h-7 w-full overflow-visible text-[color-mix(in_srgb,var(--surface)_90%,transparent)]',
        className,
      )}
      width="100%"
      height="28"
      aria-hidden
    >
      <defs>
        <filter id="bluxit-cloud-edge" x="-8%" y="-30%" width="116%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#1a1a1a" floodOpacity="0.18" />
        </filter>
      </defs>
      <g fill="currentColor" filter="url(#bluxit-cloud-edge)">
        <rect width="100%" height="5" />
        {Array.from({ length: TILES }, (_, i) =>
          CLUSTER.map((puff) => (
            <circle
              key={`${i}-${puff.cx}`}
              cx={i * TILE + puff.cx}
              cy={5}
              r={puff.r}
            />
          )),
        )}
      </g>
    </svg>
  )
}
