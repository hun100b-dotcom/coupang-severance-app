/**
 * 로그인 필요 라우트 보호
 * - 로그인되지 않은 경우 "로그인이 필요한 서비스입니다" 안내와 함께 마이페이지(로그인 유도 화면)로 리다이렉트합니다.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoggedIn, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#3182F6] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/mypage"
        state={{ from: location.pathname, message: '로그인이 필요한 서비스입니다' }}
        replace
      />
    )
  }

  return <>{children}</>
}
