// 상단 네비게이션 바 — 반응형 (2026 리디자인)
// - 데스크톱(md+): 가로 내비 — 로고 · 홈/채용/계산기/가이드/공지 · 고객센터 · 마이/로그인
// - 모바일(<md): 컴팩트 — 로고 + 고객센터 + 로그인/프로필 (하단 BottomNav가 메인 내비 역할)

import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, ChevronDown, LogOut, LayoutDashboard, Settings, Headphones } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// ── 데스크톱 가로 내비 링크 정의 ──
const NAV_LINKS = [
  { label: '홈',     path: '/home',       match: (p: string) => p === '/home' || p === '/' },
  { label: '채용',   path: '/jobs',       match: (p: string) => p === '/jobs' },
  { label: '계산기', path: '/calculator', match: (p: string) =>
      ['/calculator', '/severance', '/unemployment', '/weekly-allowance', '/annual-leave'].includes(p) },
  { label: '가이드', path: '/guide',      match: (p: string) => p.startsWith('/guide') },
  { label: '공지',   path: '/notices',    match: (p: string) => p === '/notices' },
]

export default function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoggedIn, loading, logout } = useAuth()

  // 드롭다운 열림/닫힘 상태
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 로그아웃 처리
  async function handleLogout() {
    setDropdownOpen(false)
    await logout()
    navigate('/home')
  }

  // 이니셜 아바타 배경색 (이름 첫 글자 기준 — 블루/그린/중립 계열만 사용)
  function getAvatarColor(name: string) {
    const colors = ['bg-brand', 'bg-accent', 'bg-ink-700']
    const idx = name.charCodeAt(0) % colors.length
    return colors[idx]
  }

  function getInitial(name: string) {
    return name.charAt(0).toUpperCase()
  }

  return (
    // 상단 고정 바: 흰 배경 + 토큰 보더 + z-50
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-line">
      <div className="w-full max-w-content mx-auto px-5 md:px-8 h-14 flex items-center justify-between gap-4">

        {/* ── 좌측: CATCH 로고 ── */}
        <button
          onClick={() => navigate('/home')}
          // min-h-[44px]: 로고 글자 높이(22px)만으로는 탭 영역이 작아 WCAG 2.2 최소 타깃(24px)에
          // 미달 → 세로 탭 영역만 44px로 확보(글자는 가운데 정렬되어 시각 위치 변화 없음)
          className="flex items-center gap-0.5 select-none flex-shrink-0 min-h-[44px]"
          aria-label="CATCH 홈으로 이동"
        >
          <span
            className="text-[22px] font-black tracking-tight leading-none"
            style={{
              background: 'linear-gradient(135deg, #3182F6 0%, #1B64DA 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            CATCH
          </span>
          <span className="w-1.5 h-1.5 rounded-full mb-3 ml-0.5 flex-shrink-0 bg-brand" />
        </button>

        {/* ── 중앙: 데스크톱 전용 가로 내비 (모바일 숨김) ── */}
        <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
          {NAV_LINKS.map(link => {
            const active = link.match(location.pathname)
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className={`px-3.5 h-9 rounded-md text-[15px] font-bold transition-colors ${
                  active ? 'text-brand bg-brand-bg' : 'text-ink-700 hover:text-ink-900 hover:bg-[#F2F4F6]'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </button>
            )
          })}
        </nav>

        {/* ── 우측: 고객센터(데스크톱) + 인증 상태 ── */}
        <div className="flex items-center gap-1.5 flex-shrink-0">

          {/* 고객센터 — 데스크톱에서만 텍스트 노출 */}
          <button
            onClick={() => navigate('/inquiry')}
            className="hidden md:flex items-center gap-1.5 px-3 h-9 rounded-md text-[14px] font-semibold text-ink-700 hover:bg-[#F2F4F6] transition-colors"
            aria-label="고객센터"
          >
            <Headphones size={16} />
            고객센터
          </button>

          {/* 초기 로딩 중: 스켈레톤 */}
          {loading ? (
            <div className="w-9 h-9 rounded-full bg-[#F2F4F6] animate-pulse" />
          ) : isLoggedIn && user ? (
            /* ── 로그인 상태: 아바타 + 드롭다운 ── */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 rounded-pill pl-1 pr-2 py-1 min-h-[44px] hover:bg-[#F2F4F6] transition-colors"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label="내 메뉴 열기"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-100"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-brand-100 ${getAvatarColor(user.name)}`}
                  >
                    {getInitial(user.name)}
                  </div>
                )}
                <span className="text-sm font-medium text-ink-700 max-w-[80px] truncate hidden sm:block">
                  {user.name}
                </span>
                <ChevronDown
                  size={14}
                  className={`text-ink-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* ── 드롭다운 메뉴 ── */}
              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-44 bg-white rounded-lg shadow-float border border-line overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-line">
                      <p className="text-xs text-ink-400 truncate">{user.email}</p>
                      <p className="text-sm font-semibold text-ink-900 truncate">{user.name}</p>
                    </div>
                    <button
                      onClick={() => { setDropdownOpen(false); navigate('/mypage') }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ink-700 hover:bg-[#F2F4F6] transition-colors"
                    >
                      <LayoutDashboard size={15} className="text-ink-400" />
                      마이페이지
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); navigate('/settings') }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-ink-700 hover:bg-[#F2F4F6] transition-colors border-t border-line"
                    >
                      <Settings size={15} className="text-ink-400" />
                      설정
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-danger hover:bg-danger/5 transition-colors border-t border-line"
                    >
                      <LogOut size={15} className="text-danger" />
                      로그아웃
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            /* ── 비로그인 상태: 로그인 버튼 ── */
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-pill text-sm font-semibold text-white bg-brand hover:bg-brand-strong transition-all active:scale-95"
            >
              <User size={14} />
              로그인
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
