// 하단 네비게이션 바 컴포넌트 (모바일 + PC 모두 최적화)
// ─────────────────────────────────────────────────────────
// [개선 사항]
// 1. PC 뷰: max-width 500px로 제한 후 화면 중앙 정렬
//    (기존에는 좌측에 붙어서 보기 어려웠던 문제 해결)
// 2. 높이 56px → 64px로 늘려 터치 영역 및 시각적 안정감 향상
// 3. 아이콘 크기 18px → 22px, 텍스트 10px → 11px으로 키움
// 4. 각 탭 최소 너비 72px → 80px으로 늘려 클릭 영역 확대
// 5. 모바일에서는 전체 너비 사용, 6개 탭 동일 간격으로 배치

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
    // 현재 경로가 /home일 때 활성 상태
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
    // 마이페이지, 리포트 상세, 나의 혜택 모두 마이페이지 탭 활성화
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

  // 가로 스크롤 컨테이너 ref (활성 탭 중앙 스크롤에 사용)
  const scrollRef = useRef<HTMLDivElement>(null)
  // 각 탭 버튼 ref 배열
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // 경로가 바뀔 때마다 활성 탭이 스크롤 컨테이너 중앙에 오도록 자동 스크롤
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

  // 탭 클릭 핸들러: 마이페이지는 비로그인 시 로그인 페이지로 이동
  function handleTabClick(tab: (typeof NAV_TABS)[number]) {
    if (tab.id === 'mypage' && !isLoggedIn) {
      navigate('/login')
      return
    }
    navigate(tab.path)
  }

  return (
    // ── 바깥 고정 영역: 화면 하단에 붙되, 내부는 중앙 정렬 ──
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/97 backdrop-blur-md border-t border-gray-100"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} // iOS 홈 인디케이터 영역 대응
    >
      {/* ── 내부 래퍼: PC에서 최대 너비 500px로 중앙 정렬 ──
          모바일에서는 전체 너비 사용, PC에서는 가운데 배치 */}
      <div className="max-w-[500px] mx-auto">

        {/* ── 탭 스크롤 컨테이너 ──
            모바일에서 탭이 많으면 가로 스크롤 허용 (스크롤바 숨김)
            PC에서는 탭이 여유 있으므로 스크롤 없이 전체 배치 */}
        <div
          ref={scrollRef}
          className="flex overflow-x-auto hide-scrollbar"
          // 높이 64px: 기존 56px에서 키워 터치 영역과 시각적 무게감 향상
          style={{
            height: '64px',
            scrollbarWidth: 'none',         // Firefox 스크롤바 숨김
            msOverflowStyle: 'none',        // IE/Edge 스크롤바 숨김
          }}
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
                // minWidth 80px: 기존 72px에서 키워 터치 영역 확대
                // flex-1: PC에서 균등 분배
                style={{ minWidth: '80px', paddingLeft: '8px', paddingRight: '8px' }}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
              >
                {/* ── 활성 탭 상단 인디케이터 바 ──
                    framer-motion layoutId로 탭 전환 시 부드럽게 이동 */}
                {active && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-b-full"
                    style={{ background: '#3182F6' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                {/* ── 아이콘 ──
                    활성 탭은 1.1배 scale 애니메이션 + 파란색
                    비활성 탭은 회색 */}
                <motion.div
                  animate={{ scale: active ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  <Icon
                    size={22} // 기존 18px → 22px으로 키움
                    strokeWidth={active ? 2.2 : 1.7}
                    style={{ color: active ? '#3182F6' : '#9CA3AF' }}
                  />
                </motion.div>

                {/* ── 라벨 ──
                    11px: 기존 10px에서 1px 키워 가독성 향상
                    whitespace-nowrap: 줄바꿈 방지 */}
                <span
                  className="text-[11px] font-medium leading-none whitespace-nowrap mt-1"
                  style={{ color: active ? '#3182F6' : '#9CA3AF' }}
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
