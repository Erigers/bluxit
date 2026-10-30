export type Role = 'admin' | 'user'
export type ThemePreference = 'light' | 'dark' | 'system'
export type AllocationMode = 'percentage' | 'static'
export type InflowScheduleType = 'first-day' | 'first-monday' | 'specific-date'

export type User = {
  id: string
  username: string
  displayName: string
  passwordHash: string
  pinHash: string
  role: Role
  theme: ThemePreference
  createdAt: string
  activeTemplateId: string | null
  hasMultipleSalaries?: boolean
  setupGuideHidden?: boolean
}

export type Template = {
  id: string
  userId: string
  name: string
  createdAt: string
  cloudId: string | null
  sharedAnonymous: boolean
}

export type CloudType = {
  name: string
  color: string
}

export type CloudAccount = {
  name: string
  color: string
  currency: string
  types: CloudType[]
}

export type CloudTemplate = {
  id: string
  name: string
  authorUsername: string | null
  publishedAt: string
  accounts: CloudAccount[]
}

export type Account = {
  id: string
  userId: string
  templateId: string
  name: string
  color: string
  currency: string
  openingBalance: number
  openingNote: string
  isolated?: boolean
  createdAt: string
}

export type IncomeSettings = {
  id: string
  userId: string
  monthlyAmount: number
  sourceName: string
  scheduleType: InflowScheduleType
  specificDay: number
}

export type Bonus = {
  id: string
  userId: string
  amount: number
  year: number
  month: number
  day: number
  sourceName: string
}

export type Allocation = {
  id: string
  userId: string
  templateId: string
  accountId: string
  mode: AllocationMode
  value: number
}

export type ExpenseType = {
  id: string
  userId: string
  name: string
  color: string
}

export type ExpenseTypeAssignment = {
  id: string
  userId: string
  expenseTypeId: string
  templateId: string
  accountId: string
}

export type Expense = {
  id: string
  userId: string
  name: string
  typeId: string | null
  amount: number
  date: string
  accountId: string | null
  note: string
  createdAt: string
}

export type LocalDebt = {
  id: string
  userId: string
  templateId: string
  fromAccountId: string
  toAccountId: string
  amount: number
  expenseId: string
  settled: boolean
  createdAt: string
}

export type AppState = {
  version: 1
  users: User[]
  sessionUserId: string | null
  templates: Template[]
  accounts: Account[]
  incomeSettings: IncomeSettings[]
  bonuses: Bonus[]
  allocations: Allocation[]
  expenseTypes: ExpenseType[]
  expenseTypeAssignments: ExpenseTypeAssignment[]
  expenses: Expense[]
  localDebts: LocalDebt[]
}

export type MonthRef = {
  year: number
  month: number
}
