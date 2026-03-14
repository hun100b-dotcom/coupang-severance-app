import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { User, Headphones, HelpCircle, ChevronRight, Building2, Calendar, Gift } from 'lucide-react'
import { getClickCount, registerClick } from '../lib/api'
import { INTRO_COPIES } from '../lib/constants'
import WhyCatchModal from '../components/WhyCatchModal'

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
  const [count, setCount] = useState(0)
  const [whyOpen, setWhyOpen] = useState(false)
  const [copyIdx, setCopyIdx] = useState(0)

  useEffect(() => {
    getClickCount().then(d => setCount(d.total)).catch(() => {})
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
      {/* 헤더: 배경 투명 — 애니메이션 배경이 상단까지 보이도록 */}
      <header className="sticky top-0 z-30 w-full max-w-[460px] flex items-center justify-between py-3 bg-transparent">
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-[#4E5968] hover:text-[#191F28]"
          aria-label="고객센터"
        >
          <Headphones className="w-4 h-4" />
          <span>고객센터</span>
        </button>
        <button
          type="button"
          onClick={() => setWhyOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/40 backdrop-blur-md border border-white/60 text-[#3182F6] text-sm font-medium hover:bg-white/50"
        >
          <HelpCircle className="w-4 h-4" />
          <span>왜 CATCH인가요?</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/mypage')}
          className="flex items-center gap-1.5 text-sm text-[#4E5968] hover:text-[#191F28]"
          aria-label="마이페이지"
        >
          <span className="font-medium">My</span>
          <User className="w-5 h-5" />
        </button>
      </header>

      <div className="w-full max-w-[460px] flex flex-col gap-4 flex-1">
        {/* 메인 카드: 글래스 bg-white/60 + backdrop-blur-xl */}
        <div className="rounded-[32px] p-6 bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.06)]">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#3182F6] text-white text-2xl mb-3 shadow-lg shadow-blue-500/30">
              🔍
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
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="text-center text-[#191F28] text-[26px] font-extrabold leading-[1.3] tracking-tighter"
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
          <span className="text-2xl">🔍</span>
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
    </div>
  )
}
