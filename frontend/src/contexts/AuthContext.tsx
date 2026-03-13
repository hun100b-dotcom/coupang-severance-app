import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ProviderType = 'kakao' | 'google'

interface User {
  name: string
  provider?: ProviderType
}

interface AuthContextValue {
  isLoggedIn: boolean
  user: User | null
  login: (provider: ProviderType) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'catch_user'

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

function setStoredUser(user: User | null) {
  if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  else localStorage.removeItem(STORAGE_KEY)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getStoredUser)

  const login = useCallback(async (provider: ProviderType) => {
    // 목업: 실제 OAuth 연동 시 교체
    await new Promise(r => setTimeout(r, 800))
    const name = provider === 'kakao' ? '백종훈님' : '백종훈님'
    const next: User = { name, provider }
    setUser(next)
    setStoredUser(next)
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setStoredUser(null)
  }, [])

  const value: AuthContextValue = {
    isLoggedIn: !!user,
    user,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
