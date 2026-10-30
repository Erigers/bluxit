import { firstMonday, lastDayOfMonth } from './lib'
import type {
  Account,
  Allocation,
  Bonus,
  Expense,
  ExpenseType,
  IncomeSettings,
  LocalDebt,
  MonthRef,
} from './types'

function incomeList(income: IncomeSettings | IncomeSettings[] | undefined): IncomeSettings[] {
  if (!income) return []
  return Array.isArray(income) ? income : [income]
}

export function cashInflowForMonth(
  income: IncomeSettings | IncomeSettings[] | undefined,
  bonuses: Bonus[],
  year: number,
  month: number,
): { total: number; salary: number; bonusTotal: number; items: Array<{ label: string; amount: number }> } {
  const salaries = incomeList(income).filter((i) => i.monthlyAmount > 0)
  const salary = salaries.reduce((sum, i) => sum + i.monthlyAmount, 0)
  const monthBonuses = bonuses.filter((b) => b.year === year && b.month === month)
  const bonusTotal = monthBonuses.reduce((sum, b) => sum + b.amount, 0)
  const items: Array<{ label: string; amount: number }> = []
  for (const i of salaries) {
    items.push({ label: i.sourceName.trim() || 'Salary', amount: i.monthlyAmount })
  }
  for (const b of monthBonuses) {
    items.push({ label: b.sourceName.trim() || 'Bonus', amount: b.amount })
  }
  return { total: salary + bonusTotal, salary, bonusTotal, items }
}

export function inflowDate(
  year: number,
  month: number,
  income: IncomeSettings,
): Date {
  if (income.scheduleType === 'first-day') return new Date(year, month - 1, 1)
  if (income.scheduleType === 'first-monday') return firstMonday(year, month)
  const day = Math.min(Math.max(income.specificDay, 1), lastDayOfMonth(year, month))
  return new Date(year, month - 1, day)
}

export function hasInflowOccurred(
  year: number,
  month: number,
  income: IncomeSettings,
  now = new Date(),
): boolean {
  return now.getTime() >= inflowDate(year, month, income).getTime()
}

export function allocationAmount(allocation: Allocation, inflow: number): number {
  if (allocation.mode === 'percentage') return (inflow * allocation.value) / 100
  return allocation.value
}

export function monthsFrom(start: Date, end: Date): MonthRef[] {
  const months: MonthRef[] = []
  let year = start.getFullYear()
  let month = start.getMonth() + 1
  const endY = end.getFullYear()
  const endM = end.getMonth() + 1
  while (year < endY || (year === endY && month <= endM)) {
    months.push({ year, month })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return months
}

export function accountBalance(
  account: Account,
  ctx: {
    expenses: Expense[]
    allocations: Allocation[]
    income: IncomeSettings | IncomeSettings[] | undefined
    bonuses: Bonus[]
    debts: LocalDebt[]
    now?: Date
  },
): number {
  const now = ctx.now ?? new Date()
  const created = new Date(account.createdAt)
  const alloc = ctx.allocations.find((a) => a.accountId === account.id)
  const salaries = incomeList(ctx.income)
  let allocated = 0
  if (alloc && (salaries.length || ctx.bonuses.length)) {
    for (const { year, month } of monthsFrom(created, now)) {
      const isPast =
        year < now.getFullYear() ||
        (year === now.getFullYear() && month < now.getMonth() + 1)
      const dueSalaries = isPast
        ? salaries
        : salaries.filter((i) => i.monthlyAmount > 0 && hasInflowOccurred(year, month, i, now))
      const dueBonuses = isPast
        ? ctx.bonuses
        : ctx.bonuses.filter((b) => b.year !== year || b.month !== month || b.day <= now.getDate())
      const inflow = cashInflowForMonth(dueSalaries, dueBonuses, year, month).total
      if (inflow) allocated += allocationAmount(alloc, inflow)
    }
  }
  const spent = ctx.expenses
    .filter((e) => e.accountId === account.id)
    .reduce((sum, e) => sum + e.amount, 0)
  const paidDebts = ctx.debts
    .filter((d) => d.settled && d.fromAccountId === account.id)
    .reduce((sum, d) => sum + d.amount, 0)
  const receivedDebts = ctx.debts
    .filter((d) => d.settled && d.toAccountId === account.id)
    .reduce((sum, d) => sum + d.amount, 0)
  return account.openingBalance + allocated - spent - paidDebts + receivedDebts
}

export function monthExpenses(
  expenses: Expense[],
  year: number,
  month: number,
): Expense[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return expenses.filter((e) => e.date.startsWith(prefix))
}

export function spendingByType(
  expenses: Expense[],
  types: ExpenseType[],
): Array<{ id: string; name: string; color: string; amount: number }> {
  const map = new Map<string, { id: string; name: string; color: string; amount: number }>()
  for (const e of expenses) {
    const t = types.find((x) => x.id === e.typeId)
    const id = t?.id ?? 'none'
    const name = t?.name ?? 'Unlabeled'
    const color = t?.color ?? '#94a3b8'
    const prev = map.get(id)
    if (prev) prev.amount += e.amount
    else map.set(id, { id, name, color, amount: e.amount })
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount)
}

export function unallocated(inflow: number, allocations: Allocation[]): number {
  const used = allocations.reduce((sum, a) => sum + allocationAmount(a, inflow), 0)
  return inflow - used
}
