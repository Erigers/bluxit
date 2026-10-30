import { Check, Layers, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Button,
  ColorDot,
  EmptyState,
  Field,
  FormActions,
  Modal,
  Money,
  PageHeader,
} from '../components/ui'
import { allocationAmount } from '../finance'
import { currentMonth, lastDayOfMonth } from '../lib'
import { useStore, useWorkspace } from '../store'
import type { AllocationMode, IncomeSettings, InflowScheduleType } from '../types'

type SalaryDraft = {
  monthlyAmount: string
  sourceName: string
  scheduleType: InflowScheduleType
  specificDay: string
}

const emptyDraft = (): SalaryDraft => ({
  monthlyAmount: '',
  sourceName: '',
  scheduleType: 'first-day',
  specificDay: '1',
})

function fromIncome(row: IncomeSettings): SalaryDraft {
  return {
    monthlyAmount: row.monthlyAmount ? String(row.monthlyAmount) : '',
    sourceName: row.sourceName,
    scheduleType: row.scheduleType,
    specificDay: String(row.specificDay),
  }
}

function toInput(draft: SalaryDraft) {
  return {
    monthlyAmount: Number(draft.monthlyAmount) || 0,
    sourceName: draft.sourceName,
    scheduleType: draft.scheduleType,
    specificDay: Number(draft.specificDay) || 1,
  }
}

function scheduleLabel(row: IncomeSettings) {
  if (row.scheduleType === 'first-day') return 'First day of the month'
  if (row.scheduleType === 'first-monday') return 'First Monday of the month'
  return `Day ${row.specificDay} each month`
}

