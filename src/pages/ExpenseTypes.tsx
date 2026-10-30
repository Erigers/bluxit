import { GripVertical, Layers, Pencil, Plus, Tag, Trash2, Wallet, X } from 'lucide-react'
import { useState, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  Button,
  ColorDot,
  ColorPicker,
  EmptyState,
  Field,
  FormActions,
  Modal,
  PageHeader,
} from '../components/ui'
import { PALETTE, cn } from '../lib'
import { isRecurringType } from '../recurring'
import { useStore, useWorkspace } from '../store'
import type { Account, ExpenseType } from '../types'

export function ExpenseTypes() {
  const { createExpenseType, updateExpenseType, deleteExpenseType, assignType } = useStore()
  const ws = useWorkspace()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseType | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[8])
  const [picked, setPicked] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [overAccount, setOverAccount] = useState<string | null>(null)
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null)

  const assignedIds = new Set(ws.assignments.map((a) => a.expenseTypeId))
  const unassigned = ws.types.filter((t) => !assignedIds.has(t.id))

  const startCreate = () => {
    setEditing(null)
    setName('')
    setColor(PALETTE[ws.types.length % PALETTE.length])
    setOpen(true)
  }

  const startEdit = (type: ExpenseType) => {
    setEditing(type)
    setName(type.name)
    setColor(type.color)
    setOpen(true)
  }

  const movingId = draggingId ?? picked
  const sheetOpen = Boolean(movingId) && ws.accounts.length > 0
  const movingType = ws.types.find((t) => t.id === movingId)

  const onDrop = (accountId: string, typeId: string) => {
    assignType(typeId, accountId)
    setPicked(null)
    setDraggingId(null)
    setOverAccount(null)
    setDragPoint(null)
  }

  const accountIdAt = (x: number, y: number) => {
    const node = document.elementFromPoint(x, y)
    return node?.closest('[data-account-id]')?.getAttribute('data-account-id') ?? null
  }

  const beginHandleDrag = (typeId: string, x: number, y: number) => {
    setPicked(null)
    setDraggingId(typeId)
    setDragPoint({ x, y })
    setOverAccount(accountIdAt(x, y))
  }

  const moveHandleDrag = (x: number, y: number) => {
    setDragPoint({ x, y })
    setOverAccount(accountIdAt(x, y))
  }

  const finishHandleDrag = (typeId: string, x: number, y: number) => {
    const accountId = accountIdAt(x, y)
    if (accountId) onDrop(accountId, typeId)
    else endDrag()
  }

  const endDrag = () => {
    setDraggingId(null)
    setOverAccount(null)
    setDragPoint(null)
  }

  if (!ws.template) {
    return (
      <div>
        <PageHeader title="Expense types" />
        <EmptyState
          title="Need an active template"
          body="Types can sit unassigned, or drop into one account of the current template."
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
        title="Expense types"
        subtitle="Recurring is already on every wallet for monthly bills. Color-code the rest, then drop each type into an account — or leave it free."
        action={
          <Button onClick={startCreate}>
            <Plus size={16} /> Type
          </Button>
        }
      />

      {picked ? (
        <p className="mb-3 rounded-full bg-brand-soft/80 px-3 py-2 text-sm text-brand backdrop-blur-md">
          Tap a bucket below to place this type, or tap it again to cancel.
        </p>
      ) : (
        <p className="mb-3 text-sm text-muted">
          Drag from the handle beside the color — account buckets slide up from the bottom. You can
          also tap a type, then tap a bucket.
        </p>
      )}

      <section className="card mb-4 p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Unassigned</h2>
        {unassigned.length === 0 &&
        ws.types.length > 0 &&
        ws.types.every((t) => isRecurringType(t)) ? (
          <p className="text-sm text-muted">Recurring is ready. Create types like Coffee or Leisure, then drop them.</p>
        ) : unassigned.length === 0 && ws.types.length === 0 ? (
          <p className="text-sm text-muted">Create types like Coffee or Leisure, then drop them.</p>
        ) : unassigned.length === 0 ? (
          <p className="text-sm text-muted">Every type is in an account.</p>
        ) : (
          <div className="grid gap-2 sm:flex sm:flex-wrap">
            {unassigned.map((t) => (
              <TypeChip
                key={t.id}
                type={t}
                locked={isRecurringType(t)}
                selected={picked === t.id}
                dragging={draggingId === t.id}
                onSelect={() => setPicked(picked === t.id ? null : t.id)}
                onEdit={() => startEdit(t)}
                onDelete={() => deleteExpenseType(t.id)}
                onHandleDragStart={(x, y) => beginHandleDrag(t.id, x, y)}
                onHandleDragMove={moveHandleDrag}
                onHandleDragEnd={(x, y) => finishHandleDrag(t.id, x, y)}
                onHandleDragCancel={endDrag}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        {ws.accounts.map((account) => {
          const here = ws.types.filter((t) =>
            ws.assignments.some((a) => a.accountId === account.id && a.expenseTypeId === t.id),
          )
          return (
            <section
              key={account.id}
              data-account-id={account.id}
              className={cn(
                'card min-h-36 p-4 transition',
                picked ? 'ring-2 ring-brand/40' : '',
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const id = e.dataTransfer.getData('text/type-id') || e.dataTransfer.getData('text/plain')
                if (id) onDrop(account.id, id)
              }}
              onClick={() => {
                if (picked) onDrop(account.id, picked)
              }}
            >
              <h2 className="mb-3 flex items-center gap-2 font-semibold">
                <ColorDot color={account.color} />
                {account.name}
              </h2>
              <div className="grid gap-2 sm:flex sm:flex-wrap">
                {here.length === 0 ? (
                  <p className="text-sm text-muted">Drop a type here</p>
                ) : (
                  here.map((t) => (
                    <TypeChip
                      key={t.id}
                      type={t}
                      locked={isRecurringType(t)}
                      selected={picked === t.id}
                      dragging={draggingId === t.id}
                      onSelect={() => setPicked(picked === t.id ? null : t.id)}
                      onEdit={() => startEdit(t)}
                      onDelete={() => deleteExpenseType(t.id)}
                      onUnassign={() => assignType(t.id, null)}
                      onHandleDragStart={(x, y) => beginHandleDrag(t.id, x, y)}
                      onHandleDragMove={moveHandleDrag}
                      onHandleDragEnd={(x, y) => finishHandleDrag(t.id, x, y)}
                      onHandleDragCancel={endDrag}
                    />
                  ))
                )}
              </div>
            </section>
          )
        })}
      </div>

      {ws.accounts.length === 0 ? (
        <EmptyState
          title="No accounts to drop into"
          body="Create accounts first, then park types inside them."
          action={
            <Link to="/accounts">
              <Button>
                <Wallet size={16} />
                Accounts
              </Button>
            </Link>
          }
        />
      ) : null}

      {ws.accounts.length > 0
        ? createPortal(
            <>
              <div
                className="fixed inset-0 z-[69] bg-black/60 backdrop-blur-[2px] transition-opacity duration-300"
                style={{
                  opacity: sheetOpen ? 1 : 0,
                  pointerEvents: draggingId ? 'none' : sheetOpen ? 'auto' : 'none',
                }}
                onClick={() => {
                  if (!draggingId) setPicked(null)
                }}
                aria-hidden
              />
              {draggingId && dragPoint && movingType ? (
                <div
                  className="pointer-events-none fixed z-[80] flex items-center gap-2 rounded-full border border-brand bg-[var(--surface)] px-3 py-2 text-sm font-medium shadow-lg"
                  style={{
                    left: dragPoint.x,
                    top: dragPoint.y,
                    transform: 'translate(-12px, -22px)',
                  }}
                >
                  <GripVertical size={14} className="text-muted" />
                  <ColorDot color={movingType.color} size={14} />
                  {movingType.name}
                </div>
              ) : null}
              <div
                className="safe-bottom fixed inset-x-0 bottom-0 z-[70] flex flex-col rounded-t-3xl border border-b-0 border-[var(--glass-border)] bg-[var(--surface)] px-4 pt-3 shadow-[0_-12px_40px_rgba(26,26,26,0.12)]"
                style={{
                  height: '40dvh',
                  transform: sheetOpen ? 'translateY(0)' : 'translateY(100%)',
                  transition: 'transform 0.3s ease',
                  pointerEvents: sheetOpen ? 'auto' : 'none',
                }}
                role="dialog"
                aria-hidden={!sheetOpen}
                aria-label="Account buckets"
                {...(!sheetOpen ? { inert: true } : {})}
              >
                <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
                <p className="mb-3 text-sm font-semibold">
                  {movingType ? (
                    <span className="inline-flex items-center gap-2">
                      Drop <ColorDot color={movingType.color} size={10} /> {movingType.name}
                    </span>
                  ) : (
                    'Drop into an account'
                  )}
                </p>
                <div className="min-h-0 flex-1 overflow-auto pb-2">
                  <ul className="grid h-full grid-cols-2 gap-2 sm:grid-cols-3">
                    {ws.accounts.map((account) => (
                      <li key={account.id} className="min-h-0">
                        <AccountBucket
                          account={account}
                          ready={Boolean(picked || draggingId)}
                          hovering={overAccount === account.id}
                          onDragOver={() => setOverAccount(account.id)}
                          onDragLeave={() =>
                            setOverAccount((id) => (id === account.id ? null : id))
                          }
                          onDropType={(typeId) => onDrop(account.id, typeId)}
                          onTap={() => {
                            if (movingId) onDrop(account.id, movingId)
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </>,
            document.body,
          )
        : null}

      <Modal open={open} title={editing ? 'Edit type' : 'New type'} onClose={() => setOpen(false)}>
        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            if (editing) {
              updateExpenseType(
                editing.id,
                isRecurringType(editing) ? { color } : { name, color },
              )
            } else createExpenseType(name, color)
            setOpen(false)
          }}
        >
          <Field
            label="Name"
            icon={<Tag size={16} />}
            hint={editing && isRecurringType(editing) ? 'Recurring stays on every wallet. Expenses with this type repeat each month on the same day, from the same account.' : undefined}
          >
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Leisure"
              required
              disabled={Boolean(editing && isRecurringType(editing))}
            />
          </Field>
          <Field label="Color">
            <ColorPicker value={color} onChange={setColor} />
          </Field>
          <FormActions onCancel={() => setOpen(false)} submitLabel={editing ? 'Save' : 'Create'} />
        </form>
      </Modal>
    </div>
  )
}

function AccountBucket({
  account,
  ready,
  hovering,
  onDragOver,
  onDragLeave,
  onDropType,
  onTap,
}: {
  account: Account
  ready: boolean
  hovering: boolean
  onDragOver: () => void
  onDragLeave: () => void
  onDropType: (typeId: string) => void
  onTap: () => void
}) {
  return (
    <button
      type="button"
      data-account-id={account.id}
      className={cn(
        'flex h-full min-h-20 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-3 py-3 text-center transition',
        hovering
          ? 'border-brand bg-brand-soft'
          : ready
            ? 'border-brand/50 bg-brand-soft/70'
            : 'border-line bg-[var(--control)] hover:border-brand/50 hover:bg-brand-soft/60',
      )}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        onDragOver()
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault()
        const id = e.dataTransfer.getData('text/type-id') || e.dataTransfer.getData('text/plain')
        if (id) onDropType(id)
      }}
      onClick={onTap}
    >
      <ColorDot color={account.color} size={16} />
      <span className="text-sm font-semibold leading-tight">{account.name}</span>
    </button>
  )
}

function TypeChip({
  type,
  locked,
  selected,
  dragging,
  onSelect,
  onEdit,
  onDelete,
  onUnassign,
  onHandleDragStart,
  onHandleDragMove,
  onHandleDragEnd,
  onHandleDragCancel,
}: {
  type: ExpenseType
  locked?: boolean
  selected: boolean
  dragging?: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onUnassign?: () => void
  onHandleDragStart: (x: number, y: number) => void
  onHandleDragMove: (x: number, y: number) => void
  onHandleDragEnd: (x: number, y: number) => void
  onHandleDragCancel: () => void
}) {
  const onHandlePointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.button !== -1) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    onHandleDragStart(e.clientX, e.clientY)
  }

  const onHandlePointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    onHandleDragMove(e.clientX, e.clientY)
  }

  const onHandlePointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    onHandleDragEnd(e.clientX, e.clientY)
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'flex items-center rounded-full border backdrop-blur-md sm:inline-flex sm:max-w-full',
        selected || dragging
          ? 'border-brand bg-brand-soft'
          : 'border-[var(--glass-border)] bg-[var(--glass)]',
        dragging && 'opacity-70',
      )}
    >
      <button
        type="button"
        className="grid h-11 w-10 shrink-0 touch-none cursor-grab place-items-center text-muted active:cursor-grabbing"
        aria-label={`Drag ${type.name}`}
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onPointerCancel={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
          }
          onHandleDragCancel()
        }}
      >
        <GripVertical size={16} />
      </button>
      <button
        type="button"
        className="flex min-h-11 min-w-0 flex-1 items-center gap-2 py-2 pr-3 pl-0 text-left text-sm font-medium"
        onClick={onSelect}
      >
        <ColorDot color={type.color} size={14} />
        <span className="truncate">{type.name}</span>
      </button>
      <div className="flex shrink-0 pr-1">
        <ChipAction label="Edit" onClick={onEdit}>
          <Pencil size={18} />
        </ChipAction>
        {onUnassign ? (
          <ChipAction label="Remove from account" onClick={onUnassign}>
            <X size={18} />
          </ChipAction>
        ) : null}
        {locked ? null : (
          <ChipAction
            label="Delete type"
            danger
            onClick={() => {
              if (confirm(`Delete type “${type.name}”? Expenses keep their amount, without this label.`)) {
                onDelete()
              }
            }}
          >
            <Trash2 size={18} />
          </ChipAction>
        )}
      </div>
    </div>
  )
}

function ChipAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={cn(
        'grid h-11 w-11 place-items-center rounded-full text-muted',
        danger ? 'hover:bg-danger/10 hover:text-danger' : 'hover:bg-brand-soft hover:text-ink',
      )}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      aria-label={label}
    >
      {children}
    </button>
  )
}
