// 전역 로그인 상태를 관리하는 React 컨텍스트입니다.
// Supabase 세션을 한 번만 감지(onAuthStateChange)해서 앱 전체에서 로그인 정보를 공유합니다.

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react' // React 훅과 타입들을 가져옵니다.
import type { User as SupabaseUser } from '@supabase/supabase-js' // Supabase SDK에서 User 타입을 가져옵니다.
import { supabase } from '../lib/supabase' // 우리가 만든 공용 Supabase 클라이언트를 가져옵니다.

interface AppUser {
  id: string // 유저 고유 ID입니다.
  email?: string // 유저 이메일(있을 수도, 없을 수도 있습니다).
  name: string // 화면에 보여줄 유저 이름입니다.
  avatarUrl?: string // 프로필 이미지 URL입니다.
  raw: SupabaseUser // 필요하면 쓸 수 있도록 원본 Supabase 유저 객체도 함께 저장합니다.
}

interface AuthContextValue {
  user: AppUser | null // 현재 로그인한 유저 정보입니다. 없으면 null입니다.
  isLoggedIn: boolean // 로그인 여부를 true/false로 간단히 나타냅니다.
  loading: boolean // 초기 세션 확인 중인지 여부입니다.
  logout: () => Promise<void> // 로그아웃 함수입니다.
}

const AuthContext = createContext<AuthContextValue | null>(null) // 실제 값을 담을 컨텍스트를 생성합니다.

function mapSupabaseUserToAppUser(sbUser: SupabaseUser): AppUser {
  const meta = sbUser.user_metadata ?? {} // Supabase에 저장된 user_metadata를 가져옵니다(없으면 빈 객체로 둡니다).
  const nameFromMeta = meta.full_name ?? meta.name ?? meta.user_name // 메타데이터에서 이름 후보들을 순서대로 꺼냅니다.
  const fallbackName = sbUser.email ? sbUser.email.split('@')[0] : '사용자' // 이름이 없으면 이메일 앞부분이나 기본값 '사용자'를 씁니다.
  const name = String(nameFromMeta ?? fallbackName) // 최종적으로 문자열 형태의 이름을 만듭니다.
  const avatarUrl = meta.avatar_url ?? meta.picture // 프로필 이미지는 avatar_url 또는 picture 필드를 우선 사용합니다.

  return {
    id: sbUser.id, // Supabase 유저의 고유 ID를 그대로 사용합니다.
    email: sbUser.email ?? undefined // 이메일이 있으면 넣고, 없으면 undefined로 둡니다.
    ,
    name, // 위에서 계산한 이름을 저장합니다.
    avatarUrl: avatarUrl ? String(avatarUrl) : undefined // 프로필 이미지 URL이 있다면 문자열로 저장합니다.
    ,
    raw: sbUser, // 나중에 user_metadata.full_name 같은 원본 정보가 필요할 수 있어 전체 객체를 보관합니다.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null) // 현재 로그인한 유저 정보를 상태로 관리합니다.
  const [loading, setLoading] = useState(true) // 초기 세션 로딩 중인지 나타내는 상태입니다.

  useEffect(() => {
    const client = supabase // 아래 init·onAuthStateChange에서 사용할 수 있도록 로컬 변수로 둡니다.
    if (!client) {
      setLoading(false) // Supabase 클라이언트가 없으면 더 이상 시도하지 않고 로딩을 끝냅니다.
      return // effect를 종료합니다.
    }

    const init = async () => {
      try {
        const { data: { session } } = await client.auth.getSession() // 앱이 처음 켜졌을 때 현재 세션이 있는지 확인합니다.
        if (session?.user) {
          setUser(mapSupabaseUserToAppUser(session.user)) // 세션에 유저가 있으면 우리 앱 형태의 유저로 변환해 저장합니다.
        } else {
          setUser(null) // 세션이 없으면 로그아웃 상태로 취급합니다.
        }
      } catch {
        setUser(null) // 오류가 나면 안전하게 로그아웃 상태로 둡니다.
      } finally {
        setLoading(false) // 초기 확인이 끝났으므로 로딩을 false로 바꿉니다.
      }
    }

    init() // 위에서 정의한 초기 세션 확인 함수를 바로 실행합니다.

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      // 로그인/로그아웃/토큰 갱신 등이 일어날 때마다 이 콜백이 한 번씩 호출됩니다.
      if (session?.user) {
        setUser(mapSupabaseUserToAppUser(session.user)) // 새로운 세션 유저를 앱 유저로 변환해서 상태를 갱신합니다.
      } else {
        setUser(null) // 세션이 사라지면 로그아웃 상태로 바꿉니다.
      }
    })

    return () => {
      subscription.unsubscribe() // 컴포넌트가 언마운트될 때 구독을 해제해서 메모리 누수를 막습니다.
    }
  }, [])

  const logout = useCallback(async () => {
    if (!supabase) {
      setUser(null) // 클라이언트가 없어도 일단 로컬 상태만 로그아웃으로 바꿉니다.
      return // 함수 실행을 마칩니다.
    }
    try {
      await supabase.auth.signOut() // Supabase에 로그아웃 요청을 보냅니다.
    } finally {
      setUser(null) // 요청 성공 여부와 관계없이 프론트 쪽 상태는 로그아웃으로 맞춰 둡니다.
    }
  }, [])

  const value: AuthContextValue = {
    user, // 현재 유저 정보를 컨텍스트 값에 넣습니다.
    isLoggedIn: !!user, // 유저 객체가 있으면 true, 없으면 false로 로그인 여부를 계산합니다.
    loading, // 초기 세션 확인 또는 상태 전환 중인지 나타냅니다.
    logout, // 로그아웃 함수를 함께 제공해서 어디서든 사용할 수 있게 합니다.
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  ) // 자식 컴포넌트들이 AuthContext를 읽을 수 있도록 Provider로 감싸서 렌더링합니다.
}

export function useAuth() {
  const ctx = useContext(AuthContext) // 가장 가까운 AuthContext.Provider가 제공한 값을 가져옵니다.
  if (!ctx) {
    throw new Error('useAuth 훅은 AuthProvider 안에서만 사용할 수 있습니다.') // Provider 밖에서 사용하면 명확한 에러를 던집니다.
  }
  return ctx // 컨텍스트 값을 그대로 반환해서 컴포넌트에서 사용할 수 있게 합니다.
}

