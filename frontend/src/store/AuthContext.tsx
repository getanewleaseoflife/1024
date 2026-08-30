import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { apiPost } from '../api/client'
import { clearAuth, getAuthUser, setAuth } from '../api/user'
import type { AuthUser } from '../api/types'

interface AuthContextValue {
  user: AuthUser | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser())

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: async (username, password) => {
        const res = await apiPost<{ token: string; user: AuthUser }>('/auth/login', {
          username,
          password,
        })
        setAuth(res.token, res.user)
        setUser(res.user)
      },
      register: async (username, password) => {
        const res = await apiPost<{ token: string; user: AuthUser }>('/auth/register', {
          username,
          password,
        })
        setAuth(res.token, res.user)
        setUser(res.user)
      },
      logout: () => {
        clearAuth()
        setUser(null)
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return ctx
}
