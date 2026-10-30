import { Check, Plus, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, ColorDot, EmptyState, Money, PageHeader } from '../components/ui'
import { useStore, useWorkspace } from '../store'

export function Debts() {
  const { settleDebt, deleteDebt } = useStore()
  const ws = useWorkspace()
  const open = ws.debts.filter((d) => !d.settled)
  const settled = ws.debts.filter((d) => d.settled)
  const currency = ws.accounts[0]?.currency ?? 'USD'

  const nameOf = (id: string) => ws.accounts.find((a) => a.id === id)

  return (
    <div>
      <PageHeader
        title="Local debts"
        subtitle="When a type lives in one account but the expense is taken from another, the first account owes the second."
      />

      {ws.debts.length === 0 ? (
        <EmptyState
          title="No local debts"
          body="If Coffee sits in Fun but you pay from Daily, Fun owes Daily until you settle."
          action={
            <Link to="/expenses">
              <Button variant="outline">
                <Plus size={16} />
                Add an expense
              </Button>
            </Link>
          }
        />
      ) : null}

      {open.length > 0 ? (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Open</h2>
          <ul className="grid gap-3">
            {open.map((d) => {
              const from = nameOf(d.fromAccountId)
              const to = nameOf(d.toAccountId)
              const expense = ws.expenses.find((e) => e.id === d.expenseId)
              return (
                <li key={d.id} className="card p-4">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <ColorDot color={from?.color ?? '#94a3b8'} />
                    {from?.name ?? 'Account'} owes
                    <ColorDot color={to?.color ?? '#94a3b8'} />
                    {to?.name ?? 'Account'}
                  </p>
                  <p className="mt-2">
                    <Money amount={d.amount} currency={to?.currency ?? currency} className="text-xl" />
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {expense ? `${expense.name} · ${expense.date}` : d.createdAt.slice(0, 10)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      onClick={() => {
                        if (
                          confirm(
                            `Settle by moving ${d.amount} from ${from?.name} to ${to?.name}? ${from?.name} will go down, ${to?.name} will be reimbursed.`,
                          )
                        ) {
                          settleDebt(d.id)
                        }
                      }}
                    >
                      <Check size={16} />
                      Settle
                    </Button>
                    <Button variant="ghost" onClick={() => deleteDebt(d.id)}>
                      <X size={16} />
                      Dismiss
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {settled.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Settled</h2>
          <ul className="grid gap-2">
            {settled.map((d) => {
              const from = nameOf(d.fromAccountId)
              const to = nameOf(d.toAccountId)
              return (
                <li key={d.id} className="flex items-center justify-between text-sm text-muted">
                  <span>
                    {from?.name} → {to?.name}
                  </span>
                  <Money amount={d.amount} currency={to?.currency ?? currency} />
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
