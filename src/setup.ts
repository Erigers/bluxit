import type { AppState, User } from './types'

export const SETUP_STEPS = [
  {
    id: 'template',
    n: 1,
    label: 'Wallet Template',
    short: 'Template',
    to: '/templates',
    hint: 'Create a template, or import one from the catalog.',
  },
  {
    id: 'accounts',
    n: 2,
    label: 'Accounts',
    short: 'Accounts',
    to: '/accounts',
    hint: 'Add the pockets this wallet spends from.',
  },
  {
    id: 'inflow',
    n: 3,
    label: 'Cash Inflow',
    short: 'Inflow',
    to: '/income',
    hint: 'Add a monthly salary or a bonus so money has somewhere to split from.',
  },
  {
    id: 'types',
    n: 4,
    label: 'Types',
    short: 'Types',
    to: '/types',
    hint: 'Name the kinds of spending you want to track, then drop them into accounts.',
  },
  {
    id: 'logging',
    n: 5,
    label: 'Continue on expense logging every day',
    short: 'Daily',
    to: '/expenses',
    hint: 'The setup is done. Log spending as it happens — a little, every day.',
  },
] as const

export type SetupStepId = (typeof SETUP_STEPS)[number]['id']

export type SetupProgress = {
  visible: boolean
  done: Record<SetupStepId, boolean>
  doneCount: number
  currentIndex: number
  current: (typeof SETUP_STEPS)[number]
}

export function setupFlags(state: AppState, user: User | null) {
  if (!user) {
    return {
      template: false,
      accounts: false,
      inflow: false,
      types: false,
      logging: false,
    }
  }
  const templates = state.templates.filter((t) => t.userId === user.id)
  const activeId = user.activeTemplateId
  const template = templates.some((t) => t.id === activeId) || templates.length > 0
  const accounts = state.accounts.some((a) => a.userId === user.id && (!activeId || a.templateId === activeId))
  const inflow =
    state.incomeSettings.some((i) => i.userId === user.id && i.monthlyAmount > 0) ||
    state.bonuses.some((b) => b.userId === user.id)
  const types = state.expenseTypes.some((t) => t.userId === user.id)
  const logging = state.expenses.some((e) => e.userId === user.id)
  return { template, accounts, inflow, types, logging }
}

export function setupProgress(state: AppState, user: User | null): SetupProgress {
  const done = setupFlags(state, user)
  const ready = done.template && done.accounts && done.inflow && done.types
  const alreadyUsing = ready && done.logging
  const visible = Boolean(user) && !user?.setupGuideHidden && !alreadyUsing
  const checks = [done.template, done.accounts, done.inflow, done.types, ready] as const
  const doneCount = checks.filter(Boolean).length
  const currentIndex = Math.min(
    SETUP_STEPS.findIndex((_, i) => !checks[i]),
    SETUP_STEPS.length - 1,
  )
  const safeIndex = currentIndex < 0 ? SETUP_STEPS.length - 1 : currentIndex
  return {
    visible,
    done: {
      template: done.template,
      accounts: done.accounts,
      inflow: done.inflow,
      types: done.types,
      logging: ready,
    },
    doneCount,
    currentIndex: safeIndex,
    current: SETUP_STEPS[safeIndex],
  }
}

export function postAuthPath(state: AppState, user: User): string {
  const hasTemplate = state.templates.some((t) => t.userId === user.id)
  return hasTemplate ? '/home' : '/templates'
}
