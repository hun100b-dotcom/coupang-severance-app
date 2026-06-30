// 4개 계산기 페이지 공통 레이아웃 컴포넌트 (2026 리디자인 "B-fixed")
// - 색 체계: 계산기 허브 그룹과 일치 → 퇴직금·실업급여=브랜드 블루 / 주휴·연차=그린(accent)
//   (기존 키 blue/sky/amber/emerald는 그대로 받되, 값을 토큰으로 매핑: blue&sky→brand, amber&emerald→accent)
// - 글래스모피즘 제거 → 솔리드 흰 카드 + 토큰(border-line/shadow-card), 무지개 제거
// - 컴포넌트 시그니처·props는 100% 보존 (4개 플로우 파일 무수정으로 일괄 반영)
import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calculator, FileText } from 'lucide-react'

// ── 외부에서 넘기는 키는 유지하되, 실제 값은 brand/accent 2팔레트로 매핑 ──
export type AccentColor = 'blue' | 'sky' | 'amber' | 'emerald'

// 브랜드 블루 팔레트 (퇴사 후 정산: 퇴직금·실업급여)
const BRAND = {
  bg100: 'bg-brand-bg',
  bg500: 'bg-brand',
  bg600: 'bg-brand-strong',
  // 흰 텍스트 버튼 채움색 — 흰색 대비 AA(4.5↑) 확보용 진한 색
  btn: 'bg-brand-strong',
  text500: 'text-brand',
  text600: 'text-brand-strong',
  text700: 'text-brand-700',
  border400: 'border-brand-200',
  bar: 'bg-brand',
  shadow: 'shadow-[0_6px_18px_rgba(49,130,246,0.30)]',
  ring: 'focus:ring-brand/30',
  focusBorder: 'focus:border-brand',
  badgeBg: 'bg-brand-bg',
  badgeBorder: 'border-brand-100',
} as const

// 그린 팔레트 (재직 중 수당: 주휴·연차) — 소형 텍스트 대비 위해 진한 그린(#047857)
const GREEN = {
  bg100: 'bg-accent-bg',
  bg500: 'bg-accent',
  bg600: 'bg-accent-strong',
  // 흰 텍스트 버튼 채움색 — 흰색 대비 AA 확보용 진한 그린(#047857)
  btn: 'bg-[#047857]',
  text500: 'text-[#047857]',
  text600: 'text-[#047857]',
  text700: 'text-[#047857]',
  border400: 'border-accent/40',
  bar: 'bg-accent',
  shadow: 'shadow-[0_6px_18px_rgba(6,190,123,0.28)]',
  ring: 'focus:ring-accent/30',
  focusBorder: 'focus:border-accent',
  badgeBg: 'bg-accent-bg',
  badgeBorder: 'border-accent/20',
} as const

const ACCENT = {
  blue: BRAND,
  sky: BRAND,
  amber: GREEN,
  emerald: GREEN,
} as const

// ── CalcHeader: 계산기 페이지 상단 헤더 (TopNav 아래 sticky) ──
interface CalcHeaderProps {
  title: string
  icon: ReactNode
  accentColor: AccentColor
  onBack: () => void
  progress?: { current: number; total: number }
  showProgress?: boolean
}

export function CalcHeader({
  title, icon, accentColor, onBack,
  progress, showProgress = true,
}: CalcHeaderProps) {
  const a = ACCENT[accentColor]
  const pct = progress ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <header className="sticky top-14 z-30 w-full max-w-[560px] py-3 mb-1">
      {/* 네비 바 (업비트풍 업스케일: 헤어라인 보더 + 약간 큰 타이틀) */}
      <div className="flex items-center gap-2 px-2 py-2.5 rounded-xl bg-white border border-up-hair shadow-card">
        <button type="button" onClick={onBack}
          className="flex items-center justify-center w-10 h-10 rounded-md hover:bg-up-sunken transition-colors active:scale-95"
          aria-label="뒤로 가기">
          <ChevronLeft className="w-5 h-5 text-up-navy" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-md ${a.bg100} flex items-center justify-center flex-shrink-0`}>
            <span className={a.text600}>{icon}</span>
          </div>
          <h1 className="text-[18px] font-extrabold text-up-navy tracking-tight truncate">{title}</h1>
        </div>
        {showProgress && progress && (
          <div className="ml-auto pr-1">
            <span className={`text-[13px] font-bold ${a.text600} font-mono tabular-nums`}>
              {progress.current}/{progress.total}
            </span>
          </div>
        )}
      </div>
      {/* 진행 바 */}
      {showProgress && progress && (
        <div className="mt-2 w-full h-1.5 rounded-full bg-[#EAEDF0] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${a.bar}`}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </header>
  )
}

