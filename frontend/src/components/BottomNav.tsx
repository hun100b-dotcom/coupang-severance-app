// 하단 네비게이션 바 컴포넌트 (모바일 친화적 탭 네비게이션)
// - 좌우 스크롤 가능한 6개 탭
// - 탭: 홈 / 퇴직금 / 실업급여 / 연차수당 / 주휴수당 / 마이페이지
// - 활성 탭은 파란색 + 상단 인디케이터 바
// - 활성 탭이 항상 화면 중앙으로 스크롤되도록 처리

import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home,
  Briefcase,
  ShieldCheck,
  CalendarDays,
  Clock,
  UserCircle2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// ── 탭 정의 (순서대로 렌더링됨) ──
const NAV_TABS = [
  {
    id: 'home',
    label: '홈',
    icon: Home,
    path: '/home',
    isActive: (pathname: string) => pathname === '/home',
  },
  {
    id: 'severance',
    label: '퇴직금',
    icon: Briefcase,
    path: '/severance',
    isActive: (pathname: string) => pathname === '/severance',
  },
  {
    id: 'unemployment',
    label: '실업급여',
    icon: ShieldCheck,
    path: '/unemployment',
    isActive: (pathname: string) => pathname === '/unemployment',
  },
  {
    id: 'annual-leave',
    label: '연차수당',
    icon: CalendarDays,
    path: '/annual-leave',
    isActive: (pathname: string) => pathname === '/annual-leave',
  },
  {
    id: 'weekly-allowance',
    label: '주휴수당',
    icon: Clock,
    path: '/weekly-allowance',
    isActive: (pathname: string) => pathname === '/weekly-allowance',
  },
  {
    id: 'mypage',
    label: '마이페이지',
    icon: UserCircle2,
    path: '/mypage',
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

  // 스크롤 컨테이너 ref
  const scrollRef = useRef<HTMLDivElement>(null)
  // 각 탭 버튼 ref (활성 탭 스크롤 계산에 사용)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // 경로가 바뀔 때마다 활성 탭을 스크롤 컨테이너 중앙으로 이동
  useEffect(() => {
    const activeIndex = NAV_TABS.findIndex((tab) => tab.isActive(location.pathname))
    if (activeIndex === -1) return

    const tabEl = tabRefs.current[activeIndex]
    const scrollEl = scrollRef.current
    if (!tabEl || !scrollEl) return

    // 활성 탭의 중심이 스크롤 컨테이너 중앙에 오도록 scrollLeft 계산
    const targetLeft =
      tabEl.offsetLeft - scrollEl.clientWidth / 2 + tabEl.clientWidth / 2

    scrollEl.scrollTo({ left: targetLeft, behavior: 'smooth' })
  }, [location.pathname])

  // 탭 클릭: 마이페이지는 비로그인 시 로그인 페이지로 이동
  function handleTabClick(tab: (typeof NAV_TABS)[number]) {
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
      {/* 가로 스크롤 컨테이너 — 스크롤바 숨김 */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto h-[56px] justify-start hide-scrollbar"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // 스크롤바 숨김
      >
        {NAV_TABS.map((tab, index) => {
          const active = tab.isActive(location.pathname)
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[index] = el }}
              onClick={() => handleTabClick(tab)}
              className="flex flex-col items-center justify-center relative transition-colors flex-shrink-0"
              style={{ minWidth: '72px', paddingLeft: '12px', paddingRight: '12px' }}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              {/* 활성 탭 상단 인디케이터 바 */}
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-b-full"
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
                  size={18}
                  strokeWidth={active ? 2.2 : 1.7}
                  style={{ color: active ? '#3182F6' : '#9CA3AF' }}
                />
              </motion.div>

              {/* 라벨 — 긴 텍스트도 잘리지 않도록 whitespace-nowrap */}
              <span
                className="text-[10px] font-medium leading-none whitespace-nowrap mt-0.5"
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
