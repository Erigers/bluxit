import { Layers, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  ColorDot,
  ColorPicker,
  EmptyState,
  Field,
  FormActions,
  Modal,
  Money,
  PageHeader,
  Toggle,
} from '../components/ui'
import { allocationAmount } from '../finance'
import { CURRENCIES, PALETTE } from '../lib'
import { useStore, useWorkspace } from '../store'
import type { Account } from '../types'

const emptyForm = {
  name: '',
  color: PALETTE[0],
  currency: 'USD',
  openingBalance: '',
  isolated: false,
}

export function Accounts() {
  const { createAccount, updateAccount, deleteAccount } = useStore()
  const ws = useWorkspace()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState(emptyForm)

  const startCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, color: PALETTE[ws.accounts.length % PALETTE.length] })
    setOpen(true)
  }

  const startEdit = (account: Account) => {
    setEditing(account)
    setForm({
      name: account.name,
      color: account.color,
      currency: account.currency,
      openingBalance: String(account.openingBalance),
      isolated: Boolean(account.isolated),
    })
    setOpen(true)
  }

  const save = () => {
    const payload = {
      name: form.name,
      color: form.color,
      currency: form.currency,
      openingBalance: Number(form.openingBalance) || 0,
      isolated: form.isolated,
    }
    if (editing) updateAccount(editing.id, payload)
    else createAccount(payload)
    setOpen(false)
  }

  if (!ws.template) {
    return (
      <div>
        <PageHeader title="Accounts" />
        <EmptyState
          title="Accounts live in a template"
          body="Create a template, then add named, color-coded accounts with their own currency."
          action={
            <Link to="/templates">
              <Button>
                <Layers size={16} />
                Go to wallet templates
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
        title="Accounts"
        subtitle={`Inside ${ws.template.name}`}
        action={
          <Button onClick={startCreate}>
            <Plus size={16} /> Add
          </Button>
        }
      />
      {ws.accounts.length === 0 ? (
        <EmptyState
          title="No accounts yet"
          body="Name an account, pick a color, choose a currency, and optionally add money you already have."
          action={
            <Button onClick={startCreate}>
              <Plus size={16} /> Create account
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {ws.accounts.map((a) => {
            const alloc = ws.allocations.find((x) => x.accountId === a.id)
            const share = alloc ? allocationAmount(alloc, ws.inflow.total) : 0
            return (
              <li key={a.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-lg font-semibold">
                      <ColorDot color={a.color} size={12} />
                      {a.name}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {a.currency}
                      {a.isolated ? ' · Isolated' : ''}
                      {a.openingBalance ? ` · opening ${a.openingBalance.toFixed(2)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-lg p-2 text-muted hover:bg-brand-soft"
                      onClick={() => startEdit(a)}
                      aria-label={`Edit ${a.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-muted hover:bg-brand-soft hover:text-danger"
                      onClick={() => {
                        if (confirm(`Delete ${a.name}? Expenses stay, without this account.`)) {
                          deleteAccount(a.id)
                        }
                      }}
                      aria-label={`Delete ${a.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="mt-3">
                  <Money
                    amount={ws.balances.get(a.id) ?? 0}
                    currency={a.currency}
                    className="text-2xl font-semibold"
                  />
                </p>
                <p className="mt-1 text-xs text-muted">
                  {alloc
                    ? alloc.mode === 'percentage'
                      ? `${alloc.value}% of inflow → ${share.toFixed(2)} this month`
                      : `Static ${alloc.value} of each inflow`
                    : 'No inflow share yet — set it on Income'}
                </p>
              </li>
            )
          })}
        </ul>
      )}

      <Modal open={open} title={editing ? 'Edit account' : 'New account'} onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <Field label="Name" icon={<Wallet size={16} />}>
            <input
              className="field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Color">
            <ColorPicker
              value={form.color}
              onChange={(color) => setForm({ ...form, color })}
            />
          </Field>
          <Field label="Currency">
            <select
              className="field"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Already have"
            hint="Optional starting amount that is already in this account."
          >
            <input
              className="field num"
              inputMode="decimal"
              value={form.openingBalance}
              onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
            />
          </Field>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)] p-3.5 text-sm backdrop-blur-md">
            <span>
              <span className="font-medium">Isolate this account</span>
              <span className="mt-0.5 block text-xs text-muted">
                Its balance shows on Home under Left this month. Daily expenses cannot take from it —
                only a loan from another account.
              </span>
            </span>
            <Toggle
              checked={form.isolated}
              onChange={(isolated) => setForm({ ...form, isolated })}
              aria-label="Isolate this account"
            />
          </label>
          <FormActions onCancel={() => setOpen(false)} submitLabel={editing ? 'Save' : 'Create'} />
        </form>
      </Modal>
    </div>
  )
}
