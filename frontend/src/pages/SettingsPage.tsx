// 설정 페이지 — /settings 직접 접근 시 표시
// 헤더 드롭다운 "설정" 메뉴를 통해 이동
// 내부 콘텐츠는 MySettingsTab 공통 컴포넌트를 재사용

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Settings } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import MySettingsTab from '../components/mypage/MySettingsTab'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { isLoggedIn, loading } = useAuth()

  // 비로그인 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/login', { replace: true })
    }
  }, [loading, isLoggedIn, navigate])

  // 인증 확인 중 로딩 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-up-sunken flex items-center justify-center relative z-[1]">
        <p className="text-sm text-ink-700">로딩 중...</p>
      </div>
    )
  }

  // 비로그인 상태 (리다이렉트 전 잠깐 표시)
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-up-sunken flex items-center justify-center relative z-[1]">
        <p className="text-sm text-ink-700">로그인이 필요합니다. 이동 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-up-sunken pb-24 relative z-[1]">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-30 bg-up-sunken border-b border-line">
        <div className="max-w-[640px] mx-auto px-4 h-14 flex items-center gap-2">
          {/* 뒤로가기 버튼 */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-11 h-11 -ml-2 rounded-md hover:bg-black/5 transition-colors"
            aria-label="뒤로가기"
          >
            <ChevronLeft className="w-5 h-5 text-ink-900" />
          </button>

          {/* 페이지 제목 */}
          <div className="flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-ink-600" />
            <h1 className="text-[17px] font-extrabold text-ink-900 tracking-tight">설정</h1>
          </div>
        </div>
      </header>

      {/* ── 설정 콘텐츠 (공통 컴포넌트 재사용) ── */}
      <main className="max-w-[640px] mx-auto px-4 pt-4 pb-6">
        <MySettingsTab />
      </main>

    </div>
  )
}
