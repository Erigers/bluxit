import { isoDate, lastDayOfMonth, nowISO, shiftMonth, uid } from './lib'
import type { AppState, Expense, ExpenseType, User } from './types'

export const RECURRING_TYPE_NAME = 'Recurring'
export const RECURRING_TYPE_COLOR = '#6366f1'

export function isRecurringName(name: string) {
  return name.trim().toLowerCase() === RECURRING_TYPE_NAME.toLowerCase()
}

export function isRecurringType(type: Pick<ExpenseType, 'name' | 'builtIn'>) {
  return type.builtIn === 'recurring' || isRecurringName(type.name)
}

export function recurringTypeFor(userId: string): ExpenseType {
  return {
    id: uid(),
    userId,
    name: RECURRING_TYPE_NAME,
    color: RECURRING_TYPE_COLOR,
    builtIn: 'recurring',
  }
}

export function parseIsoDate(iso: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export function occurrenceIso(year: number, month: number, day: number) {
  const clamped = Math.min(Math.max(day, 1), lastDayOfMonth(year, month))
  return `${year}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`
}

function recurringTypeForUser(types: ExpenseType[], user: User) {
  return types.find((t) => t.userId === user.id && isRecurringType(t))
}

export function ensureRecurringTypes(state: AppState): ExpenseType[] {
  let changed = false
  const next = [...state.expenseTypes]
  for (const user of state.users) {
    const existing = recurringTypeForUser(next, user)
    if (!existing) {
      next.push(recurringTypeFor(user.id))
      changed = true
      continue
    }
    if (existing.builtIn !== 'recurring' || existing.name !== RECURRING_TYPE_NAME) {
      const index = next.findIndex((t) => t.id === existing.id)
      next[index] = { ...existing, builtIn: 'recurring', name: RECURRING_TYPE_NAME }
      changed = true
    }
  }
  return changed ? next : state.expenseTypes
}

export function applyRecurring(state: AppState, now = new Date()): AppState {
  const expenseTypes = ensureRecurringTypes(state)
  const today = isoDate(now)
  const extras: Expense[] = []
  const untilById = new Map<string, string>()

  for (const user of state.users) {
    const type = recurringTypeForUser(expenseTypes, user)
    if (!type) continue
    const sources = state.expenses.filter(
      (expense) => expense.userId === user.id && expense.typeId === type.id && !expense.recurringOf,
    )
    for (const source of sources) {
      const start = parseIsoDate(source.date)
      if (!start) continue
      const sourceKey = monthKey(start.year, start.month)
      let cursor = shiftMonth(start.year, start.month, 1)
      if (source.recurringUntil) {
        const applied = parseIsoDate(`${source.recurringUntil}-01`)
        if (applied) {
          const afterApplied = shiftMonth(applied.year, applied.month, 1)
          if (
            afterApplied.year > cursor.year ||
            (afterApplied.year === cursor.year && afterApplied.month > cursor.month)
          ) {
            cursor = afterApplied
          }
        }
      }
      let appliedKey = source.recurringUntil ?? sourceKey
      while (
        cursor.year < now.getFullYear() ||
        (cursor.year === now.getFullYear() && cursor.month <= now.getMonth() + 1)
      ) {
        const date = occurrenceIso(cursor.year, cursor.month, start.day)
        if (date > today) break
        const prefix = monthKey(cursor.year, cursor.month)
        const exists =
          state.expenses.some((expense) => expense.recurringOf === source.id && expense.date.startsWith(prefix)) ||
          extras.some((expense) => expense.recurringOf === source.id && expense.date.startsWith(prefix))
        if (!exists) {
          extras.push({
            id: uid(),
            userId: source.userId,
            name: source.name,
            typeId: source.typeId,
            amount: source.amount,
            date,
            accountId: source.accountId,
            note: source.note,
            createdAt: nowISO(),
            recurringOf: source.id,
          })
        }
        appliedKey = prefix
        cursor = shiftMonth(cursor.year, cursor.month, 1)
      }
      if (appliedKey !== source.recurringUntil) untilById.set(source.id, appliedKey)
    }
  }

  if (expenseTypes === state.expenseTypes && extras.length === 0 && untilById.size === 0) {
    return state
  }

  return {
    ...state,
    expenseTypes,
    expenses: [
      ...extras,
      ...state.expenses.map((expense) =>
        untilById.has(expense.id) ? { ...expense, recurringUntil: untilById.get(expense.id) } : expense,
      ),
    ],
  }
}
