// 온보딩 미완료 사용자를 /onboarding으로 리다이렉트하는 가드
// 로그인된 사용자가 온보딩을 완료하지 않았으면 어떤 페이지든 온보딩으로 이동

import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { isLoggedIn, loading, needsOnboarding } = useAuth()

  if (loading) return <>{children}</>

  // 로그인 + 온보딩 미완료 → 온보딩 페이지로 강제 이동
  if (isLoggedIn && needsOnboarding) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}
