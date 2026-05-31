import { createContext, useContext, useState, useCallback } from 'react'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('mp_user')
    return stored ? JSON.parse(stored) : null
  })

  const login = useCallback(async (username, password) => {
    const { data } = await api.post('/auth/login/', { username, password })
    localStorage.setItem('mp_access', data.access)
    localStorage.setItem('mp_refresh', data.refresh)
    const me = await api.get('/me/')
    localStorage.setItem('mp_user', JSON.stringify(me.data))
    setUser(me.data)
    return me.data
  }, [])

  const logout = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('mp_refresh')
      if (refresh) await api.post('/auth/logout/', { refresh })
    } catch (_) {}
    localStorage.removeItem('mp_access')
    localStorage.removeItem('mp_refresh')
    localStorage.removeItem('mp_user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
