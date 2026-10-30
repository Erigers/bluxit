import { STORAGE_KEY } from './lib'
import type { Account, AppState, Template, User } from './types'

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

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<AppState>
    return {
      ...emptyState(),
      ...parsed,
      users: (parsed.users ?? []).map(migrateUser),
      templates: (parsed.templates ?? []).map(migrateTemplate),
      accounts: (parsed.accounts ?? []).map(migrateAccount),
      version: 1,
    }
  } catch {
    return emptyState()
  }
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}
