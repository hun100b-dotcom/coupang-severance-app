import { useEffect, useMemo, useState, type ComponentType } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Headphones, HelpCircle, MessageSquare, ShieldCheck, Wallet } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import WhyCatchModal from '../components/WhyCatchModal'
import CustomerService from '../components/CustomerService'

// 이 인트로에서 보여줄 “카운팅” 목표 금액입니다.
const TARGET_WON = 3542000
const COUNT_DURATION_MS = 2000

/**
 * 금액을 화면에 보기 좋게 포맷합니다.
 * - 예: 3542000 -> "3,542,000"
 */
function formatWon(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

/**
 * Benefit 카드 1개를 렌더링합니다.
 * - 초보 개발자도 바로 이해할 수 있게, props로 무엇이 들어오는지 명확히 표현합니다.
 */
function BenefitCard({
  title,
  description,
  Icon,
}: {
  title: string
  description: string
  Icon: ComponentType<{ className?: string }>
}) {
  return (
    <motion.div
      // 카드가 올라오며 “정돈된 느낌”이 나도록 부드럽게 Y축 이동합니다.
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      className="rounded-[24px] bg-white/70 backdrop-blur-xl border border-white/60 shadow-[0_18px_60px_rgba(49,130,246,0.10)] p-4"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-2xl bg-[#3182f6]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-[#3182f6]" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold text-[#191F28] tracking-tight">{title}</p>
          <p className="text-[12px] text-[#4E5968] mt-1 leading-relaxed font-medium">{description}</p>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * 하단 고정 CTA 버튼입니다.
 * - 모바일에서 버튼이 항상 보이도록 `fixed`로 고정합니다.
 */
function FixedStartButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <div
      className="fixed left-0 right-0 bottom-0 z-50 bg-gradient-to-t from-white via-white/90 to-white/0 pt-3 pb-3 px-4"
      // iOS safe-area를 커버하기 위한 보정(환경에 따라 불필요할 수 있지만 안전합니다)
      style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-[18px] bg-[#3182f6] text-white font-extrabold tracking-tight px-5 py-4 shadow-[0_14px_50px_rgba(49,130,246,0.35)] hover:bg-[#1b64da] active:scale-[0.99] transition-transform"
      >
        {label}
      </button>
      <p className="text-center text-[10px] text-[#8B95A1] mt-2 font-medium">
        시작은 무료이며, 입력한 내용은 더 나은 안내를 위해 활용됩니다.
      </p>
    </div>
  )
}

export default function Intro() {
  const navigate = useNavigate()
  const { isLoggedIn, logout } = useAuth()

  const [whyOpen, setWhyOpen] = useState(false)
  const [csOpen, setCsOpen] = useState(false)

  // 0원부터 TARGET_WON까지 올라가는 “표시용” 상태입니다.
  const [countWon, setCountWon] = useState(0)

  /**
   * 페이지 진입 시 카운팅 애니메이션을 실행합니다.
   * - framer-motion 없이도 requestAnimationFrame으로 부드럽게 처리합니다.
   * - `prefers-reduced-motion` 환경에서는 즉시 목표값으로 점프합니다.
   */
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion) {
      setCountWon(TARGET_WON)
      return
    }

    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / COUNT_DURATION_MS)
      // 보기 좋게 “끝으로 갈수록 천천히” 내려오지 않게 easeOut 느낌을 줍니다.
      const eased = 1 - Math.pow(1 - progress, 3)
      setCountWon(Math.floor(TARGET_WON * eased))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const startLabel = useMemo(() => {
    // 로그인 여부에 따라 사용자가 더 명확히 이해할 수 있는 문구로 분기합니다.
    if (isLoggedIn) return 'CATCH 시작하기'
    return '로그인하고 CATCH 시작하기'
  }, [isLoggedIn])

  /**
   * 메인 CTA 클릭 처리:
   * - 비로그인: 로그인 페이지로 이동
   * - 로그인: 바로 계산/대시보드 성격의 메인 흐름으로 이동
   */
  const handleStart = () => {
    if (!isLoggedIn) {
      navigate('/login')
      return
    }
    navigate('/severance')
  }

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-28 font-sans">
      {/* 상단 헤더: 사용자가 도움/설명을 빠르게 찾을 수 있게 유지합니다. */}
      <header className="sticky top-0 z-30 w-full max-w-[460px] flex items-center justify-between pb-3">
        <button
          type="button"
          onClick={() => setCsOpen(true)}
          className="flex items-center gap-1.5 text-[12px] text-[#4E5968] hover:text-[#191F28] font-semibold tracking-tight"
          aria-label="고객센터 열기"
        >
          <Headphones className="w-4 h-4" />
          고객센터
        </button>

        <button
          type="button"
          onClick={() => setWhyOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/60 backdrop-blur-xl border border-white/70 text-[#3182f6] text-[12px] font-extrabold tracking-tight hover:bg-white/80 transition-colors"
          aria-label="왜 CATCH인가요 열기"
        >
          <HelpCircle className="w-4 h-4" />
          왜 CATCH인가요?
        </button>

        {isLoggedIn ? (
          <button
            type="button"
            onClick={() => logout()}
            className="text-[12px] text-[#8B95A1] hover:text-[#191F28] font-semibold tracking-tight"
            aria-label="로그아웃"
          >
            로그아웃
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[12px] text-[#8B95A1] hover:text-[#191F28] font-semibold tracking-tight"
            aria-label="로그인"
          >
            로그인
          </button>
        )}
      </header>

      {/* 가운데 콘텐츠: 모바일 우선으로 배치합니다. */}
      <main className="w-full max-w-[460px] flex flex-col gap-5 flex-1">
        {/* Hero 섹션: 가장 큰 메시지 + 카운팅 금액으로 첫 인상을 강하게 만듭니다. */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
          className="rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/70 shadow-[0_20px_80px_rgba(49,130,246,0.10)] p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#3182f6]/10 flex items-center justify-center overflow-hidden">
              <img src="/catch-logo.png" alt="CATCH" className="w-full h-full object-contain p-2" />
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-extrabold text-[#191F28] tracking-tight">
                자동 계산 · 1:1 문의
              </p>
              <p className="text-[11px] text-[#4E5968] font-medium mt-0.5">
                퇴직금과 실업급여를, 더 빠르게 확인해보세요
              </p>
            </div>
          </div>

          <h1 className="mt-4 text-[26px] sm:text-[30px] leading-[1.15] font-black tracking-tight text-[#191F28]">
            잠자고 있는 내 퇴직금, <span className="text-[#3182f6]">3초 만에</span> 확인하세요
          </h1>

          {/* 요청하신 “0원 → 3,542,000원” 카운팅 영역 */}
          <div className="mt-4 rounded-[20px] bg-[#3182f6]/10 border border-[#3182f6]/20 px-4 py-3">
            <p className="text-[12px] font-semibold text-[#4E5968] tracking-tight">
              오늘 확인해볼 예상 구간(예시)
            </p>
            <p className="text-[22px] font-extrabold text-[#191F28] tracking-tight mt-1">
              {formatWon(countWon)}원
            </p>
          </div>

          <p className="text-[13px] text-[#4E5968] font-medium leading-relaxed mt-3">
            지금 시작하면 입력 과정을 줄여, 핵심만 빠르게 확인할 수 있어요.
            결과가 궁금하면 1:1 문의로 추가 안내도 받을 수 있습니다.
          </p>
        </motion.section>

        {/* Benefit cards: Toss 스타일의 카드형 장점 영역입니다. */}
        <section className="flex flex-col gap-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            className="px-1"
          >
            <p className="text-[14px] font-extrabold text-[#191F28] tracking-tight">
              딱 필요한 것만, 더 매끄럽게
            </p>
            <p className="text-[12px] text-[#4E5968] mt-1 font-medium leading-relaxed">
              세 가지 포인트로, 첫 시작을 쉽게 만들었습니다.
            </p>
          </motion.div>

          {/* 모바일은 1열, 데스크톱은 3열로 배치합니다. */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BenefitCard
              title="손쉽게 준비"
              description="복잡한 서류는 줄이고, 필요한 정보만 안내받아요."
              Icon={Wallet}
            />
            <BenefitCard
              title="안전 우선"
              description="개인정보와 절차를 투명하게 관리합니다."
              Icon={ShieldCheck}
            />
            <BenefitCard
              title="빠른 답변"
              description="궁금한 점은 1:1 문의로 더 명확히 확인해요."
              Icon={MessageSquare}
            />
          </div>
        </section>

        {/* Social proof: 신뢰를 주는 문구 + 요약 배지 영역입니다. */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
          className="rounded-[28px] bg-white/55 backdrop-blur-xl border border-white/70 shadow-[0_20px_80px_rgba(49,130,246,0.07)] p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#3182f6]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[18px]">⭐</span>
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold text-[#191F28] tracking-tight">
                이미 수천 명이 확인했습니다
              </p>
              <p className="text-[12px] text-[#4E5968] mt-1 font-medium leading-relaxed">
                퇴직금/실업급여 계산을 처음 해보시는 분도 부담 없이 시작할 수 있도록 설계했어요.
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-[18px] bg-white/60 border border-white/70 p-3">
              <p className="text-[12px] font-extrabold text-[#191F28] tracking-tight">3초</p>
              <p className="text-[11px] text-[#4E5968] font-medium mt-1">빠른 시작</p>
            </div>
            <div className="rounded-[18px] bg-white/60 border border-white/70 p-3">
              <p className="text-[12px] font-extrabold text-[#191F28] tracking-tight">안전</p>
              <p className="text-[11px] text-[#4E5968] font-medium mt-1">개인정보</p>
            </div>
            <div className="rounded-[18px] bg-white/60 border border-white/70 p-3">
              <p className="text-[12px] font-extrabold text-[#191F28] tracking-tight">문의</p>
              <p className="text-[11px] text-[#4E5968] font-medium mt-1">명확한 답변</p>
            </div>
          </div>
        </motion.section>

        {/* 작은 안내 문구: 법적/안내성 문장으로 UX 신뢰도 보강합니다. */}
        <p className="text-center text-[10px] text-gray-400 leading-relaxed font-medium mt-1">
          이 결과는 참고용입니다. 정확한 금액 확인이 필요하면 노무사 상담을 권장합니다.
        </p>
      </main>

      {/* “왜 CATCH?” 모달 */}
      <AnimatePresence>
        {whyOpen && <WhyCatchModal onClose={() => setWhyOpen(false)} />}
      </AnimatePresence>
      {/* 고객센터 모달 */}
      <CustomerService isOpen={csOpen} onClose={() => setCsOpen(false)} />

      {/* 고정 CTA 버튼: 모바일 하단에서 항상 보이도록 `fixed`로 고정합니다. */}
      <FixedStartButton label={startLabel} onClick={handleStart} />
    </div>
  )
}
