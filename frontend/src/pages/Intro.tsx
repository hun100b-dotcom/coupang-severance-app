import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { User, Headphones, HelpCircle, ChevronRight, Building2, Calendar, Gift } from 'lucide-react'
import { getClickCount, registerClick } from '../lib/api'
import { INTRO_COPIES } from '../lib/constants'
import { useAuth } from '../contexts/AuthContext'
import WhyCatchModal from '../components/WhyCatchModal'
import CustomerService from '../components/CustomerService'

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

export default function Intro() {
  const navigate = useNavigate()
  const { isLoggedIn, logout } = useAuth()
  const [count, setCount] = useState(0)
  const [whyOpen, setWhyOpen] = useState(false)
  const [csOpen, setCsOpen] = useState(false)
  const [copyIdx, setCopyIdx] = useState(0)

  useEffect(() => {
    getClickCount()
      .then(d => {
        const total = d?.total
        if (typeof total === 'number') setCount(total)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setCopyIdx(i => (i + 1) % INTRO_COPIES.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [])

  const handleSeverance = useCallback(async () => {
    try {
      await registerClick('severance')
    } catch {
      /* 무시 */
    }
    setCount(c => c + 1)
    navigate('/severance')
  }, [navigate])

  const handleUnemployment = useCallback(() => {
    navigate('/unemployment')
  }, [navigate])

  const mainCopy = INTRO_COPIES[copyIdx]
  const lines = mainCopy.split('\n')

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-8">
      {/* 헤더: grid 3열 반응형 — 좌/중/우 겹침 없음, 배경 투명 */}
      <header className="sticky top-0 z-30 w-full max-w-[460px] grid grid-cols-3 items-center gap-2 py-3 pb-4 bg-transparent">
        <div className="col-span-1 flex justify-start min-w-0">
          <button
            type="button"
            onClick={() => setCsOpen(true)}
            className="flex items-center gap-1 text-sm text-[#4E5968] hover:text-[#191F28] font-medium font-sans"
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
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/40 backdrop-blur-md border border-white/60 text-[#3182F6] text-xs sm:text-sm font-medium hover:bg-white/50 font-sans"
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
                className="flex items-center gap-1 text-sm text-[#4E5968] hover:text-[#191F28] font-medium font-sans"
                aria-label="마이페이지"
              >
                <span className="truncate">마이페이지</span>
                <User className="w-4 h-4 flex-shrink-0" />
              </button>
              <button
                type="button"
                onClick={() => logout()}
                className="text-sm text-[#8B95A1] hover:text-[#191F28] font-medium font-sans"
                aria-label="로그아웃"
              >
                로그아웃
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex items-center gap-1 text-sm text-[#4E5968] hover:text-[#191F28] font-medium font-sans"
              aria-label="로그인"
            >
              <span className="truncate">로그인</span>
              <User className="w-4 h-4 flex-shrink-0" />
            </button>
          )}
        </div>
      </header>

      <div className="w-full max-w-[460px] flex flex-col gap-4 flex-1">
        {/* 메인 카드: 글래스 bg-white/60 + backdrop-blur-xl */}
        <div className="rounded-[32px] p-6 bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.06)]">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#3182F6] overflow-hidden mb-3 shadow-lg shadow-blue-500/30">
              <img src="/catch-logo.png" alt="CATCH" className="w-full h-full object-contain p-1.5" />
            </div>
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
                className="text-center text-[#191F28] text-[26px] font-extrabold leading-[1.3] tracking-tighter font-sans"
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
          <div className="text-center py-3 px-4 rounded-xl bg-blue-50/80">
            <p className="text-sm text-[#4E5968]">
              지금까지{' '}
              <span className="text-[#3182F6] font-extrabold text-base">
                {count.toLocaleString()}명
              </span>
              이 확인했어요
            </p>
          </div>
        </div>

        {/* 파란 CTA 카드 — 내 퇴직금 캐치하기 */}
        <button
          type="button"
          onClick={handleSeverance}
          className="w-full rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-blue-200/50 bg-gradient-to-br from-[#3182F6] to-[#2563eb] p-4 flex items-center gap-3 text-left hover:opacity-95 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src="/catch-logo.png" alt="" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">내 퇴직금 캐치하기</p>
            <p className="text-white/90 text-sm">가장 많이 찾는 서비스</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white flex-shrink-0" />
        </button>

        {/* 서브 카드 4개: bg-white/50 backdrop-blur-md border border-white/60 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleUnemployment}
            className="rounded-[32px] p-4 flex flex-col items-start text-left bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.05)]"
          >
            <Building2 className="w-8 h-8 text-slate-500 mb-2" />
            <p className="font-semibold text-[#191F28] text-sm">실업급여</p>
            <p className="text-xs text-[#8B95A1] mt-0.5">수급 자격 확인</p>
          </button>
          <button
            type="button"
            className="rounded-[32px] p-4 flex flex-col items-start text-left bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.05)]"
          >
            <Calendar className="w-8 h-8 text-emerald-600 mb-2" />
            <p className="font-semibold text-[#191F28] text-sm">주휴수당</p>
            <p className="text-xs text-[#8B95A1] mt-0.5">이번 주 얼마일까?</p>
          </button>
          <button
            type="button"
            className="rounded-[32px] p-4 flex flex-col items-start text-left bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.05)]"
          >
            <Calendar className="w-8 h-8 text-amber-500 mb-2" />
            <p className="font-semibold text-[#191F28] text-sm">연차수당</p>
            <p className="text-xs text-[#8B95A1] mt-0.5">남은 연차 정산</p>
          </button>
          <button
            type="button"
            onClick={() => navigate('/mypage')}
            className="rounded-[32px] p-4 flex flex-col items-start text-left bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.05)]"
          >
            <Gift className="w-8 h-8 text-violet-500 mb-2" />
            <p className="font-semibold text-[#191F28] text-sm">나의 혜택</p>
            <p className="text-xs text-[#8B95A1] mt-0.5">숨은 지원금 찾기</p>
          </button>
        </div>

        {/* 하단 트러스트 바: bg-white/40 backdrop-blur-lg border border-white/50 */}
        <div className="rounded-[32px] px-4 py-3 flex items-center justify-around gap-2 bg-white/40 backdrop-blur-lg border border-white/50 shadow-[0_8px_32px_rgba(49,130,246,0.04)]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">⚡</span>
            <div>
              <p className="text-xs font-semibold text-[#191F28] leading-tight">1분 만에</p>
              <p className="text-[10px] text-[#8B95A1] leading-tight">간단 계산</p>
            </div>
          </div>
          <div className="w-px h-8 bg-white/60" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-xs font-semibold text-[#191F28] leading-tight">안전하게</p>
              <p className="text-[10px] text-[#8B95A1] leading-tight">개인정보 보호</p>
            </div>
          </div>
          <div className="w-px h-8 bg-white/60" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">📄</span>
            <div>
              <p className="text-xs font-semibold text-[#191F28] leading-tight">PDF 파일</p>
              <p className="text-[10px] text-[#8B95A1] leading-tight">정밀 분석</p>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <p className="text-center text-[10px] font-light text-gray-400 leading-relaxed mt-2">
          © 2026 CATCH by LEAF-MASTER. All rights reserved.
          <br />
          <span className="text-[9px]">이 결과는 참고용이에요. 정확한 금액은 노무사 상담을 받으세요.</span>
        </p>
      </div>

      <AnimatePresence>
        {whyOpen && <WhyCatchModal onClose={() => setWhyOpen(false)} />}
      </AnimatePresence>
      <CustomerService isOpen={csOpen} onClose={() => setCsOpen(false)} />
    </div>
  )
}
