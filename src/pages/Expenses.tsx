import { ArrowLeftRight, Layers, Plus, Receipt, Tag, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  ColorDot,
  EmptyState,
  Field,
  FormActions,
  Modal,
  MonthNav,
  PageHeader,
} from '../components/ui'
import { currentMonth, isoDate, money } from '../lib'
import { useStore, useWorkspace } from '../store'

export function Expenses() {
  const { addExpense, deleteExpense } = useStore()
  const [month, setMonth] = useState(currentMonth)
  const ws = useWorkspace(month)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [typeName, setTypeName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(isoDate())
  const [accountId, setAccountId] = useState('')
  const [note, setNote] = useState('')
  const [debtNotice, setDebtNotice] = useState(false)

  const assignedAccount = useMemo(() => {
    const type = ws.types.find((t) => t.name.toLowerCase() === typeName.trim().toLowerCase())
    if (!type) return null
    const assignment = ws.assignments.find((a) => a.expenseTypeId === type.id)
    return ws.accounts.find((a) => a.id === assignment?.accountId) ?? null
  }, [typeName, ws.accounts, ws.assignments, ws.types])

  const suggestions = useMemo(() => {
    const q = typeName.trim().toLowerCase()
    const fromTypes = ws.types.filter((t) => !q || t.name.toLowerCase().includes(q))
    const extras = ws.suggestedTypes.filter(
      (s) =>
        (!q || s.toLowerCase().includes(q)) &&
        !ws.types.some((t) => t.name.toLowerCase() === s.toLowerCase()),
    )
    return { fromTypes, extras }
  }, [typeName, ws.suggestedTypes, ws.types])

  const spendableAccounts = ws.accounts.filter((a) => !a.isolated)
  const selectedAccount = spendableAccounts.find((a) => a.id === accountId) ?? null
  const assignedIsIsolated = Boolean(assignedAccount?.isolated)
  const willDebt =
    Boolean(assignedAccount && selectedAccount && assignedAccount.id !== selectedAccount.id)

  const reset = () => {
    setName('')
    setTypeName('')
    setAmount('')
    setDate(isoDate())
    setAccountId('')
    setNote('')
    setOpen(false)
  }

  const pickType = (label: string) => {
    setTypeName(label)
    const type = ws.types.find((t) => t.name.toLowerCase() === label.toLowerCase())
    if (type) {
      const assignment = ws.assignments.find((a) => a.expenseTypeId === type.id)
      if (assignment) {
        const home = ws.accounts.find((a) => a.id === assignment.accountId)
        setAccountId(home && !home.isolated ? home.id : '')
      }
    }
  }

  if (!ws.template) {
    return (
      <div>
        <PageHeader title="Expenses" />
        <EmptyState
          title="Choose a template first"
          body="Expenses are deducted from accounts inside your active template."
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
    )
  }

  return (
    <div>
      <PageHeader
        title="Expenses"
        subtitle="Adding an expense deducts it from the selected account."
        action={
          <div className="flex items-center gap-2">
            <MonthNav
              year={month.year}
              month={month.month}
              onChange={(year, m) => setMonth({ year, month: m })}
            />
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> Add
            </Button>
          </div>
        }
      />

      {ws.monthExpenses.length === 0 ? (
        <EmptyState
          title="No expenses this month"
          body="Coffee, rent, metro — label them, price them, and pick an account."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus size={16} /> Add expense
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-2">
          {ws.monthExpenses.map((e) => {
            const type = ws.types.find((t) => t.id === e.typeId)
            const account = ws.accounts.find((a) => a.id === e.accountId)
            const debt = ws.debts.find((d) => d.expenseId === e.id)
            return (
              <li key={e.id} className="card flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <ColorDot color={type?.color ?? '#94a3b8'} />
                    {e.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {e.date} · {type?.name ?? 'Unlabeled'}
                    {account ? ` · ${account.name}` : ' · no account'}
                  </p>
                  {debt ? (
                    <p className="mt-1 text-xs font-medium text-warn">
                      Local debt · {ws.accounts.find((a) => a.id === debt.fromAccountId)?.name} owes{' '}
                      {ws.accounts.find((a) => a.id === debt.toAccountId)?.name}
                      {debt.settled ? ' (settled)' : ''}
                    </p>
                  ) : null}
                  {e.note ? <p className="mt-1 text-xs text-muted">{e.note}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <span className="num font-medium">
                    {money(e.amount, account?.currency ?? ws.accounts[0]?.currency ?? 'USD')}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-muted hover:bg-brand-soft hover:text-danger"
                    onClick={() => deleteExpense(e.id)}
                    aria-label="Delete expense"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={open} title="Add expense" onClose={reset}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const result = addExpense({
              name,
              typeName,
              amount: Number(amount),
              date,
              accountId: accountId || null,
              note,
            })
            setDebtNotice(result.debtCreated)
            reset()
          }}
        >
          <Field label="Name" icon={<Receipt size={16} />}>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Coffee"
              required
            />
          </Field>
          <Field label="Type" hint="Pick a suggestion or type a new one. Types can be color-coded later." icon={<Tag size={16} />}>
            <input
              className="field"
              value={typeName}
              onChange={(e) => {
                setTypeName(e.target.value)
                const type = ws.types.find(
                  (t) => t.name.toLowerCase() === e.target.value.trim().toLowerCase(),
                )
                if (type) {
                  const assignment = ws.assignments.find((a) => a.expenseTypeId === type.id)
                  if (assignment) {
                    const home = ws.accounts.find((a) => a.id === assignment.accountId)
                    setAccountId(home && !home.isolated ? home.id : '')
                  }
                }
              }}
              placeholder="Leisure"
              list="expense-types"
            />
            <datalist id="expense-types">
              {suggestions.fromTypes.map((t) => (
                <option key={t.id} value={t.name} />
              ))}
              {suggestions.extras.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...suggestions.fromTypes.slice(0, 6).map((t) => t.name), ...suggestions.extras.slice(0, 4)].map(
                (label) => (
                  <button
                    key={label}
                    type="button"
                    className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand"
                    onClick={() => pickType(label)}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price">
              <input
                className="field num"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </Field>
            <Field label="Date">
              <input
                className="field"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </Field>
          </div>
          <Field
            label="Take from account"
            hint={
              assignedIsIsolated
                ? `${assignedAccount?.name} is isolated. Take this expense from another account — that creates a local loan.`
                : 'Autocomplete uses the account this type is dropped into. Isolated accounts are not listed.'
            }
          >
            <select
              className="field"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              <option value="">No account</option>
              {spendableAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          {willDebt ? (
            <p className="rounded-xl bg-warn/10 px-3 py-2 text-sm text-warn">
              {assignedAccount?.name} is where this type lives, but you are taking it from{' '}
              {selectedAccount?.name}. This will be labeled as local debt between those accounts.
            </p>
          ) : null}
          <Field label="Note">
            <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <FormActions onCancel={reset} submitLabel="Add expense" />
        </form>
      </Modal>

      <Modal open={debtNotice} title="Local debt created" onClose={() => setDebtNotice(false)}>
        <p className="text-sm text-muted">
          The type belongs to one account and the money came from another. Review it on the Local
          debts page when you want to settle.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDebtNotice(false)}>
            Close
          </Button>
          <Link to="/debts">
            <Button>
              <ArrowLeftRight size={16} />
              View debts
            </Button>
          </Link>
        </div>
      </Modal>
    </div>
  )
}