export function Income() {
  const {
    user,
    updateProfile,
    upsertIncome,
    addIncome,
    updateIncome,
    deleteIncome,
    addBonus,
    deleteBonus,
    upsertAllocation,
    clearAllocation,
  } = useStore()
  const ws = useWorkspace()
  const [params] = useSearchParams()
  const setup = params.get('setup') === '1'
  const [draft, setDraft] = useState<SalaryDraft>(emptyDraft)
  const [bonusOpen, setBonusOpen] = useState(false)
  const [bonusAmount, setBonusAmount] = useState('')
  const [bonusName, setBonusName] = useState('')
  const [bonusDay, setBonusDay] = useState('15')
  const [bonusMonth, setBonusMonth] = useState(String(currentMonth().month))
  const [bonusYear, setBonusYear] = useState(String(currentMonth().year))
  const [salaryOpen, setSalaryOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const multiple = user?.hasMultipleSalaries === true
  const primary = ws.income
  const primaryKey = primary
    ? `${primary.id}:${primary.monthlyAmount}:${primary.sourceName}:${primary.scheduleType}:${primary.specificDay}`
    : 'none'

  useEffect(() => {
    if (multiple) return
    setDraft(primary ? fromIncome(primary) : emptyDraft())
  }, [multiple, primary, primaryKey])

  const chooseOneSalary = () => {
    updateProfile({ hasMultipleSalaries: false })
    setDraft(ws.income ? fromIncome(ws.income) : emptyDraft())
  }

  const chooseManySalaries = () => {
    updateProfile({ hasMultipleSalaries: true })
  }

  const closeSalaryModal = () => {
    setSalaryOpen(false)
    setEditingId(null)
  }

  const over = ws.inflow.total > 0 && ws.unallocated < -0.009
  const now = currentMonth()
  const currency = ws.accounts[0]?.currency ?? 'USD'

  const openNewSalary = () => {
    setEditingId(null)
    setDraft(emptyDraft())
    setSalaryOpen(true)
  }

  const openEditSalary = (row: IncomeSettings) => {
    setEditingId(row.id)
    setDraft(fromIncome(row))
    setSalaryOpen(true)
  }

  const saveSalaryModal = () => {
    if (editingId) updateIncome(editingId, toInput(draft))
    else addIncome(toInput(draft))
    setSalaryOpen(false)
    setEditingId(null)
    setDraft(emptyDraft())
  }

  return (
    <div>
      <PageHeader
        title="Income"
        subtitle="Salary and bonuses are cash inflow. Split them into accounts by percent or a fixed amount."
      />

      {setup ? (
        <div className="card mb-4 border-brand p-4">
          <p className="font-semibold">Set up cash flow for this template</p>
          <p className="mt-1 text-sm text-muted">
            Import brought the account names and type colors. Add your salary or bonuses, then split inflow
            into the accounts — that part never leaves this device.
          </p>
        </div>
      ) : null}

      {multiple ? (
        <section className="card mb-4 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Monthly salaries</h2>
            <Button variant="soft" onClick={openNewSalary}>
              <Plus size={16} /> Salary
            </Button>
          </div>
          {ws.incomes.length === 0 ? (
            <p className="text-sm text-muted">Add each monthly salary with its amount and payday.</p>
          ) : (
            <ul className="grid gap-2">
              {ws.incomes.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line px-3 py-2.5 text-sm"
                >
                  <span>
                    <span className="font-medium">{row.sourceName.trim() || 'Salary'}</span>
                    <span className="text-muted"> · {scheduleLabel(row)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Money amount={row.monthlyAmount} currency={currency} className="num" />
                    <button
                      type="button"
                      className="rounded-lg p-2 text-muted hover:bg-brand-soft"
                      onClick={() => openEditSalary(row)}
                      aria-label="Edit salary"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-muted hover:bg-brand-soft hover:text-danger"
                      onClick={() => deleteIncome(row.id)}
                      aria-label="Delete salary"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <form
          key={primaryKey}
          className="card mb-4 grid gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            upsertIncome(toInput(draft))
          }}
        >
          <h2 className="font-semibold">Monthly salary</h2>
          <SalaryFields draft={draft} onChange={setDraft} />
          <div className="flex justify-end">
            <Button type="submit">
              <Check size={16} />
              Save income
            </Button>
          </div>
        </form>
      )}

      <section className="card mb-4 p-4">
        <h2 className="font-semibold">Do you have more than one monthly salary?</h2>
        <p className="mt-1 text-sm text-muted">
          A second job, a pension, support — anything that lands every month. Bonuses stay in their own
          list below.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant={!multiple ? 'primary' : 'outline'}
            onClick={chooseOneSalary}
          >
            No, just one
          </Button>
          <Button
            variant={multiple ? 'primary' : 'outline'}
            onClick={chooseManySalaries}
          >
            Yes, more than one
          </Button>
        </div>
      </section>

      <section className="card mb-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Bonuses</h2>
          <Button variant="soft" onClick={() => setBonusOpen(true)}>
            <Plus size={16} /> Bonus
          </Button>
        </div>
        {ws.bonuses.length === 0 ? (
          <p className="text-sm text-muted">Add a bonus for a specific month and day.</p>
        ) : (
          <ul className="grid gap-2">
            {[...ws.bonuses]
              .sort((a, b) => b.year - a.year || b.month - a.month || b.day - a.day)
              .map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    <span className="font-medium">{b.sourceName || 'Bonus'}</span>
                    <span className="text-muted">
                      {' '}
                      · {b.year}-{String(b.month).padStart(2, '0')}-{String(b.day).padStart(2, '0')}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="num">{b.amount.toFixed(2)}</span>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-muted hover:text-danger"
                      onClick={() => deleteBonus(b.id)}
                      aria-label="Delete bonus"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h2 className="font-semibold">Split this month’s inflow</h2>
        <p className="mt-1 text-sm text-muted">
          This month:{' '}
          <Money
            amount={ws.inflow.total}
            currency={currency}
            className="font-medium text-ink"
          />
          {ws.inflow.items.length
            ? ` (${ws.inflow.items.map((i) => `${i.label} ${i.amount}`).join(' + ')})`
            : ''}
        </p>

        {!ws.template ? (
          <div className="mt-4">
            <EmptyState
              title="Activate a template"
              body="Allocations go to accounts in the current template."
              action={
                <Link to="/templates">
                  <Button>
                    <Layers size={16} />
                    Wallet Templates
                  </Button>
                </Link>
              }
            />
          </div>
        ) : ws.accounts.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="Create accounts first"
              body="Then choose a percentage or a static amount for each one."
              action={
                <Link to="/accounts">
                  <Button>
                    <Wallet size={16} />
                    Accounts
                  </Button>
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 grid gap-3">
            {ws.accounts.map((account) => {
              const alloc = ws.allocations.find((a) => a.accountId === account.id)
              const mode: AllocationMode = alloc?.mode ?? 'percentage'
              const value = alloc?.value ?? 0
              const projected = alloc ? allocationAmount(alloc, ws.inflow.total) : 0
              return (
                <li key={account.id} className="rounded-2xl border border-line p-3">
                  <p className="mb-2 flex items-center gap-2 font-medium">
                    <ColorDot color={account.color} />
                    {account.name}
                  </p>
                  <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                    <select
                      className="field py-2"
                      value={mode}
                      onChange={(e) => {
                        const next = e.target.value as AllocationMode
                        upsertAllocation(account.id, next, value)
                      }}
                    >
                      <option value="percentage">%</option>
                      <option value="static">Amount</option>
                    </select>
                    <input
                      className="field num py-2"
                      inputMode="decimal"
                      value={alloc ? String(alloc.value) : ''}
                      placeholder="0"
                      onChange={(e) => {
                        const n = Number(e.target.value)
                        if (e.target.value === '') clearAllocation(account.id)
                        else upsertAllocation(account.id, mode, Number.isFinite(n) ? n : 0)
                      }}
                    />
                    <span className="text-xs text-muted">
                      {mode === 'percentage' ? `${projected.toFixed(2)}` : account.currency}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">Unallocated</span>
          <span className={over ? 'num font-semibold text-danger' : 'num font-semibold'}>
            {ws.unallocated.toFixed(2)}
          </span>
        </div>
        {over ? (
          <p className="mt-2 text-sm text-danger">
            Inflow is over-allocated. Lower a percentage or a static amount.
          </p>
        ) : null}
        <AllocationBar accounts={ws.accounts} allocations={ws.allocations} inflow={ws.inflow.total} />
      </section>

      <Modal
        open={salaryOpen}
        title={editingId ? 'Edit salary' : 'Add monthly salary'}
        onClose={closeSalaryModal}
      >
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            saveSalaryModal()
          }}
        >
          <SalaryFields draft={draft} onChange={setDraft} />
          <FormActions
            onCancel={closeSalaryModal}
            submitLabel={editingId ? 'Save salary' : 'Add salary'}
          />
        </form>
      </Modal>

      <Modal open={bonusOpen} title="Add bonus" onClose={() => setBonusOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            addBonus({
              amount: Number(bonusAmount) || 0,
              year: Number(bonusYear) || now.year,
              month: Number(bonusMonth) || now.month,
              day: Math.min(
                Number(bonusDay) || 1,
                lastDayOfMonth(Number(bonusYear) || now.year, Number(bonusMonth) || now.month),
              ),
              sourceName: bonusName,
            })
            setBonusAmount('')
            setBonusName('')
            setBonusOpen(false)
          }}
        >
          <Field label="Amount">
            <input
              className="field num"
              inputMode="decimal"
              value={bonusAmount}
              onChange={(e) => setBonusAmount(e.target.value)}
              required
            />
          </Field>
          <Field label="Source" hint="Optional name.">
            <input
              className="field"
              value={bonusName}
              onChange={(e) => setBonusName(e.target.value)}
              placeholder="Holiday bonus"
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Year">
              <input
                className="field"
                type="number"
                value={bonusYear}
                onChange={(e) => setBonusYear(e.target.value)}
              />
            </Field>
            <Field label="Month">
              <input
                className="field"
                type="number"
                min={1}
                max={12}
                value={bonusMonth}
                onChange={(e) => setBonusMonth(e.target.value)}
              />
            </Field>
            <Field label="Day">
              <input
                className="field"
                type="number"
                min={1}
                max={31}
                value={bonusDay}
                onChange={(e) => setBonusDay(e.target.value)}
              />
            </Field>
          </div>
          <FormActions onCancel={() => setBonusOpen(false)} submitLabel="Add bonus" />
        </form>
      </Modal>
    </div>
  )
}

function SalaryFields({
  draft,
  onChange,
}: {
  draft: SalaryDraft
  onChange: (next: SalaryDraft) => void
}) {
  const set = (patch: Partial<SalaryDraft>) => onChange({ ...draft, ...patch })
  return (
    <>
      <Field label="Amount" hint="Leave blank if you only track bonuses or irregular inflow.">
        <input
          className="field num"
          inputMode="decimal"
          value={draft.monthlyAmount}
          onChange={(e) => set({ monthlyAmount: e.target.value })}
        />
      </Field>
      <Field
        label="Where it comes from"
        hint="Optional. A job name, or keep it as a number only."
        icon={<Wallet size={16} />}
      >
        <input
          className="field"
          value={draft.sourceName}
          onChange={(e) => set({ sourceName: e.target.value })}
          placeholder="Salary, freelance, family…"
        />
      </Field>
      <Field label="When it arrives">
        <select
          className="field"
          value={draft.scheduleType}
          onChange={(e) => set({ scheduleType: e.target.value as InflowScheduleType })}
        >
          <option value="first-day">First day of the month</option>
          <option value="first-monday">First Monday of the month</option>
          <option value="specific-date">A specific day each month</option>
        </select>
      </Field>
      {draft.scheduleType === 'specific-date' ? (
        <Field label="Day of month">
          <input
            className="field"
            type="number"
            min={1}
            max={31}
            value={draft.specificDay}
            onChange={(e) => set({ specificDay: e.target.value })}
          />
        </Field>
      ) : null}
    </>
  )
}

function AllocationBar({
  accounts,
  allocations,
  inflow,
}: {
  accounts: ReturnType<typeof useWorkspace>['accounts']
  allocations: ReturnType<typeof useWorkspace>['allocations']
  inflow: number
}) {
  if (!inflow) return null
  const slices = accounts
    .map((a) => {
      const alloc = allocations.find((x) => x.accountId === a.id)
      const amt = alloc ? allocationAmount(alloc, inflow) : 0
      return { ...a, amt, pct: Math.max(0, (amt / inflow) * 100) }
    })
    .filter((s) => s.amt > 0)
  const used = slices.reduce((s, x) => s + x.pct, 0)
  return (
    <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-brand-soft">
      {slices.map((s) => (
        <div key={s.id} style={{ width: `${s.pct}%`, background: s.color }} title={s.name} />
      ))}
      {used < 100 ? <div style={{ width: `${100 - used}%` }} /> : null}
    </div>
  )
}
