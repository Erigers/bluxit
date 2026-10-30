import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { Accounts } from './pages/Accounts'
import { AuthPage } from './pages/AuthPage'
import { Dashboard } from './pages/Dashboard'
import { Landing } from './pages/Landing'
import { Debts } from './pages/Debts'
import { Expenses } from './pages/Expenses'
import { ExpenseTypes } from './pages/ExpenseTypes'
import { Income } from './pages/Income'
import { More } from './pages/More'
import { Settings } from './pages/Settings'
import { Templates } from './pages/Templates'
import { AppProvider, useStore } from './store'

function RequireAuth() {
  const { user } = useStore()
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<AuthPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="home" element={<Dashboard />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="types" element={<ExpenseTypes />} />
          <Route path="income" element={<Income />} />
          <Route path="templates" element={<Templates />} />
          <Route path="debts" element={<Debts />} />
          <Route path="settings" element={<Settings />} />
          <Route path="more" element={<More />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  )
}
