// 하단 네비게이션 바 컴포넌트 (모바일 친화적 탭 네비게이션)
// - 아이콘 + 라벨 조합으로 현재 페이지 활성 표시
// - 탭: 홈 / 퇴직금 / 실업급여 / 마이페이지

import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Home, Briefcase, ShieldCheck, UserCircle2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// ── 탭 정의 ──
const NAV_TABS = [
  {
    id: 'home',
    label: '홈',
    icon: Home,
    path: '/home',
    // /home 경로일 때 활성화
    isActive: (pathname: string) => pathname === '/home',
  },
  {
    id: 'severance',
    label: '퇴직금',
    icon: Briefcase,
    path: '/severance',
    // /severance, /weekly-allowance, /annual-leave 포함 활성화
    isActive: (pathname: string) =>
      ['/severance', '/weekly-allowance', '/annual-leave'].includes(pathname),
  },
  {
    id: 'unemployment',
    label: '실업급여',
    icon: ShieldCheck,
    path: '/unemployment',
    // /unemployment 경로일 때 활성화
    isActive: (pathname: string) => pathname === '/unemployment',
  },
  {
    id: 'mypage',
    label: '마이페이지',
    icon: UserCircle2,
    path: '/mypage',
    // /mypage, /report/:id, /my-benefits 포함 활성화
    isActive: (pathname: string) =>
      pathname === '/mypage' ||
      pathname.startsWith('/report/') ||
      pathname === '/my-benefits',
  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn } = useAuth()

  // 탭 클릭 핸들러: 마이페이지는 비로그인 시 로그인 페이지로 리다이렉트
  function handleTabClick(tab: typeof NAV_TABS[number]) {
    if (tab.id === 'mypage' && !isLoggedIn) {
      navigate('/login')
      return
    }
    navigate(tab.path)
  }

  return (
    // 하단 고정 바: 흰 배경 + 상단 얇은 보더 + z-50
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} // iOS 홈 인디케이터 영역 대응
    >
      <div className="max-w-[460px] mx-auto flex items-stretch h-[60px]">
        {NAV_TABS.map((tab) => {
          const active = tab.isActive(location.pathname)
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-colors"
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* 활성화된 탭 아이콘 아래의 블루 인디케이터 점 */}
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] rounded-b-full"
                  style={{ background: '#3182F6' }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              {/* 아이콘 */}
              <motion.div
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.7}
                  style={{ color: active ? '#3182F6' : '#9CA3AF' }}
                />
              </motion.div>

              {/* 라벨 */}
              <span
                className="text-[10px] font-medium leading-none"
                style={{ color: active ? '#3182F6' : '#9CA3AF' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
