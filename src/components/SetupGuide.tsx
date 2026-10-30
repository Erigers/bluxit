import { ArrowRight, Check } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../lib'
import { SETUP_STEPS, setupProgress } from '../setup'
import { useStore } from '../store'
import { Button } from './ui'

export function SetupGuide() {
  const { state, user, updateProfile } = useStore()
  const progress = setupProgress(state, user)
  const navigate = useNavigate()

  if (!progress.visible || !user) return null

  const { current, doneCount, done } = progress
  const pct = (doneCount / SETUP_STEPS.length) * 100
  const lastStep = current.id === 'logging'

  const continueOn = () => {
    updateProfile({ setupGuideHidden: true })
    navigate('/expenses')
  }

  return (
    <section className="card mb-4 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand">Set up this device</p>
          <h2 className="text-lg font-semibold leading-snug">{current.label}</h2>
          <p className="mt-1 text-sm text-muted">{current.hint}</p>
        </div>
        <p className="num shrink-0 text-sm text-muted">
          {doneCount}/{SETUP_STEPS.length}
        </p>
      </div>

      <div
        className="mb-4 h-1.5 overflow-hidden rounded-full bg-brand-soft"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={SETUP_STEPS.length}
        aria-valuenow={doneCount}
        aria-label="Device setup"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="grid grid-cols-5 gap-1">
        {SETUP_STEPS.map((step) => {
          const complete = done[step.id]
          const isCurrent = step.id === current.id
          return (
            <li key={step.id}>
              <button
                type="button"
                className={cn(
                  'grid w-full justify-items-center gap-1 rounded-2xl px-0.5 py-1.5',
                  isCurrent ? 'bg-brand-soft' : 'hover:bg-brand-soft/60',
                )}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={`Step ${step.n}: ${step.label}${complete ? ', done' : ''}`}
                onClick={() => navigate(step.to)}
              >
                <span
                  className={cn(
                    'grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-semibold',
                    complete && 'border-brand bg-brand text-ink',
                    isCurrent && !complete && 'border-brand text-brand',
                    !complete && !isCurrent && 'border-line text-muted',
                  )}
                >
                  {complete ? <Check size={14} /> : step.n}
                </span>
                <span
                  className={cn(
                    'text-[10px] font-medium leading-tight md:text-xs',
                    isCurrent || complete ? 'text-ink' : 'text-muted',
                  )}
                >
                  {step.short}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      <div className="mt-4 flex justify-end">
        {lastStep ? (
          <Button onClick={continueOn}>
            Continue
            <ArrowRight size={16} />
          </Button>
        ) : (
          <Button onClick={() => navigate(current.to)}>
            Go
            <ArrowRight size={16} />
          </Button>
        )}
      </div>
    </section>
  )
}
