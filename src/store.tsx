import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { isDesktop } from './desktop'
import {
  accountBalance,
  cashInflowForMonth,
  monthExpenses,
  spendingByType,
  unallocated,
} from './finance'
import {
  clearActivity,
  currentMonth,
  hashPassword,
  isoDate,
  isPin,
  nextColor,
  nowISO,
  SUGGESTED_TYPES,
  touchActivity,
  uid,
} from './lib'
import { emptyState, loadDesktopState, loadState, saveState } from './storage'
import type {
  Account,
  AllocationMode,
  AppState,
  CloudTemplate,
  ExpenseType,
  ExpenseTypeAssignment,
  InflowScheduleType,
  User,
} from './types'

type Action = { type: 'REPLACE'; state: AppState }

function reducer(_state: AppState, action: Action): AppState {
  return action.state
}

function persist(state: AppState): AppState {
  saveState(state)
  return state
}

type StoreApi = {
  state: AppState
  user: User | null
  register: (input: {
    username: string
    pin: string
  }) => Promise<{ ok: true } | { ok: false; error: string }>
  login: (
    username: string,
    pin: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  logout: () => void
  verifyPin: (pin: string) => Promise<boolean>
  changePin: (
    nextPin: string,
    currentPin?: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>
  updateProfile: (
    patch: Partial<Pick<User, 'displayName' | 'theme' | 'hasMultipleSalaries' | 'setupGuideHidden'>>,
  ) => void
  createTemplate: (name: string) => string
  renameTemplate: (id: string, name: string) => void
  deleteTemplate: (id: string) => void
  setActiveTemplate: (id: string) => void
  setTemplateCloud: (id: string, cloudId: string | null, anonymous?: boolean) => void
  importSharedTemplate: (shared: CloudTemplate) => string | null
  createAccount: (input: {
    name: string
    color: string
    currency: string
    openingBalance: number
    openingNote?: string
    isolated?: boolean
  }) => string | null
  updateAccount: (
    id: string,
    patch: Partial<
      Pick<Account, 'name' | 'color' | 'currency' | 'openingBalance' | 'openingNote' | 'isolated'>
    >,
  ) => void
  deleteAccount: (id: string) => void
  upsertIncome: (input: {
    monthlyAmount: number
    sourceName: string
    scheduleType: InflowScheduleType
    specificDay: number
  }) => void
  addIncome: (input: {
    monthlyAmount: number
    sourceName: string
    scheduleType: InflowScheduleType
    specificDay: number
  }) => void
  updateIncome: (
    id: string,
    input: {
      monthlyAmount: number
      sourceName: string
      scheduleType: InflowScheduleType
      specificDay: number
    },
  ) => void
  deleteIncome: (id: string) => void
  addBonus: (input: {
    amount: number
    year: number
    month: number
    day: number
    sourceName: string
  }) => void
  updateBonus: (
    id: string,
    patch: { amount?: number; day?: number; sourceName?: string; year?: number; month?: number },
  ) => void
  deleteBonus: (id: string) => void
  upsertAllocation: (accountId: string, mode: AllocationMode, value: number) => void
  clearAllocation: (accountId: string) => void
  createExpenseType: (name: string, color?: string) => string | null
  updateExpenseType: (id: string, patch: Partial<Pick<ExpenseType, 'name' | 'color'>>) => void
  deleteExpenseType: (id: string) => void
  assignType: (expenseTypeId: string, accountId: string | null) => void
  addExpense: (input: {
    name: string
    typeName: string
    typeColor?: string
    amount: number
    date: string
    accountId: string | null
    note: string
  }) => { debtCreated: boolean }
  deleteExpense: (id: string) => void
  settleDebt: (id: string) => void
  deleteDebt: (id: string) => void
  importState: (state: AppState) => void
  exportUserSlice: () => unknown
  clearMyData: () => void
}

const StoreContext = createContext<StoreApi | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)
  const [ready, setReady] = useState(() => !isDesktop())

  useEffect(() => {
    if (!isDesktop()) return
    let cancelled = false
    void loadDesktopState().then((loaded) => {
      if (cancelled) return
      dispatch({ type: 'REPLACE', state: loaded })
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const commit = useCallback(
    (next: AppState) => {
      dispatch({ type: 'REPLACE', state: persist(next) })
    },
    [],
  )

  const user = state.users.find((u) => u.id === state.sessionUserId) ?? null

  const register: StoreApi['register'] = useCallback(
    async ({ username, pin }) => {
      const name = username.trim().toLowerCase()
      if (name.length < 3) return { ok: false, error: 'Username must be at least 3 characters.' }
      if (!isPin(pin)) return { ok: false, error: 'Choose a 4-digit PIN.' }
      if (state.users.some((u) => u.username === name)) {
        return { ok: false, error: 'That username is already used on this device.' }
      }
      const pinHash = await hashPassword(pin)
      const id = uid()
      const nextUser: User = {
        id,
        username: name,
        displayName: name,
        passwordHash: '',
        pinHash,
        role: 'user',
        theme: 'system',
        createdAt: nowISO(),
        activeTemplateId: null,
        hasMultipleSalaries: false,
        setupGuideHidden: false,
      }
      commit({
        ...state,
        users: [...state.users, nextUser],
        sessionUserId: id,
      })
      touchActivity(id)
      return { ok: true }
    },
    [commit, state],
  )

  const login: StoreApi['login'] = useCallback(
    async (username, pin) => {
      const found = state.users.find((u) => u.username === username.trim().toLowerCase())
      if (!found) return { ok: false, error: 'No account with that username on this device.' }
      if (!isPin(pin) || (await hashPassword(pin)) !== found.pinHash) {
        return { ok: false, error: 'That PIN does not match this username on this device.' }
      }
      commit({ ...state, sessionUserId: found.id })
      touchActivity(found.id)
      return { ok: true }
    },
    [commit, state],
  )

  const logout = useCallback(() => {
    if (user) clearActivity(user.id)
    commit({ ...state, sessionUserId: null })
  }, [commit, state, user])

  const verifyPin: StoreApi['verifyPin'] = useCallback(
    async (pin) => {
      if (!user?.pinHash || !isPin(pin)) return false
      return (await hashPassword(pin)) === user.pinHash
    },
    [user],
  )

  const changePin: StoreApi['changePin'] = useCallback(
    async (nextPin, currentPin) => {
      if (!user) return { ok: false, error: 'You need to be signed in.' }
      if (!isPin(nextPin)) return { ok: false, error: 'PIN must be 4 digits.' }
      if (user.pinHash) {
        if (!currentPin || !isPin(currentPin)) {
          return { ok: false, error: 'Enter your current PIN.' }
        }
        if ((await hashPassword(currentPin)) !== user.pinHash) {
          return { ok: false, error: 'Current PIN is wrong.' }
        }
      }
      const pinHash = await hashPassword(nextPin)
      commit({
        ...state,
        users: state.users.map((u) => (u.id === user.id ? { ...u, pinHash } : u)),
      })
      touchActivity(user.id)
      return { ok: true }
    },
    [commit, state, user],
  )

  const updateProfile: StoreApi['updateProfile'] = useCallback(
    (patch) => {
      if (!user) return
      commit({
        ...state,
        users: state.users.map((u) => (u.id === user.id ? { ...u, ...patch } : u)),
      })
    },
    [commit, state, user],
  )

  const createTemplate: StoreApi['createTemplate'] = useCallback(
    (name) => {
      if (!user) return ''
      const id = uid()
      const template = {
        id,
        userId: user.id,
        name: name.trim() || 'Untitled',
        createdAt: nowISO(),
        cloudId: null,
        sharedAnonymous: false,
      }
      commit({
        ...state,
        templates: [...state.templates, template],
        users: state.users.map((u) =>
          u.id === user.id ? { ...u, activeTemplateId: u.activeTemplateId ?? id } : u,
        ),
      })
      return id
    },
    [commit, state, user],
  )

  const renameTemplate: StoreApi['renameTemplate'] = useCallback(
    (id, name) => {
      commit({
        ...state,
        templates: state.templates.map((t) => (t.id === id ? { ...t, name: name.trim() } : t)),
      })
    },
    [commit, state],
  )

  const deleteTemplate: StoreApi['deleteTemplate'] = useCallback(
    (id) => {
      if (!user) return
      const accountIds = state.accounts.filter((a) => a.templateId === id).map((a) => a.id)
      const remaining = state.templates.filter((t) => t.id !== id)
      const nextActive =
        user.activeTemplateId === id
          ? (remaining.find((t) => t.userId === user.id)?.id ?? null)
          : user.activeTemplateId
      commit({
        ...state,
        templates: remaining,
        accounts: state.accounts.filter((a) => a.templateId !== id),
        allocations: state.allocations.filter((a) => a.templateId !== id),
        expenseTypeAssignments: state.expenseTypeAssignments.filter((a) => a.templateId !== id),
        localDebts: state.localDebts.filter((d) => d.templateId !== id),
        expenses: state.expenses.map((e) =>
          e.accountId && accountIds.includes(e.accountId) ? { ...e, accountId: null } : e,
        ),
        users: state.users.map((u) => (u.id === user.id ? { ...u, activeTemplateId: nextActive } : u)),
      })
    },
    [commit, state, user],
  )

  const setActiveTemplate: StoreApi['setActiveTemplate'] = useCallback(
    (id) => {
      if (!user) return
      commit({
        ...state,
        users: state.users.map((u) => (u.id === user.id ? { ...u, activeTemplateId: id } : u)),
      })
    },
    [commit, state, user],
  )

  const setTemplateCloud: StoreApi['setTemplateCloud'] = useCallback(
    (id, cloudId, anonymous = false) => {
      commit({
        ...state,
        templates: state.templates.map((t) =>
          t.id === id ? { ...t, cloudId, sharedAnonymous: Boolean(cloudId) && anonymous } : t,
        ),
      })
    },
    [commit, state],
  )

  const importSharedTemplate: StoreApi['importSharedTemplate'] = useCallback(
    (shared) => {
      if (!user) return null
      const templateId = uid()
      const accounts = shared.accounts.map((account) => ({
        id: uid(),
        userId: user.id,
        templateId,
        name: account.name,
        color: account.color,
        currency: account.currency || 'USD',
            openingBalance: 0,
            openingNote: '',
            isolated: false,
            createdAt: nowISO(),
      }))
      let types = [...state.expenseTypes]
      const assignments: ExpenseTypeAssignment[] = []
      for (let i = 0; i < shared.accounts.length; i++) {
        const account = accounts[i]
        for (const type of shared.accounts[i].types) {
          const trimmed = type.name.trim()
          if (!trimmed) continue
          let existing = types.find(
            (t) => t.userId === user.id && t.name.toLowerCase() === trimmed.toLowerCase(),
          )
          if (!existing) {
            existing = {
              id: uid(),
              userId: user.id,
              name: trimmed,
              color: type.color,
            }
            types = [...types, existing]
          }
          const already = assignments.some((a) => a.expenseTypeId === existing.id)
          if (already) continue
          assignments.push({
            id: uid(),
            userId: user.id,
            expenseTypeId: existing.id,
            templateId,
            accountId: account.id,
          })
        }
      }
      commit({
        ...state,
        templates: [
          ...state.templates,
          {
            id: templateId,
            userId: user.id,
            name: shared.name.trim() || 'Untitled',
            createdAt: nowISO(),
            cloudId: null,
            sharedAnonymous: false,
          },
        ],
        accounts: [...state.accounts, ...accounts],
        expenseTypes: types,
        expenseTypeAssignments: [...state.expenseTypeAssignments, ...assignments],
        users: state.users.map((u) => (u.id === user.id ? { ...u, activeTemplateId: templateId } : u)),
      })
      return templateId
    },
    [commit, state, user],
  )

  const createAccount: StoreApi['createAccount'] = useCallback(
    (input) => {
      if (!user?.activeTemplateId) return null
      const id = uid()
      commit({
        ...state,
        accounts: [
          ...state.accounts,
          {
            id,
            userId: user.id,
            templateId: user.activeTemplateId,
            name: input.name.trim() || 'Account',
            color: input.color,
            currency: input.currency,
            openingBalance: input.openingBalance,
            openingNote: (input.openingNote ?? '').trim(),
            isolated: Boolean(input.isolated),
            createdAt: nowISO(),
          },
        ],
      })
      return id
    },
    [commit, state, user],
  )

  const updateAccount: StoreApi['updateAccount'] = useCallback(
    (id, patch) => {
      commit({
        ...state,
        accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })
    },
    [commit, state],
  )

  const deleteAccount: StoreApi['deleteAccount'] = useCallback(
    (id) => {
      commit({
        ...state,
        accounts: state.accounts.filter((a) => a.id !== id),
        allocations: state.allocations.filter((a) => a.accountId !== id),
        expenseTypeAssignments: state.expenseTypeAssignments.filter((a) => a.accountId !== id),
        expenses: state.expenses.map((e) => (e.accountId === id ? { ...e, accountId: null } : e)),
        localDebts: state.localDebts.filter(
          (d) => d.fromAccountId !== id && d.toAccountId !== id,
        ),
      })
    },
    [commit, state],
  )

  const upsertIncome: StoreApi['upsertIncome'] = useCallback(
    (input) => {
      if (!user) return
      const mine = state.incomeSettings.filter((i) => i.userId === user.id)
      const existing = mine[0]
      const row = {
        id: existing?.id ?? uid(),
        userId: user.id,
        monthlyAmount: input.monthlyAmount,
        sourceName: input.sourceName.trim(),
        scheduleType: input.scheduleType,
        specificDay: input.specificDay,
      }
      commit({
        ...state,
        incomeSettings: existing
          ? state.incomeSettings.map((i) => (i.id === existing.id ? row : i))
          : [...state.incomeSettings, row],
      })
    },
    [commit, state, user],
  )

  const addIncome: StoreApi['addIncome'] = useCallback(
    (input) => {
      if (!user) return
      commit({
        ...state,
        incomeSettings: [
          ...state.incomeSettings,
          {
            id: uid(),
            userId: user.id,
            monthlyAmount: input.monthlyAmount,
            sourceName: input.sourceName.trim(),
            scheduleType: input.scheduleType,
            specificDay: input.specificDay,
          },
        ],
        users: state.users.map((u) =>
          u.id === user.id ? { ...u, hasMultipleSalaries: true } : u,
        ),
      })
    },
    [commit, state, user],
  )

  const updateIncome: StoreApi['updateIncome'] = useCallback(
    (id, input) => {
      if (!user) return
      commit({
        ...state,
        incomeSettings: state.incomeSettings.map((i) =>
          i.id === id && i.userId === user.id
            ? {
                ...i,
                monthlyAmount: input.monthlyAmount,
                sourceName: input.sourceName.trim(),
                scheduleType: input.scheduleType,
                specificDay: input.specificDay,
              }
            : i,
        ),
      })
    },
    [commit, state, user],
  )

  const deleteIncome: StoreApi['deleteIncome'] = useCallback(
    (id) => {
      if (!user) return
      commit({
        ...state,
        incomeSettings: state.incomeSettings.filter((i) => i.id !== id || i.userId !== user.id),
      })
    },
    [commit, state, user],
  )

  const addBonus: StoreApi['addBonus'] = useCallback(
    (input) => {
      if (!user) return
      commit({
        ...state,
        bonuses: [
          ...state.bonuses,
          {
            id: uid(),
            userId: user.id,
            ...input,
            sourceName: input.sourceName.trim(),
          },
        ],
      })
    },
    [commit, state, user],
  )

  const updateBonus: StoreApi['updateBonus'] = useCallback(
    (id, patch) => {
      commit({
        ...state,
        bonuses: state.bonuses.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      })
    },
    [commit, state],
  )

  const deleteBonus: StoreApi['deleteBonus'] = useCallback(
    (id) => {
      commit({ ...state, bonuses: state.bonuses.filter((b) => b.id !== id) })
    },
    [commit, state],
  )

  const upsertAllocation: StoreApi['upsertAllocation'] = useCallback(
    (accountId, mode, value) => {
      if (!user?.activeTemplateId) return
      const existing = state.allocations.find(
        (a) => a.accountId === accountId && a.templateId === user.activeTemplateId,
      )
      const row = {
        id: existing?.id ?? uid(),
        userId: user.id,
        templateId: user.activeTemplateId,
        accountId,
        mode,
        value,
      }
      commit({
        ...state,
        allocations: existing
          ? state.allocations.map((a) => (a.id === existing.id ? row : a))
          : [...state.allocations, row],
      })
    },
    [commit, state, user],
  )

  const clearAllocation: StoreApi['clearAllocation'] = useCallback(
    (accountId) => {
      commit({
        ...state,
        allocations: state.allocations.filter((a) => a.accountId !== accountId),
      })
    },
    [commit, state],
  )

  const createExpenseType: StoreApi['createExpenseType'] = useCallback(
    (name, color) => {
      if (!user) return null
      const trimmed = name.trim()
      if (!trimmed) return null
      const existing = state.expenseTypes.find(
        (t) => t.userId === user.id && t.name.toLowerCase() === trimmed.toLowerCase(),
      )
      if (existing) return existing.id
      const id = uid()
      commit({
        ...state,
        expenseTypes: [
          ...state.expenseTypes,
          {
            id,
            userId: user.id,
            name: trimmed,
            color: color ?? nextColor(state.expenseTypes.filter((t) => t.userId === user.id).length),
          },
        ],
      })
      return id
    },
    [commit, state, user],
  )

  const updateExpenseType: StoreApi['updateExpenseType'] = useCallback(
    (id, patch) => {
      commit({
        ...state,
        expenseTypes: state.expenseTypes.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })
    },
    [commit, state],
  )

  const deleteExpenseType: StoreApi['deleteExpenseType'] = useCallback(
    (id) => {
      commit({
        ...state,
        expenseTypes: state.expenseTypes.filter((t) => t.id !== id),
        expenseTypeAssignments: state.expenseTypeAssignments.filter((a) => a.expenseTypeId !== id),
        expenses: state.expenses.map((e) => (e.typeId === id ? { ...e, typeId: null } : e)),
      })
    },
    [commit, state],
  )

  const assignType: StoreApi['assignType'] = useCallback(
    (expenseTypeId, accountId) => {
      if (!user?.activeTemplateId) return
      const without = state.expenseTypeAssignments.filter(
        (a) =>
          !(
            a.expenseTypeId === expenseTypeId &&
            a.templateId === user.activeTemplateId
          ),
      )
      if (!accountId) {
        commit({ ...state, expenseTypeAssignments: without })
        return
      }
      commit({
        ...state,
        expenseTypeAssignments: [
          ...without,
          {
            id: uid(),
            userId: user.id,
            expenseTypeId,
            templateId: user.activeTemplateId,
            accountId,
          },
        ],
      })
    },
    [commit, state, user],
  )

  const addExpense: StoreApi['addExpense'] = useCallback(
    (input) => {
      if (!user) return { debtCreated: false }
      let types = state.expenseTypes
      const typeName = input.typeName.trim()
      let type = types.find(
        (t) => t.userId === user.id && t.name.toLowerCase() === typeName.toLowerCase(),
      )
      if (!type && typeName) {
        type = {
          id: uid(),
          userId: user.id,
          name: typeName,
          color:
            input.typeColor ??
            nextColor(types.filter((t) => t.userId === user.id).length),
        }
        types = [...types, type]
      }
      const chosen = state.accounts.find((a) => a.id === input.accountId)
      const spendFrom = chosen && !chosen.isolated ? chosen : null
      const expense = {
        id: uid(),
        userId: user.id,
        name: input.name.trim() || typeName || 'Expense',
        typeId: type?.id ?? null,
        amount: input.amount,
        date: input.date || isoDate(),
        accountId: spendFrom?.id ?? null,
        note: input.note.trim(),
        createdAt: nowISO(),
      }
      let debts = state.localDebts
      let debtCreated = false
      if (type && spendFrom && user.activeTemplateId) {
        const assignment = state.expenseTypeAssignments.find(
          (a) => a.expenseTypeId === type.id && a.templateId === user.activeTemplateId,
        )
        if (assignment && assignment.accountId !== spendFrom.id) {
          debtCreated = true
          debts = [
            ...debts,
            {
              id: uid(),
              userId: user.id,
              templateId: user.activeTemplateId,
              fromAccountId: assignment.accountId,
              toAccountId: spendFrom.id,
              amount: input.amount,
              expenseId: expense.id,
              settled: false,
              createdAt: nowISO(),
            },
          ]
        }
      }
      commit({
        ...state,
        expenseTypes: types,
        expenses: [expense, ...state.expenses],
        localDebts: debts,
      })
      return { debtCreated }
    },
    [commit, state, user],
  )

  const deleteExpense: StoreApi['deleteExpense'] = useCallback(
    (id) => {
      commit({
        ...state,
        expenses: state.expenses.filter((e) => e.id !== id),
        localDebts: state.localDebts.filter((d) => d.expenseId !== id || d.settled),
      })
    },
    [commit, state],
  )

  const settleDebt: StoreApi['settleDebt'] = useCallback(
    (id) => {
      commit({
        ...state,
        localDebts: state.localDebts.map((d) => (d.id === id ? { ...d, settled: true } : d)),
      })
    },
    [commit, state],
  )

  const deleteDebt: StoreApi['deleteDebt'] = useCallback(
    (id) => {
      commit({ ...state, localDebts: state.localDebts.filter((d) => d.id !== id) })
    },
    [commit, state],
  )

  const importState: StoreApi['importState'] = useCallback(
    (incoming) => {
      commit({ ...emptyState(), ...incoming, version: 1, sessionUserId: state.sessionUserId })
    },
    [commit, state.sessionUserId],
  )

  const exportUserSlice = useCallback(() => {
    if (!user) return null
    const uid = user.id
    return {
      version: 1,
      exportedAt: nowISO(),
      user: { ...user, passwordHash: undefined },
      templates: state.templates.filter((t) => t.userId === uid),
      accounts: state.accounts.filter((a) => a.userId === uid),
      incomeSettings: state.incomeSettings.filter((i) => i.userId === uid),
      bonuses: state.bonuses.filter((b) => b.userId === uid),
      allocations: state.allocations.filter((a) => a.userId === uid),
      expenseTypes: state.expenseTypes.filter((t) => t.userId === uid),
      expenseTypeAssignments: state.expenseTypeAssignments.filter((a) => a.userId === uid),
      expenses: state.expenses.filter((e) => e.userId === uid),
      localDebts: state.localDebts.filter((d) => d.userId === uid),
    }
  }, [state, user])

  const clearMyData = useCallback(() => {
    if (!user) return
    const uid = user.id
    commit({
      ...state,
      templates: state.templates.filter((t) => t.userId !== uid),
      accounts: state.accounts.filter((a) => a.userId !== uid),
      bonuses: state.bonuses.filter((b) => b.userId !== uid),
      allocations: state.allocations.filter((a) => a.userId !== uid),
      expenseTypes: state.expenseTypes.filter((t) => t.userId !== uid),
      expenseTypeAssignments: state.expenseTypeAssignments.filter((a) => a.userId !== uid),
      expenses: state.expenses.filter((e) => e.userId !== uid),
      localDebts: state.localDebts.filter((d) => d.userId !== uid),
      incomeSettings: state.incomeSettings.filter((i) => i.userId !== uid),
      users: state.users.map((u) =>
        u.id === uid
          ? { ...u, activeTemplateId: null, hasMultipleSalaries: false, setupGuideHidden: false }
          : u,
      ),
    })
  }, [commit, state, user])

  const api = useMemo<StoreApi>(
    () => ({
      state,
      user,
      register,
      login,
      logout,
      verifyPin,
      changePin,
      updateProfile,
      createTemplate,
      renameTemplate,
      deleteTemplate,
      setActiveTemplate,
      setTemplateCloud,
      importSharedTemplate,
      createAccount,
      updateAccount,
      deleteAccount,
      upsertIncome,
      addIncome,
      updateIncome,
      deleteIncome,
      addBonus,
      updateBonus,
      deleteBonus,
      upsertAllocation,
      clearAllocation,
      createExpenseType,
      updateExpenseType,
      deleteExpenseType,
      assignType,
      addExpense,
      deleteExpense,
      settleDebt,
      deleteDebt,
      importState,
      exportUserSlice,
      clearMyData,
    }),
    [
      state,
      user,
      register,
      login,
      logout,
      verifyPin,
      changePin,
      updateProfile,
      createTemplate,
      renameTemplate,
      deleteTemplate,
      setActiveTemplate,
      setTemplateCloud,
      importSharedTemplate,
      createAccount,
      updateAccount,
      deleteAccount,
      upsertIncome,
      addIncome,
      updateIncome,
      deleteIncome,
      addBonus,
      updateBonus,
      deleteBonus,
      upsertAllocation,
      clearAllocation,
      createExpenseType,
      updateExpenseType,
      deleteExpenseType,
      assignType,
      addExpense,
      deleteExpense,
      settleDebt,
      deleteDebt,
      importState,
      exportUserSlice,
      clearMyData,
    ],
  )

  if (!ready) {
    return <div className="grid min-h-dvh place-items-center bg-bg text-sm text-muted">Opening your wallet…</div>
  }

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside AppProvider')
  return ctx
}

export function useWorkspace(month = currentMonth()) {
  const { state, user } = useStore()
  return useMemo(() => {
    if (!user) {
      return {
        user: null,
        template: null,
        templates: [],
        accounts: [],
        types: [] as ExpenseType[],
        assignments: [],
        expenses: [],
        monthExpenses: [],
        bonuses: [],
        income: undefined,
        incomes: [],
        activeIncomes: [],
        allocations: [],
        debts: [],
        openDebts: [],
        balances: new Map<string, number>(),
        inflow: { total: 0, salary: 0, bonusTotal: 0, items: [] as Array<{ label: string; amount: number }> },
        spent: 0,
        unallocated: 0,
        byType: [] as ReturnType<typeof spendingByType>,
        suggestedTypes: SUGGESTED_TYPES,
      }
    }
    const templates = state.templates.filter((t) => t.userId === user.id)
    const template = templates.find((t) => t.id === user.activeTemplateId) ?? null
    const accounts = state.accounts.filter((a) => a.templateId === template?.id)
    const types = state.expenseTypes.filter((t) => t.userId === user.id)
    const assignments = state.expenseTypeAssignments.filter(
      (a) => a.templateId === template?.id,
    )
    const expenses = state.expenses.filter((e) => e.userId === user.id)
    const monthExp = monthExpenses(expenses, month.year, month.month)
    const bonuses = state.bonuses.filter((b) => b.userId === user.id)
    const incomes = state.incomeSettings.filter((i) => i.userId === user.id)
    const income = incomes[0]
    const activeIncomes = user.hasMultipleSalaries ? incomes : incomes.slice(0, 1)
    const allocations = state.allocations.filter((a) => a.templateId === template?.id)
    const debts = state.localDebts.filter((d) => d.templateId === template?.id)
    const ctx = { expenses, allocations, income: activeIncomes, bonuses, debts }
    const balances = new Map(accounts.map((a) => [a.id, accountBalance(a, ctx)]))
    const inflow = cashInflowForMonth(activeIncomes, bonuses, month.year, month.month)
    const spent = monthExp.reduce((sum, e) => sum + e.amount, 0)
    return {
      user,
      template,
      templates,
      accounts,
      types,
      assignments,
      expenses,
      monthExpenses: monthExp,
      bonuses,
      income,
      incomes,
      activeIncomes,
      allocations,
      debts,
      openDebts: debts.filter((d) => !d.settled),
      balances,
      inflow,
      spent,
      unallocated: unallocated(inflow.total, allocations),
      byType: spendingByType(monthExp, types),
      suggestedTypes: SUGGESTED_TYPES,
    }
  }, [state, user, month.year, month.month])
}

export function usePrefersDark() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', onStoreChange)
      return () => mq.removeEventListener('change', onStoreChange)
    },
    () => window.matchMedia('(prefers-color-scheme: dark)').matches,
    () => false,
  )
}

