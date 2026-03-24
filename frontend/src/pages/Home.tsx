import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { User, Headphones, HelpCircle, ChevronRight, Building2, Calendar, Gift } from 'lucide-react'
import { getClickCount, registerClick } from '../lib/api'
import { INTRO_COPIES } from '../lib/constants'
import { useAuth } from '../contexts/AuthContext'
import WhyCatchModal from '../components/WhyCatchModal'
import CustomerService from '../components/CustomerService'
import NoticesBanner from '../components/NoticesBanner'
import { useNotices } from '../hooks/useNotices'

// ── count-up hook: 0에서 target까지 부드러운 카운트업 ──
function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (target <= 0 || started.current) return
    started.current = true
    const start = performance.now()
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out-quart
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])

  return value
}

// ── CATCH 브랜드 텍스트 하이라이트 ──
function HighlightCatch({ text }: { text: string }) {
  const parts = text.split(/(CATCH)/g)
  return (
    <>
      {parts.map((part, i) =>
        part === 'CATCH' ? (
          <span key={i} className="text-[#3182F6] font-bold drop-shadow-sm">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ── 카드 입장 애니메이션 설정 ──
const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

export default function Home() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const { notices } = useNotices()
  const [count, setCount] = useState(0)
  const [countLoaded, setCountLoaded] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [csOpen, setCsOpen] = useState(false)
  const [copyIdx, setCopyIdx] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const animatedCount = useCountUp(count)

  // 스크롤 감지 → 헤더 글래스모피즘
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 누적 카운트 조회
  useEffect(() => {
    getClickCount()
      .then(d => {
        const total = d?.total
        if (typeof total === 'number') { setCount(total); setCountLoaded(true) }
      })
      .catch(() => {})
  }, [])

  // 7초 간격 카피 슬라이드
  useEffect(() => {
    const timer = setInterval(() => {
      setCopyIdx(i => (i + 1) % INTRO_COPIES.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [])

  const trackAndNavigate = useCallback(async (
    service: 'severance' | 'unemployment' | 'weekly_allowance' | 'annual_leave' | 'benefits',
    path: string
  ) => {
    setCount(c => c + 1)
    try { registerClick(service) } catch { /* 무시 */ }
    navigate(path)
  }, [navigate])

  const handleSeverance    = useCallback(() => trackAndNavigate('severance',       '/severance'),       [trackAndNavigate])
  const handleUnemployment = useCallback(() => trackAndNavigate('unemployment',    '/unemployment'),    [trackAndNavigate])
  const handleWeekly       = useCallback(() => trackAndNavigate('weekly_allowance','/weekly-allowance'),[trackAndNavigate])
  const handleAnnual       = useCallback(() => trackAndNavigate('annual_leave',    '/annual-leave'),    [trackAndNavigate])
  const handleBenefits     = useCallback(() => trackAndNavigate('benefits',        '/my-benefits'),     [trackAndNavigate])

  const mainCopy = INTRO_COPIES[copyIdx]
  const lines = mainCopy.split('\n')

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-8">
      {/* ── 글래스모피즘 스티키 헤더 ── */}
      <header
        className={`sticky top-0 z-30 w-full max-w-[460px] grid grid-cols-3 items-center gap-2 py-3 pb-4 transition-all duration-300 ${
          scrolled
            ? 'bg-white/70 backdrop-blur-2xl border-b border-white/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-b-2xl -mx-2 px-4'
            : 'bg-transparent'
        }`}
      >
        <div className="col-span-1 flex justify-start min-w-0">
          <button
            type="button"
            onClick={() => setCsOpen(true)}
            className="flex items-center gap-1 text-sm text-[#4E5968] hover:text-[#191F28] font-medium font-sans active:scale-95 transition-transform"
            aria-label="고객센터"
          >
            <Headphones className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">고객센터</span>
          </button>
        </div>
        <div className="col-span-1 flex justify-center min-w-0">
          <button
            type="button"
            onClick={() => setWhyOpen(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/40 backdrop-blur-md border border-white/60 text-[#3182F6] text-xs sm:text-sm font-medium hover:bg-white/50 font-sans active:scale-95 transition-transform"
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">왜 CATCH인가요?</span>
          </button>
        </div>
        <div className="col-span-1 flex justify-end items-center gap-2 min-w-0">
          {isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/mypage')}
                className="flex items-center gap-1 text-sm text-[#4E5968] hover:text-[#191F28] font-medium font-sans active:scale-95 transition-transform"
                aria-label="마이페이지"
              >
                <span className="truncate">마이페이지</span>
                <User className="w-4 h-4 flex-shrink-0" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex items-center gap-1 text-sm text-[#4E5968] hover:text-[#191F28] font-medium font-sans active:scale-95 transition-transform"
              aria-label="로그인"
            >
              <span className="truncate">로그인</span>
              <User className="w-4 h-4 flex-shrink-0" />
            </button>
          )}
        </div>
      </header>

      <div className="w-full max-w-[460px] flex flex-col gap-4 flex-1">
        {/* ── 공지사항 배너 ── */}
        <NoticesBanner notices={notices} />

        {/* ── 메인 히어로 카드 ── */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-[32px] p-6 bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.06)]"
        >
          <div className="text-center mb-5">
            <motion.div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#3182F6] overflow-hidden mb-3 shadow-lg shadow-blue-500/30"
              whileHover={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.5 }}
            >
              <img src="/catch-logo.png" alt="CATCH" className="w-full h-full object-contain p-1.5" />
            </motion.div>
            <p className="text-xl font-black text-[#1a73e8] tracking-tight mb-1">CATCH</p>
            <p className="text-xs font-semibold text-[#8B95A1] tracking-wide">
              퇴직금 · 실업급여 자동계산
            </p>
          </div>
          <div className="min-h-[4.5rem] flex flex-col justify-center items-center mb-4 overflow-hidden relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={copyIdx}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="text-center text-[#191F28] text-[clamp(22px,5.5vw,26px)] font-extrabold leading-[1.3] tracking-tighter font-sans"
              >
                {lines.map((line, i) => (
                  <span key={i}>
                    <HighlightCatch text={line} />
                    {i < lines.length - 1 && <br />}
                  </span>
                ))}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* 누적 카운트 — 카운트업 애니메이션 */}
          <div className="text-center py-3 px-4 rounded-xl bg-blue-50/80">
            {!countLoaded ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-[120px] h-5 rounded-lg bg-gray-200/60 animate-pulse" />
              </div>
            ) : (
              <p className="text-sm text-[#4E5968]">
                지금까지{' '}
                <span className="text-[#3182F6] font-extrabold text-lg num-countup">
                  {animatedCount.toLocaleString()}명
                </span>
                이 확인했어요
              </p>
            )}
          </div>
        </motion.div>

        {/* ── 파란 CTA: 내 퇴직금 캐치하기 ── */}
        <motion.button
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          type="button"
          onClick={handleSeverance}
          className="group w-full rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-blue-200/50 bg-gradient-to-br from-[#3182F6] to-[#2563eb] p-4 flex items-center gap-3 text-left relative overflow-hidden"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* 시머 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer bg-[length:200%_100%] pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src="/catch-logo.png" alt="" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">내 퇴직금 캐치하기</p>
            <p className="text-white/90 text-sm">가장 많이 찾는 서비스</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </motion.button>

        {/* ── 서브 카드 4개 그리드 ── */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-3"
        >
          {[
            { label: '실업급여', sub: '수급 자격 확인', icon: Building2, color: 'text-slate-500', bg: 'bg-slate-100', onClick: handleUnemployment },
            { label: '주휴수당', sub: '이번 주 얼마일까?', icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50', onClick: handleWeekly },
            { label: '연차수당', sub: '남은 연차 정산', icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-50', onClick: handleAnnual },
            { label: '나의 혜택', sub: '숨은 지원금 찾기', icon: Gift, color: 'text-violet-500', bg: 'bg-violet-50', onClick: handleBenefits },
          ].map((card, i) => (
            <motion.button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className="rounded-[32px] p-4 flex flex-col items-start text-left bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.05)]"
              whileHover={{ y: -3, boxShadow: '0 16px 48px rgba(49,130,246,0.12)' }}
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-2`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="font-semibold text-[#191F28] text-sm">{card.label}</p>
              <p className="text-xs text-[#8B95A1] mt-0.5">{card.sub}</p>
            </motion.button>
          ))}
        </motion.div>

        {/* ── 하단 트러스트 바 ── */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-[32px] px-4 py-3 flex items-center justify-around gap-2 bg-white/40 backdrop-blur-lg border border-white/50 shadow-[0_8px_32px_rgba(49,130,246,0.04)]"
        >
          {[
            { emoji: '⚡', title: '1분 만에', sub: '간단 계산' },
            { emoji: '🔒', title: '안전하게', sub: '개인정보 보호' },
            { emoji: '📄', title: 'PDF 파일', sub: '정밀 분석' },
          ].map((item, i) => (
            <div key={item.title} className="flex items-center gap-2 min-w-0">
              {i > 0 && <div className="w-px h-8 bg-white/60 mr-2" />}
              <span className="text-xl">{item.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-[#191F28] leading-tight">{item.title}</p>
                <p className="text-[10px] text-[#8B95A1] leading-tight">{item.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── 푸터 ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-[10px] font-light text-gray-400 leading-relaxed mt-2"
        >
          © 2026 CATCH by LEAF-MASTER. All rights reserved.
          <br />
          <span className="text-[9px]">이 결과는 참고용이에요. 정확한 금액은 노무사 상담을 받으세요.</span>
        </motion.p>
      </div>

      <AnimatePresence>
        {whyOpen && <WhyCatchModal onClose={() => setWhyOpen(false)} />}
      </AnimatePresence>
      <CustomerService isOpen={csOpen} onClose={() => setCsOpen(false)} />
    </div>
  )
}