// ── CalcStepCard: 스텝 전환 애니메이션 래퍼 (솔리드 카드) ──
interface CalcStepCardProps {
  motionKey: string
  children: ReactNode
  className?: string
}

export function CalcStepCard({ motionKey, children, className = '' }: CalcStepCardProps) {
  return (
    <motion.div
      key={motionKey}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.28 }}
      className={`flex flex-col gap-5 rounded-xl bg-white border border-up-hair shadow-card p-6 sm:p-7 min-w-0 ${className}`}
    >
      {children}
    </motion.div>
  )
}

// ── CalcStepIcon: 스텝 상단 센터 아이콘 + 질문 텍스트 ──
interface CalcStepIconProps {
  icon: ReactNode
  accentColor: AccentColor
  title: ReactNode
  subtitle?: string
}

export function CalcStepIcon({ icon, accentColor, title, subtitle }: CalcStepIconProps) {
  const a = ACCENT[accentColor]
  return (
    <div className="text-center pt-1 pb-1">
      <div className={`w-16 h-16 rounded-2xl ${a.bg100} flex items-center justify-center mx-auto mb-3.5`}>
        <span className={a.text600}>{icon}</span>
      </div>
      {/* clamp: 모바일 줄바꿈 방지 — 업비트풍 업스케일(21~26px), 헤딩 잉크 */}
      <p className="text-[clamp(21px,5.5vw,26px)] font-extrabold text-up-navy tracking-tight leading-tight break-keep">
        {title}
      </p>
      {subtitle && (
        <p className="text-[15px] text-up-sub mt-2.5 break-keep">{subtitle}</p>
      )}
    </div>
  )
}

// ── CalcChoiceButton: 선택 버튼 ──
interface CalcChoiceButtonProps {
  selected: boolean
  accentColor: AccentColor
  icon?: string
  children: ReactNode
  sub?: string
  onClick: () => void
}

export function CalcChoiceButton({
  selected, accentColor, icon, children, sub, onClick,
}: CalcChoiceButtonProps) {
  const a = ACCENT[accentColor]
  return (
    <button type="button" onClick={onClick}
      className={`w-full px-5 py-5 rounded-lg text-left transition-all active:scale-[0.98] border ${
        selected
          ? `${a.btn} text-white ${a.border400} ${a.shadow}`
          : 'bg-white border-up-hair text-up-navy hover:bg-up-sunken hover:border-brand-200'
      }`}>
      <p className="font-bold text-[16px]">
        {icon && <span className="mr-1.5">{icon}</span>}
        {children}
      </p>
      {sub && (
        <p className={`text-[13px] mt-1 ${selected ? 'text-white/95' : 'text-up-sub'}`}>
          {sub}
        </p>
      )}
    </button>
  )
}

// ── CalcNextButton: 다음 진행 버튼 ──
interface CalcNextButtonProps {
  disabled: boolean
  accentColor: AccentColor
  children?: ReactNode
  onClick: () => void
}

export function CalcNextButton({
  disabled, accentColor, children, onClick,
}: CalcNextButtonProps) {
  const a = ACCENT[accentColor]
  // 업비트풍 업스케일: 높이 56px·16px 폰트 — 큼직한 주 CTA
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`w-full min-h-[56px] rounded-lg text-[16px] font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
        disabled
          ? 'bg-up-sunken text-ink-400 border border-up-hair cursor-not-allowed'
          : `${a.btn} text-white ${a.shadow} hover:opacity-95 active:scale-[0.98]`
      }`}>
      {children ?? '다음'} <ChevronRight className="w-[18px] h-[18px]" />
    </button>
  )
}

// ── CalcBackButton: 이전으로 버튼 ──
interface CalcBackButtonProps {
  onClick: () => void
  children?: ReactNode
}

export function CalcBackButton({ onClick, children }: CalcBackButtonProps) {
  return (
    <button type="button" onClick={onClick}
      className="w-full min-h-[48px] rounded-lg text-[14px] font-semibold text-up-sub bg-up-sunken border border-up-hair hover:bg-up-hair transition-all active:scale-[0.98]">
      {children ?? '← 이전으로'}
    </button>
  )
}

