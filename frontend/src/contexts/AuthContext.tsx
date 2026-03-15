/**
 * 전역 인증 컨텍스트 (Supabase Auth 기반)
 * - 앱 전체에서 user, isLoggedIn, loading 상태를 공유합니다.
 * - onAuthStateChange로 새로고침 후에도 로그인 상태가 유지됩니다.
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../utils/supabase/client'

export type ProviderType = 'kakao' | 'google'

/** 앱에서 사용하는 유저 정보 (Supabase user + 메타데이터 요약) */
export interface User {
  id: string
  email?: string
  name: string
  avatarUrl?: string
  provider?: ProviderType
  /** Supabase 원본 객체 (updateUser 등에서 id 필요 시 사용) */
  raw?: SupabaseUser
}

interface AuthContextValue {
  /** 현재 로그인한 유저 (없으면 null) */
  user: User | null
  /** 로그인 여부 */
  isLoggedIn: boolean
  /** 세션 복원 중 여부 (초기 로딩) */
  loading: boolean
  /** 소셜 로그인 (완료 후 마이페이지로 이동) */
  login: (provider: ProviderType) => Promise<void>
  /** 로그아웃 */
  logout: () => void
  /** 유저 정보 갱신 (닉네임 등 수정 후 호출) */
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Supabase User → 앱용 User 변환 (메타데이터에서 이름·프로필 사진 추출) */
function toAppUser(sbUser: SupabaseUser): User {
  const meta = sbUser.user_metadata ?? {}
  const name =
    meta.name ?? meta.full_name ?? meta.user_name ?? sbUser.email?.split('@')[0] ?? '사용자'
  const avatarUrl = meta.avatar_url ?? meta.picture
  const provider = meta.provider === 'kakao' ? 'kakao' : meta.provider === 'google' ? 'google' : undefined
  return {
    id: sbUser.id,
    email: sbUser.email,
    name: String(name),
    avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
    provider,
    raw: sbUser,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // 초기 세션 복원 + 인증 상태 변경 리스너 (새로고침 시 로그인 유지)
  useEffect(() => {
    const client = supabase
    if (!client) {
      setLoading(false)
      return
    }

    const getInitialSession = async () => {
      try {
        const { data: { session } } = await client.auth.getSession()
        if (session?.user) setUser(toAppUser(session.user))
        else setUser(null)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser(toAppUser(session.user))
      else setUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = useCallback(
    async (provider: ProviderType) => {
      if (!supabase) return
      const redirectTo = `${window.location.origin}/mypage`
      await supabase.auth.signInWithOAuth({
        provider: provider === 'kakao' ? 'kakao' : 'google',
        options: { redirectTo },
      })
      // OAuth는 외부 페이지로 이동 후 콜백으로 돌아오므로, 여기서 navigate는 호출되지 않습니다.
      // 콜백 후 onAuthStateChange로 user가 설정되고, 이미 /mypage로 리다이렉트되어 있도록 redirectTo 사용
    },
    []
  )

  const logout = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!supabase) return
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) setUser(toAppUser(session.user))
  }, [])

  const value: AuthContextValue = {
    user,
    isLoggedIn: !!user,
    loading,
    login,
    logout,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
