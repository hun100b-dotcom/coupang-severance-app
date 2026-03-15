/**
 * 전역 인증 컨텍스트 (Supabase Auth 기반)
 * - redirectTo는 AUTH_CALLBACK_URL로 고정 (Supabase URL Configuration과 동일).
 * - 인증 후 /auth/callback에서 세션 처리 후 마이페이지로 이동.
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '../utils/supabase/client'
import { AUTH_CALLBACK_URL } from '../utils/getUrl'

export type ProviderType = 'kakao' | 'google'

export interface User {
  id: string
  email?: string
  name: string
  avatarUrl?: string
  provider?: ProviderType
  raw?: SupabaseUser
}

interface AuthContextValue {
  user: User | null
  isLoggedIn: boolean
  loading: boolean
  login: (provider: ProviderType) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

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

  const login = useCallback(async (provider: ProviderType) => {
    const client = supabase
    if (!client) {
      alert('로그인 설정이 되어 있지 않습니다. (Supabase URL/Key 확인)')
      return
    }
    const providerId = provider === 'kakao' ? 'kakao' : 'google'
    try {
      const { data, error } = await client.auth.signInWithOAuth({
        provider: providerId,
        options: { redirectTo: AUTH_CALLBACK_URL },
      })
      if (error) {
        alert(`로그인 오류: ${error.message}`)
        return
      }
      // 브라우저에서 리다이렉트가 안 될 수 있으므로 URL이 있으면 수동 이동 (카카오/구글 로그인 진행)
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      alert(`로그인 중 오류가 났어요.\n\n${message}`)
    }
  }, [])

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
