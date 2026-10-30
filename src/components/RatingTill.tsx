import { RatingStars } from './RateApp'
import Counter from './bits/Counter'
import type { RatingStats } from '../cloud'

export function RatingTill({ ratings }: { ratings: RatingStats | null }) {
  if (!ratings || ratings.count === 0) {
    return (
      <div className="rating-till">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">The till</p>
        <p className="mt-4 text-sm text-muted">
          Empty drawer. Open the app, tap stars on Home, and they roll in here.
        </p>
      </div>
    )
  }

  return (
    <div className="rating-till">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
        <span>The till</span>
        <span className="tabular-nums">
          {ratings.count} {ratings.count === 1 ? 'tap' : 'taps'}
        </span>
      </div>
      <div className="rating-till-perforation" aria-hidden="true" />
      <div className="mt-5 grid gap-5">
        <div>
          <div className="overflow-hidden leading-none [contain:paint]">
            <Counter
              value={ratings.average}
              decimals={1}
              fontSize="clamp(2.5rem, 7vw, 3.25rem)"
              fontWeight={600}
              duration={1.1}
              fade={0.12}
              motionBlur={false}
              className="num text-ink"
            />
          </div>
          <div className="mt-2">
            <RatingStars value={ratings.average} size={20} />
          </div>
          <p className="mt-1 text-sm text-muted">public average</p>
        </div>
        <ul className="grid gap-1.5 text-xs text-muted">
          {[5, 4, 3, 2, 1].map((star) => {
            const n = ratings.histogram[star - 1]
            const pct = ratings.count ? Math.round((n / ratings.count) * 100) : 0
            return (
              <li key={star} className="flex items-center gap-2">
                <span className="w-3 tabular-nums">{star}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--control)]">
                  <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-6 text-right tabular-nums">{n}</span>
              </li>
            )
          })}
        </ul>
      </div>
      <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-muted">not a bank · just stars</p>
    </div>
  )
}
