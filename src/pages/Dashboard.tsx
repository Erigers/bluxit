import { ArrowDownRight, ArrowUpRight, Layers, Scale, Wallet } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AccountBars, CashflowArea, DonutChart } from '../components/Charts'
import { RateApp } from '../components/RateApp'
import { Button, EmptyState, Money, MonthNav, PageHeader } from '../components/ui'
import { cashInflowForMonth, monthExpenses } from '../finance'
import { currentMonth, money, shiftMonth } from '../lib'
import { setupProgress } from '../setup'
import { useStore, useWorkspace } from '../store'

export function Dashboard() {
  const [month, setMonth] = useState(currentMonth)
  const { state, user } = useStore()
  const ws = useWorkspace(month)
  const currency = ws.accounts[0]?.currency ?? 'USD'
  const setup = setupProgress(state, user)

  const totals = useMemo(() => {
    const byCurrency = new Map<string, number>()
    for (const a of ws.accounts) {
      const bal = ws.balances.get(a.id) ?? 0
      byCurrency.set(a.currency, (byCurrency.get(a.currency) ?? 0) + bal)
    }
    return [...byCurrency.entries()]
  }, [ws.accounts, ws.balances])

  const cashflow = useMemo(() => {
    const points = []
    const created = ws.user ? new Date(ws.user.createdAt) : new Date()
    const start = { year: created.getFullYear(), month: created.getMonth() + 1 }
    for (let i = 5; i >= 0; i--) {
      const m = shiftMonth(month.year, month.month, -i)
      const beforeStart =
        m.year < start.year || (m.year === start.year && m.month < start.month)
      const inflow = beforeStart
        ? 0
        : cashInflowForMonth(ws.activeIncomes, ws.bonuses, m.year, m.month).total
      const spent = monthExpenses(ws.expenses, m.year, m.month).reduce((s, e) => s + e.amount, 0)
      points.push({
        label: new Date(m.year, m.month - 1, 1).toLocaleString(undefined, { month: 'short' }),
        inflow,
        spent,
      })
    }
    return points
  }, [month, ws.activeIncomes, ws.bonuses, ws.expenses, ws.user])

  if (!ws.template) {
    return (
      <div>
        <PageHeader
          title="Home"
          subtitle={
            setup.visible
              ? 'Finish the steps above to start tracking on this device.'
              : 'Start with a template, then add accounts.'
          }
        />
        {setup.visible ? null : (
          <EmptyState
            title="No active template"
            body="Templates hold your accounts. Create one, then add accounts and split your inflow."
            action={
              <Link to="/templates">
                <Button>
                  <Layers size={16} />
                  Create template
                </Button>
              </Link>
            }
          />
        )}
        <div className="mt-4">
          <RateApp />
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Home"
        subtitle={ws.template.name}
        action={
          <MonthNav
            year={month.year}
            month={month.month}
            onChange={(year, m) => setMonth({ year, month: m })}
          />
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Accounts"
          icon={<Wallet className="text-brand" size={16} />}
          value={
            totals.length === 1 ? (
              <Money amount={totals[0][1]} currency={totals[0][0]} className="text-2xl" />
            ) : (
              <span className="grid">
                {totals.map(([c, v]) => (
                  <Money key={c} amount={v} currency={c} className="text-lg" />
                ))}
                {totals.length === 0 ? <span className="num text-2xl">0</span> : null}
              </span>
            )
          }
        />
        <Stat
          label="Inflow"
          icon={<ArrowUpRight className="text-ok" size={16} />}
          value={<Money amount={ws.inflow.total} currency={currency} className="text-2xl" />}
          hint={ws.inflow.items.map((i) => i.label).join(' · ') || 'Set your salary'}
        />
        <Stat
          label="Spent"
          icon={<ArrowDownRight className="text-danger" size={16} />}
          value={<Money amount={ws.spent} currency={currency} className="text-2xl" />}
        />
        <Stat
          label="Left this month"
          icon={<Scale className="text-brand" size={16} />}
          value={
            <span className="grid gap-1">
              <Money
                amount={ws.inflow.total - ws.spent}
                currency={currency}
                className="text-2xl"
                signed
              />
              {ws.accounts
                .filter((a) => a.isolated)
                .map((a) => (
                  <span key={a.id} className="flex items-center justify-between gap-2 text-xs text-muted">
                    <span className="truncate">{a.name}</span>
                    <Money
                      amount={ws.balances.get(a.id) ?? 0}
                      currency={a.currency}
                      className="text-sm text-ink"
                    />
                  </span>
                ))}
            </span>
          }
        />
      </div>

      {ws.openDebts.length > 0 ? (
        <Link
          to="/debts"
          className="card mb-4 flex items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <span>
            {ws.openDebts.length} open local {ws.openDebts.length === 1 ? 'debt' : 'debts'} between
            accounts.
          </span>
          <span className="font-semibold text-brand">Review</span>
        </Link>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Spending by type</h2>
          <DonutChart data={ws.byType} />
        </section>
        <section className="card p-4">
          <h2 className="mb-3 font-semibold">Account balances</h2>
          <AccountBars
            data={ws.accounts.map((a) => ({
              name: a.name,
              color: a.color,
              balance: ws.balances.get(a.id) ?? 0,
            }))}
          />
        </section>
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Six-month cashflow</h2>
          <CashflowArea data={cashflow} />
        </section>
      </div>

      <section className="mt-4 card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Recent expenses</h2>
          <Link to="/expenses" className="text-sm font-medium text-brand">
            See all
          </Link>
        </div>
        {ws.monthExpenses.length === 0 ? (
          <p className="text-sm text-muted">Nothing spent this month.</p>
        ) : (
          <ul className="grid gap-2">
            {ws.monthExpenses.slice(0, 6).map((e) => {
              const type = ws.types.find((t) => t.id === e.typeId)
              const account = ws.accounts.find((a) => a.id === e.accountId)
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: type?.color ?? '#94a3b8' }}
                    />
                    <span className="truncate">
                      {e.name}
                      <span className="text-muted">
                        {' '}
                        · {type?.name ?? 'Unlabeled'}
                        {account ? ` · ${account.name}` : ''}
                      </span>
                    </span>
                  </span>
                  <span className="num">{money(e.amount, account?.currency ?? currency)}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <div className="mt-4">
        <RateApp />
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: ReactNode
  hint?: string
  icon?: ReactNode
}) {
  return (
    <div className="card p-4">
      <p className="mb-2 flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted">
        {icon}
        {label}
      </p>
      {value}
      {hint ? <p className="mt-1 truncate text-xs text-muted">{hint}</p> : null}
    </div>
  )
}
