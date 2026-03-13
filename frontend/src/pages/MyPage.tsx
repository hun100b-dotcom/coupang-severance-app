import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Settings, User, ChevronRight, FileText, Clock } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const CARD_CLASS =
  'bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-gray-100/50'

export default function MyPage() {
  const navigate = useNavigate()
  const { isLoggedIn, user, login, logout } = useAuth()
  const [loginLoading, setLoginLoading] = useState<'kakao' | 'google' | null>(null)
  const [kakaoNotify, setKakaoNotify] = useState(true)

  const handleLogin = async (provider: 'kakao' | 'google') => {
    setLoginLoading(provider)
    try {
      await login(provider)
    } finally {
      setLoginLoading(null)
    }
  }

  // 비로그인: 카카오/구글 로그인 두 스텝
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4 py-8 relative z-10">
        <div className="w-full max-w-[400px]">
          <div className="text-center mb-8">
            <h1 className="text-xl font-bold text-[#191F28] mb-2">내 정보</h1>
            <p className="text-sm text-[#4E5968]">로그인하면 D-Day와 진단 리포트를 볼 수 있어요</p>
          </div>
          <div className={`${CARD_CLASS} p-6`}>
            <p className="text-sm font-semibold text-[#191F28] mb-4">간편 로그인</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => handleLogin('kakao')}
                disabled={!!loginLoading}
                className="w-full h-12 rounded-full bg-[#FEE500] text-[#191600] flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <span className="w-5 h-5 rounded-md bg-[#191600] text-[#FEE500] flex items-center justify-center text-[10px] font-bold">
                  K
                </span>
                {loginLoading === 'kakao' ? '로그인 중...' : '카카오로 로그인'}
              </button>
              <button
                type="button"
                onClick={() => handleLogin('google')}
                disabled={!!loginLoading}
                className="w-full h-12 rounded-full bg-white text-[#191F28] border border-gray-200 flex items-center justify-center gap-2 text-sm font-semibold"
              >
                <span className="w-5 h-5 rounded-md border border-gray-300 flex items-center justify-center text-[10px] font-bold">
                  G
                </span>
                {loginLoading === 'google' ? '로그인 중...' : 'Google로 로그인'}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 w-full text-sm text-[#8B95A1]"
          >
            ← 홈으로
          </button>
        </div>
      </div>
    )
  }

  // 로그인 후: 대시보드
  return (
    <div className="min-h-screen bg-[#F2F4F6] pb-8 relative z-10">
      {/* 헤더: bg-[#F2F4F6]/90, backdrop-blur-xl, sticky, z-30 */}
      <header
        className="sticky top-0 z-30 bg-[#F2F4F6]/90 backdrop-blur-xl border-b border-gray-200/50"
      >
        <div className="max-w-[460px] mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#191F28]">내 정보</h1>
          <div className="flex items-center gap-3">
            <button type="button" className="relative p-1.5 text-[#4E5968]">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
            </button>
            <button type="button" className="p-1.5 text-[#4E5968]">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[460px] mx-auto px-4 pt-4 space-y-4">
        {/* 프로필 */}
        <button
          type="button"
          className={`${CARD_CLASS} w-full p-4 flex items-center gap-3 text-left`}
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-500" />
            </div>
            <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 rounded-full bg-[#FEE500] flex items-center justify-center text-[9px] font-bold text-[#191600]">
              K
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[#191F28] truncate">{user?.name ?? '사용자'}</p>
            <p className="text-xs text-[#8B95A1]">내 정보 수정</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
        </button>

        {/* CATCH D-Day 카드 */}
        <div className={`${CARD_CLASS} p-5`}>
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-bold text-[#3182F6] bg-blue-50 px-2.5 py-1 rounded-full">
              CATCH D-Day
            </span>
            <Clock className="w-5 h-5 text-[#3182F6]" />
          </div>
          <p className="text-[#191F28] text-sm mb-0.5">퇴직금 요건 달성까지</p>
          <p className="text-[#3182F6] font-extrabold text-xl mb-4">120일 남았어요!</p>
          <div className="flex justify-between text-xs text-[#8B95A1] mb-1">
            <span>67% 완료</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full w-[67%] rounded-full bg-gradient-to-r from-blue-400 to-[#3182F6] relative">
              <div className="absolute right-0 inset-y-0 w-8 bg-white/30 rounded-r-full" />
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#8B95A1]">
            <span>첫 출근</span>
            <span>24.08</span>
          </div>
        </div>

        {/* 내 진단 리포트 */}
        <div className={`${CARD_CLASS} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-[#191F28]">내 진단 리포트</h2>
            <button type="button" className="text-sm text-[#8B95A1]">
              전체보기
            </button>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 py-2">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#191F28] truncate">쿠팡풀필먼트서비스</p>
                <p className="text-xs text-[#8B95A1]">26.03.14 진단 완료</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </li>
            <li className="flex items-center gap-3 py-2">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[#191F28] truncate">컬리 물류센터</p>
                <p className="text-xs text-[#3182F6] font-medium">대상자 확정 (249만 원)</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </li>
          </ul>
          <button
            type="button"
            onClick={() => navigate('/severance')}
            className="w-full mt-3 py-3 text-sm font-semibold text-[#3182F6] border border-[#3182F6]/30 rounded-xl hover:bg-blue-50/50"
          >
            + 새 근무 기록 진단하기
          </button>
        </div>

        {/* CATCH PRO 배너 */}
        <div
          className={`rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-gray-100/50 overflow-hidden bg-gradient-to-br from-[#1c1c1e] via-[#2c2c2e] to-[#1c1c1e] p-5 relative`}
        >
          <p className="text-[#E5D88A] text-xs font-bold mb-2">★ CATCH PRO</p>
          <p className="text-white font-bold text-base mb-1">퇴직금 청구, 막막하신가요?</p>
          <p className="text-white/90 text-sm mb-2">전문 노무사가 도와드립니다.</p>
          <p className="text-white/70 text-xs">서류 준비부터 진정 접수까지 한 번에</p>
        </div>

        {/* 카카오톡 알림 */}
        <div className={`${CARD_CLASS} p-4 flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3 min-w-0">
            <Bell className="w-5 h-5 text-gray-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-[#191F28]">카카오톡 알림 받기</p>
              <p className="text-xs text-[#8B95A1]">목표 달성 시 제일 먼저 알려드려요</p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={kakaoNotify}
            onClick={() => setKakaoNotify(v => !v)}
            className={`relative w-11 h-6 rounded-full flex-shrink-0 transition-colors ${kakaoNotify ? 'bg-[#3182F6]' : 'bg-gray-200'}`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${kakaoNotify ? 'left-6 translate-x-[-100%]' : 'left-1'}`}
            />
          </button>
        </div>

        <button
          type="button"
          onClick={logout}
          className="w-full py-2 text-sm text-[#8B95A1]"
        >
          로그아웃
        </button>
      </div>
    </div>
  )
}
