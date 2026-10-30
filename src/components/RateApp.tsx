import { Star } from 'lucide-react'
import { useState } from 'react'
import { readLocalRating, submitRating } from '../cloud'
import { cn } from '../lib'

export function RateApp() {
  const [mine, setMine] = useState<number | null>(readLocalRating)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(mine !== null)

  const pick = (stars: number) => {
    if (busy) return
    setMine(stars)
    setBusy(true)
    void submitRating(stars).then((stats) => {
      setBusy(false)
      setSaved(Boolean(stats) || readLocalRating() === stars)
    })
  }

  return (
    <section className="card p-4">
      <h2 className="font-semibold">Like the app?</h2>
      <p className="mt-1 text-sm text-muted">
        {saved && mine
          ? `You rated ${mine} star${mine === 1 ? '' : 's'}. Tap to change — it shows on the landing page.`
          : 'Rate it. Your stars join everyone else’s on the landing page.'}
      </p>
      <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Rate bluxit">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = (mine ?? 0) >= n
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={mine === n}
              aria-label={`${n} star${n === 1 ? '' : 's'}`}
              disabled={busy}
              onClick={() => pick(n)}
              className={cn(
                'flex h-11 w-11 items-center justify-center rounded-full transition-colors',
                on ? 'text-brand' : 'text-muted',
                busy ? 'opacity-70' : 'active:bg-brand-soft',
              )}
            >
              <Star size={22} className={on ? 'fill-current' : undefined} aria-hidden />
            </button>
          )
        })}
      </div>
    </section>
  )
}

export function RatingStars({ value, size = 18 }: { value: number; size?: number }) {
  const filled = Math.round(value)
  return (
    <span className="inline-flex items-center gap-0.5 text-brand" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= filled ? 'fill-current' : 'text-muted'} />
      ))}
    </span>
  )
}
