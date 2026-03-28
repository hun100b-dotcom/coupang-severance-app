// 전역 로그인 상태를 관리하는 React 컨텍스트
// Supabase 세션 감지 + 온보딩 완료 여부를 앱 전체에서 공유

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AppUser {
  id: string
  email?: string
  name: string
  avatarUrl?: string
  raw: SupabaseUser
}

interface AuthContextValue {
  user: AppUser | null
  isLoggedIn: boolean
  loading: boolean
  needsOnboarding: boolean // 온보딩 필요 여부
  logout: () => Promise<void>
  refreshOnboardingStatus: () => Promise<void> // 온보딩 완료 후 상태 갱신용
}

const AuthContext = createContext<AuthContextValue | null>(null)

function mapSupabaseUserToAppUser(sbUser: SupabaseUser): AppUser {
  const meta = sbUser.user_metadata ?? {}
  const nameFromMeta = meta.full_name ?? meta.name ?? meta.user_name
  const fallbackName = sbUser.email ? sbUser.email.split('@')[0] : '사용자'
  const name = String(nameFromMeta ?? fallbackName)
  const avatarUrl = meta.avatar_url ?? meta.picture

  return {
    id: sbUser.id,
    email: sbUser.email ?? undefined,
    name,
    avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
    raw: sbUser,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  // 프로필에서 온보딩 완료 여부 확인
  const checkOnboarding = useCallback(async (userId: string) => {
    if (!supabase) return
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed, full_name')
        .eq('id', userId)
        .maybeSingle()

      const completed = !!(profile?.onboarding_completed && profile?.full_name)
      setNeedsOnboarding(!completed)
    } catch {
      setNeedsOnboarding(true) // 조회 실패 시 온보딩 필요로 처리
    }
  }, [])

  // 외부에서 온보딩 완료 후 상태 갱신할 때 사용
  const refreshOnboardingStatus = useCallback(async () => {
    if (user) {
      await checkOnboarding(user.id)
    }
  }, [user, checkOnboarding])

  useEffect(() => {
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }

    let mounted = true

    const init = async () => {
      try {
        const { data: { session } } = await client.auth.getSession()
        if (!mounted) return
        if (session?.user) {
          setUser(mapSupabaseUserToAppUser(session.user))
          await checkOnboarding(session.user.id)
        } else {
          setUser(null)
          setNeedsOnboarding(false)
        }
      } catch {
        if (mounted) {
          setUser(null)
          setNeedsOnboarding(false)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (session?.user) {
        setUser(mapSupabaseUserToAppUser(session.user))
        await checkOnboarding(session.user.id)
      } else {
        setUser(null)
        setNeedsOnboarding(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [checkOnboarding])

  const logout = useCallback(async () => {
    if (!supabase) {
      setUser(null)
      setNeedsOnboarding(false)
      return
    }
    try {
      await supabase.auth.signOut()
    } finally {
      setUser(null)
      setNeedsOnboarding(false)
    }
  }, [])

  const value: AuthContextValue = {
    user,
    isLoggedIn: !!user,
    loading,
    needsOnboarding,
    logout,
    refreshOnboardingStatus,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth 훅은 AuthProvider 안에서만 사용할 수 있습니다.')
  }
  return ctx
}
