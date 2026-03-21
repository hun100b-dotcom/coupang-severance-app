// 상단 네비게이션 바 컴포넌트
// - 좌측: CATCH 텍스트 로고 (클릭 시 /home으로 이동)
// - 우측: 로그인 상태에 따라 "로그인" 버튼 또는 프로필 아바타 + 드롭다운

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { User, ChevronDown, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function TopNav() {
  const navigate = useNavigate()
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

  // 이니셜 아바타 배경색 (이름 첫 글자 기준으로 일관된 색상 계산)
  function getAvatarColor(name: string) {
    const colors = [
      'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
      'bg-rose-500', 'bg-amber-500', 'bg-cyan-500',
    ]
    const idx = name.charCodeAt(0) % colors.length
    return colors[idx]
  }

  // 이름에서 이니셜 추출 (한국어는 첫 글자, 영어는 이니셜)
  function getInitial(name: string) {
    return name.charAt(0).toUpperCase()
  }

  return (
    // 상단 고정 바: 흰 배경 + 하단 얇은 보더 + z-50으로 항상 최상위
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-[460px] mx-auto px-4 h-14 flex items-center justify-between">

        {/* ── 좌측: CATCH 텍스트 로고 ── */}
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-0.5 select-none"
          aria-label="CATCH 홈으로 이동"
        >
          {/* 브랜드 텍스트: 굵은 폰트 + 파란색 강조 + 살짝 기울여 개성 부여 */}
          <span
            className="text-[22px] font-black tracking-tight leading-none"
            style={{
              background: 'linear-gradient(135deg, #3182F6 0%, #1a56d6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            CATCH
          </span>
          {/* 브랜드 포인트 점: 로고 옆에 파란 소형 점 */}
          <span
            className="w-1.5 h-1.5 rounded-full mb-3 ml-0.5 flex-shrink-0"
            style={{ background: '#3182F6' }}
          />
        </button>

        {/* ── 우측: 인증 상태에 따른 UI ── */}
        <div className="flex items-center">

          {/* 초기 로딩 중: 스켈레톤으로 레이아웃 튐 방지 */}
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          ) : isLoggedIn && user ? (
            /* ── 로그인 상태: 아바타 + 드롭다운 ── */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-gray-50 transition-colors"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                {/* 프로필 아바타: 이미지가 있으면 이미지, 없으면 이니셜 */}
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-100"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-blue-100 ${getAvatarColor(user.name)}`}
                  >
                    {getInitial(user.name)}
                  </div>
                )}

                {/* 이름 간이 표시 (화면 좁을 경우 최대 80px 제한) */}
                <span className="text-sm font-medium text-gray-700 max-w-[80px] truncate hidden xs:block">
                  {user.name}
                </span>

                {/* 드롭다운 화살표 아이콘 */}
                <ChevronDown
                  size={14}
                  className={`text-gray-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
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
                    className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
                  >
                    {/* 유저 정보 헤더 */}
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{user.name}</p>
                    </div>

                    {/* 마이페이지 이동 */}
                    <button
                      onClick={() => { setDropdownOpen(false); navigate('/mypage') }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <LayoutDashboard size={15} className="text-gray-400" />
                      마이페이지
                    </button>

                    {/* 로그아웃 */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-gray-50"
                    >
                      <LogOut size={15} className="text-red-400" />
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #3182F6, #1a56d6)' }}
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
