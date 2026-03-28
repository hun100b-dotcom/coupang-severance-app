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
  loading: boolean         // 세션 확인 완료 여부 (빠르게 해제)
  needsOnboarding: boolean // 온보딩 필요 여부 (비동기 확인)
  logout: () => Promise<void>
  refreshOnboardingStatus: () => Promise<void>
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

  // 프로필에서 온보딩 완료 여부 확인 (타임아웃 포함)
  const checkOnboarding = useCallback(async (userId: string) => {
    if (!supabase) {
      setNeedsOnboarding(true)
      return
    }
    try {
      // 5초 타임아웃 (쿼리가 무한 대기되는 것 방지)
      const queryPromise = supabase
        .from('profiles')
        .select('onboarding_completed, full_name')
        .eq('id', userId)
        .maybeSingle()

      const timeoutPromise = new Promise<{ data: null; error: { message: string } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 5000)
      )

      const { data: profile, error } = await Promise.race([queryPromise, timeoutPromise])

      if (error) {
        console.error('[AuthContext] 프로필 조회 오류:', error.message)
        setNeedsOnboarding(true)
        return
      }

      const completed = !!(profile?.onboarding_completed && profile?.full_name)
      setNeedsOnboarding(!completed)
    } catch (err) {
      console.error('[AuthContext] 프로필 확인 실패:', err)
      setNeedsOnboarding(true)
    }
  }, [])

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

    // 핵심 변경: 세션 확인과 온보딩 체크를 분리
    // loading은 세션 확인 즉시 해제, 온보딩은 비동기로 따로 처리
    const init = async () => {
      try {
        const { data: { session } } = await client.auth.getSession()
        if (!mounted) return
        if (session?.user) {
          setUser(mapSupabaseUserToAppUser(session.user))
          // loading을 먼저 해제한 후 온보딩 체크 (UI 차단 방지)
          setLoading(false)
          checkOnboarding(session.user.id) // await 없이 비동기 실행
        } else {
          setUser(null)
          setNeedsOnboarding(false)
          setLoading(false)
        }
      } catch {
        if (mounted) {
          setUser(null)
          setNeedsOnboarding(false)
          setLoading(false)
        }
      }
    }

    init()

    const { data: { subscription } } = client.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      if (session?.user) {
        setUser(mapSupabaseUserToAppUser(session.user))
        if (loading) setLoading(false) // 아직 로딩 중이면 해제
        checkOnboarding(session.user.id)
      } else {
        setUser(null)
        setNeedsOnboarding(false)
        if (loading) setLoading(false)
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
