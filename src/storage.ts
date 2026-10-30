import { isDesktop, readWalletFile, writeWalletFile } from './desktop'
import { STORAGE_KEY } from './lib'
import { applyRecurring } from './recurring'
import type { Account, AppState, Expense, ExpenseType, Template, User } from './types'

function migrateUser(user: User): User {
  return {
    ...user,
    pinHash: user.pinHash ?? '',
    passwordHash: user.passwordHash ?? '',
    hasMultipleSalaries: user.hasMultipleSalaries ?? false,
    setupGuideHidden: user.setupGuideHidden ?? false,
  }
}

function migrateTemplate(template: Template): Template {
  return {
    ...template,
    cloudId: template.cloudId ?? null,
    sharedAnonymous: template.sharedAnonymous ?? false,
  }
}

function migrateAccount(account: Account): Account {
  return {
    ...account,
    isolated: account.isolated ?? false,
  }
}

function migrateExpenseType(type: ExpenseType): ExpenseType {
  return {
    ...type,
    builtIn: type.builtIn ?? null,
  }
}

function migrateExpense(expense: Expense): Expense {
  return {
    ...expense,
    recurringOf: expense.recurringOf ?? null,
  }
}

export const emptyState = (): AppState => ({
  version: 1,
  users: [],
  sessionUserId: null,
  templates: [],
  accounts: [],
  incomeSettings: [],
  bonuses: [],
  allocations: [],
  expenseTypes: [],
  expenseTypeAssignments: [],
  expenses: [],
  localDebts: [],
})

export function parseState(raw: string | null | undefined): AppState {
  if (!raw) return emptyState()
  try {
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyState()
    return {
      ...emptyState(),
      ...parsed,
      users: (parsed.users ?? []).map(migrateUser),
      templates: (parsed.templates ?? []).map(migrateTemplate),
      accounts: (parsed.accounts ?? []).map(migrateAccount),
      expenseTypes: (parsed.expenseTypes ?? []).map(migrateExpenseType),
      expenses: (parsed.expenses ?? []).map(migrateExpense),
      version: 1,
    }
  } catch {
    return emptyState()
  }
}

function hydrate(state: AppState): AppState {
  const next = applyRecurring(state)
  if (next !== state) saveState(next)
  return next
}

export function loadState(): AppState {
  if (isDesktop()) return emptyState()
  try {
    return hydrate(parseState(localStorage.getItem(STORAGE_KEY)))
  } catch {
    return emptyState()
  }
}

export async function loadDesktopState(): Promise<AppState> {
  try {
    return hydrate(parseState(await readWalletFile()))
  } catch {
    return emptyState()
  }
}

let writeQueue: Promise<void> = Promise.resolve()

export function saveState(state: AppState): void {
  const json = JSON.stringify(state)
  if (isDesktop()) {
    writeQueue = writeQueue
      .then(() => writeWalletFile(json))
      .catch((err: unknown) => {
        console.error('Could not save the wallet file.', err)
      })
    return
  }
  localStorage.setItem(STORAGE_KEY, json)
}