// ── CalcInputCard: 입력 필드 래퍼 ──
interface CalcInputCardProps {
  children: ReactNode
  className?: string
}

export function CalcInputCard({ children, className = '' }: CalcInputCardProps) {
  return (
    <div className={`rounded-xl bg-up-sunken border border-up-hair px-5 py-5 ${className}`}>
      {children}
    </div>
  )
}

// ── CalcModeSelector: 간편/PDF 선택 카드 ──
interface CalcModeSelectorProps {
  accentColor: AccentColor
  summaryItems?: { label: string; value: string }[]
  onSimple: () => void
  onPdf: () => void
  simpleLabel?: string
  pdfLabel?: string
  simpleDesc?: string
  pdfDesc?: string
}

export function CalcModeSelector({
  accentColor, summaryItems, onSimple, onPdf,
  simpleLabel = '간편 계산',
  pdfLabel = 'PDF 정밀 계산',
  simpleDesc = '직접 입력으로 즉시 확인',
  pdfDesc = '근로내역서 PDF 자동 분석',
}: CalcModeSelectorProps) {
  const a = ACCENT[accentColor]
  return (
    <div className="flex flex-col gap-4">
      {/* 입력값 요약 카드 */}
      {summaryItems && summaryItems.length > 0 && (
        <CalcInputCard>
          <p className="text-[13px] font-bold text-ink-600 mb-3">입력값 요약</p>
          <div className="grid grid-cols-2 gap-3">
            {summaryItems.map(item => (
              <div key={item.label} className="flex items-center gap-2 min-w-0">
                <div className={`w-2 h-2 rounded-full ${a.bg500} flex-shrink-0`} />
                <div className="min-w-0">
                  <p className="text-[12px] text-ink-600 truncate">{item.label}</p>
                  <p className="text-[14px] font-bold text-ink-900 truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CalcInputCard>
      )}

      {/* 계산 방식 선택 버튼 — 간편 */}
      <button type="button" onClick={onSimple}
        className="w-full px-5 py-5 rounded-lg text-left transition-all active:scale-[0.98] border bg-white border-up-hair hover:bg-up-sunken hover:border-brand-200">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg ${a.bg100} flex items-center justify-center shrink-0`}>
            <Calculator className={`w-6 h-6 ${a.text600}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[16px] text-ink-900">{simpleLabel}</p>
            <p className="text-[13px] text-ink-600 mt-0.5 break-keep">{simpleDesc}</p>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-pill ${a.bg100} ${a.text700} flex-shrink-0`}>
            즉시 확인
          </span>
        </div>
      </button>

      {/* PDF */}
      <button type="button" onClick={onPdf}
        className="w-full px-5 py-5 rounded-lg text-left transition-all active:scale-[0.98] border bg-white border-up-hair hover:bg-up-sunken hover:border-brand-200">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg ${a.bg100} flex items-center justify-center shrink-0`}>
            <FileText className={`w-6 h-6 ${a.text600}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[16px] text-ink-900">{pdfLabel}</p>
            <p className="text-[13px] text-ink-600 mt-0.5 break-keep">{pdfDesc}</p>
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-pill ${a.bg100} ${a.text700} flex-shrink-0`}>
            정확도 높음
          </span>
        </div>
      </button>
    </div>
  )
}

// ── CalcErrorMsg: 에러 메시지 표시 ──
interface CalcErrorMsgProps {
  message: string
}

export function CalcErrorMsg({ message }: CalcErrorMsgProps) {
  return (
    <div className="px-4 py-3 rounded-lg bg-danger/[0.08] border border-danger/20 text-danger text-[13px] font-semibold break-keep">
      ⚠️ {message}
    </div>
  )
}

// ── CalcPageWrapper: 페이지 최상위 래퍼 ──
interface CalcPageWrapperProps {
  children: ReactNode
}

export function CalcPageWrapper({ children }: CalcPageWrapperProps) {
  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-10">
      {children}
    </div>
  )
}

// ── CalcContentArea: 본문 영역 래퍼 ──
interface CalcContentAreaProps {
  children: ReactNode
}

export function CalcContentArea({ children }: CalcContentAreaProps) {
  return (
    <div className="w-full max-w-[560px] flex flex-col gap-5">
      {children}
    </div>
  )
}

// 편의를 위한 AnimatePresence re-export
export { AnimatePresence }
