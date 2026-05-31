import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import DomainsPage from './pages/DomainsPage'
import MailboxesPage from './pages/MailboxesPage'
import AliasesPage from './pages/AliasesPage'
import ServicesPage from './pages/ServicesPage'
import LogsPage from './pages/LogsPage'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="domains" element={<DomainsPage />} />
        <Route path="mailboxes" element={<MailboxesPage />} />
        <Route path="aliases" element={<AliasesPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="logs" element={<LogsPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
