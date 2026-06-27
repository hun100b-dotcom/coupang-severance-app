// 하단 네비게이션 바 — 5탭 구조
// 홈(퇴직금 중심) | 채용정보 | 계산기 | 공지사항 | 마이페이지
import { useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Home,
  Search,
  Calculator,
  Megaphone,
  UserCircle2,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// ── 5탭 정의 ──
const NAV_TABS = [
  {
    id: 'home',
    label: '홈',
    icon: Home,
    path: '/home',
    isActive: (p: string) => p === '/home',
  },
  {
    id: 'jobs',
    label: '채용정보',
    icon: Search,
    path: '/jobs',
    isActive: (p: string) => p === '/jobs',
  },
  {
    id: 'calculator',
    label: '계산기',
    icon: Calculator,
    path: '/calculator',
    // 계산기 허브 + 각 계산기 페이지 모두 이 탭 활성화
    isActive: (p: string) =>
      p === '/calculator' ||
      p === '/severance' ||
      p === '/unemployment' ||
      p === '/weekly-allowance' ||
      p === '/annual-leave',
  },
  {
    id: 'notices',
    label: '공지사항',
    icon: Megaphone,
    path: '/notices',
    isActive: (p: string) => p === '/notices',
  },
  {
    id: 'mypage',
    label: '마이페이지',
    icon: UserCircle2,
    path: '/mypage',
    isActive: (p: string) =>
      p === '/mypage' ||
      p.startsWith('/report/') ||
      p === '/my-benefits',
  },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn } = useAuth()

  // 가로 스크롤 컨테이너 ref (활성 탭 중앙 스크롤에 사용)
  const scrollRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // 경로 변경 시 활성 탭 중앙 스크롤
  useEffect(() => {
    const activeIndex = NAV_TABS.findIndex((tab) => tab.isActive(location.pathname))
    if (activeIndex === -1) return
    const tabEl = tabRefs.current[activeIndex]
    const scrollEl = scrollRef.current
    if (!tabEl || !scrollEl) return
    const targetLeft = tabEl.offsetLeft - scrollEl.clientWidth / 2 + tabEl.clientWidth / 2
    scrollEl.scrollTo({ left: targetLeft, behavior: 'smooth' })
  }, [location.pathname])

  // 탭 클릭 핸들러
  function handleTabClick(tab: (typeof NAV_TABS)[number]) {
    if (tab.id === 'mypage' && !isLoggedIn) {
      navigate('/login')
      return
    }
    navigate(tab.path)
  }

  return (
    <nav
      // 데스크톱(md+)은 상단 가로 내비(TopNav)가 메인이므로 하단탭 숨김
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/97 backdrop-blur-md border-t border-line"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-[500px] mx-auto">
        <div
          ref={scrollRef}
          className="flex overflow-x-auto hide-scrollbar"
          style={{ height: '64px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {NAV_TABS.map((tab, index) => {
            const active = tab.isActive(location.pathname)
            const Icon = tab.icon

            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[index] = el }}
                onClick={() => handleTabClick(tab)}
                className="flex flex-col items-center justify-center relative transition-colors flex-shrink-0 flex-1"
                style={{ minWidth: '72px', paddingLeft: '6px', paddingRight: '6px' }}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
                {/* 활성 인디케이터 */}
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
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
                    style={{ color: active ? '#3182F6' : '#6B7280' }}
                  />
                </motion.div>

                {/* 라벨 */}
                <span
                  className="text-[11px] font-medium leading-none whitespace-nowrap mt-1"
                  style={{ color: active ? '#3182F6' : '#6B7280' }}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
