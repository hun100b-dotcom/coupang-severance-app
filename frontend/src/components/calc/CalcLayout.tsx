// 4개 계산기 페이지 공통 레이아웃 컴포넌트
// 퇴직금(blue) · 실업급여(sky) · 연차수당(amber) · 주휴수당(emerald) 통일 디자인
import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Calculator, FileText } from 'lucide-react'

// ── Tailwind JIT 호환: 리터럴 클래스 맵 ──
export type AccentColor = 'blue' | 'sky' | 'amber' | 'emerald'

const ACCENT = {
  blue: {
    bg100: 'bg-blue-100',
    bg500: 'bg-blue-500',
    bg600: 'bg-blue-600',
    text500: 'text-blue-500',
    text600: 'text-blue-600',
    text700: 'text-blue-700',
    border400: 'border-blue-400',
    bar: 'bg-blue-400',
    shadow: 'shadow-[0_8px_24px_rgba(49,130,246,0.35)]',
    ring: 'focus:ring-blue-400/40',
    focusBorder: 'focus:border-blue-400',
    badgeBg: 'bg-blue-50/80',
    badgeBorder: 'border-blue-100',
  },
  sky: {
    bg100: 'bg-sky-100',
    bg500: 'bg-sky-500',
    bg600: 'bg-sky-600',
    text500: 'text-sky-500',
    text600: 'text-sky-600',
    text700: 'text-sky-700',
    border400: 'border-sky-400',
    bar: 'bg-sky-400',
    shadow: 'shadow-[0_8px_24px_rgba(14,165,233,0.35)]',
    ring: 'focus:ring-sky-400/40',
    focusBorder: 'focus:border-sky-400',
    badgeBg: 'bg-sky-50/80',
    badgeBorder: 'border-sky-100',
  },
  amber: {
    bg100: 'bg-amber-100',
    bg500: 'bg-amber-500',
    bg600: 'bg-amber-600',
    text500: 'text-amber-500',
    text600: 'text-amber-600',
    text700: 'text-amber-700',
    border400: 'border-amber-400',
    bar: 'bg-amber-400',
    shadow: 'shadow-[0_8px_24px_rgba(245,158,11,0.35)]',
    ring: 'focus:ring-amber-400/40',
    focusBorder: 'focus:border-amber-400',
    badgeBg: 'bg-amber-50/80',
    badgeBorder: 'border-amber-100',
  },
  emerald: {
    bg100: 'bg-emerald-100',
    bg500: 'bg-emerald-500',
    bg600: 'bg-emerald-600',
    text500: 'text-emerald-500',
    text600: 'text-emerald-600',
    text700: 'text-emerald-700',
    border400: 'border-emerald-400',
    bar: 'bg-emerald-400',
    shadow: 'shadow-[0_8px_24px_rgba(16,185,129,0.35)]',
    ring: 'focus:ring-emerald-400/40',
    focusBorder: 'focus:border-emerald-400',
    badgeBg: 'bg-emerald-50/80',
    badgeBorder: 'border-emerald-100',
  },
} as const

// ── CalcHeader: 계산기 페이지 상단 고정 헤더 ──
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
    <header className="sticky top-0 z-30 w-full max-w-[460px] py-3 mb-1">
      {/* 네비 바 */}
      <div className="flex items-center gap-2 px-2 py-2 rounded-2xl bg-white/60 backdrop-blur-2xl border border-white/50 shadow-[0_2px_12px_rgba(49,130,246,0.07)]">
        <button type="button" onClick={onBack}
          className="p-1.5 rounded-xl hover:bg-black/5 transition-colors active:scale-95">
          <ChevronLeft className="w-5 h-5 text-[#191f28]" />
        </button>
        <div className="flex items-center gap-2">
          {/* 아이콘 뱃지 */}
          <div className={`w-7 h-7 rounded-xl ${a.bg100} flex items-center justify-center`}>
            <span className={a.text600}>{icon}</span>
          </div>
          <h1 className="text-[17px] font-extrabold text-[#191f28] tracking-tight">{title}</h1>
        </div>
        {/* 진행률 배지 */}
        {showProgress && progress && (
          <div className="ml-auto">
            <span className={`text-[10px] font-semibold ${a.text600}`}>
              {progress.current}/{progress.total}
            </span>
          </div>
        )}
      </div>
      {/* 진행 바 */}
      {showProgress && progress && (
        <div className="mt-2 w-full h-1 rounded-full bg-gray-100 overflow-hidden">
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

// ── CalcStepCard: 스텝 전환 애니메이션 래퍼 ──
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
      className={/* p-4(모바일) → p-5(sm 이상): 375px에서 내부 컨텐츠 좌우 여백 최소 16px 확보 */
        `flex flex-col gap-4 rounded-[20px] bg-white/70 backdrop-blur-2xl border border-white/40 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.03)] p-4 sm:p-5 ${className}`}
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
    <div className="text-center pt-2 pb-1">
      <div className={`w-14 h-14 rounded-3xl ${a.bg100} flex items-center justify-center mx-auto mb-3`}>
        <span className={a.text600}>{icon}</span>
      </div>
      {/* clamp: 모바일(375px)에서 텍스트 줄바꿈 방지 — 최소 18px, 최대 22px */}
      <p className="text-[clamp(18px,5vw,22px)] font-extrabold text-[#191f28] tracking-tight leading-tight">
        {title}
      </p>
      {subtitle && (
        <p className="text-[13px] text-[#8b95a1] mt-1.5">{subtitle}</p>
      )}
    </div>
  )
}

// ── CalcChoiceButton: 선택 버튼 (accent 배경 + 흰 텍스트) ──
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
      className={`w-full px-5 py-5 rounded-[20px] text-left transition-all active:scale-[0.98] border ${
        selected
          ? `${a.bg500} text-white ${a.border400} ${a.shadow}`
          : 'bg-white/60 backdrop-blur-xl border-white/60 text-[#191f28] hover:bg-white/80'
      }`}>
      <p className="font-bold text-[15px]">
        {icon && <span className="mr-1.5">{icon}</span>}
        {children}
      </p>
      {sub && (
        <p className={`text-[12px] mt-0.5 ${selected ? 'text-white/80' : 'text-[#8b95a1]'}`}>
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
  // py-4(16px) = 총 높이 약 48px → 모바일 터치 타겟 44px 충족
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`w-full py-4 rounded-2xl text-sm font-bold tracking-tight transition-all flex items-center justify-center gap-2 ${
        disabled
          ? 'bg-white/40 text-slate-400 border border-white/40 cursor-not-allowed'
          : `${a.bg500} text-white ${a.shadow} hover:${a.bg600} active:scale-[0.98]`
      }`}>
      {children ?? '다음'} <ChevronRight className="w-4 h-4" />
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
      className="w-full py-3.5 rounded-2xl text-sm font-semibold text-[#8b95a1] bg-white/40 backdrop-blur-xl border border-white/40 hover:bg-white/60 transition-all active:scale-[0.98]">
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
    <div className={`rounded-[28px] bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)] px-5 py-6 ${className}`}>
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
          <p className="text-[13px] font-bold text-[#8b95a1] mb-3">입력값 요약</p>
          <div className="grid grid-cols-2 gap-3">
            {summaryItems.map(item => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${a.bg500}`} />
                <div>
                  <p className="text-[11px] text-[#8b95a1]">{item.label}</p>
                  <p className="text-[13px] font-bold text-[#191f28]">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </CalcInputCard>
      )}

      {/* 계산 방식 선택 버튼 */}
      <button type="button" onClick={onSimple}
        className={`w-full px-5 py-5 rounded-[20px] text-left transition-all active:scale-[0.98] border bg-white/60 backdrop-blur-xl border-white/60 hover:bg-white/80 group`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl ${a.bg100} flex items-center justify-center shrink-0`}>
            <Calculator className={`w-5 h-5 ${a.text600}`} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[15px] text-[#191f28]">{simpleLabel}</p>
            <p className="text-[12px] text-[#8b95a1] mt-0.5">{simpleDesc}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.bg100} ${a.text700}`}>
            즉시 확인
          </span>
        </div>
      </button>

      <button type="button" onClick={onPdf}
        className={`w-full px-5 py-5 rounded-[20px] text-left transition-all active:scale-[0.98] border bg-white/60 backdrop-blur-xl border-white/60 hover:bg-white/80 group`}>
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl ${a.bg100} flex items-center justify-center shrink-0`}>
            <FileText className={`w-5 h-5 ${a.text600}`} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[15px] text-[#191f28]">{pdfLabel}</p>
            <p className="text-[12px] text-[#8b95a1] mt-0.5">{pdfDesc}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${a.bg100} ${a.text700}`}>
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
    <div className="px-4 py-3 rounded-2xl bg-red-50/80 border border-red-100 text-[#cc2233] text-[13px] font-semibold">
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
    <div className="w-full max-w-[460px] flex flex-col gap-4">
      {children}
    </div>
  )
}

// 편의를 위한 AnimatePresence re-export
export { AnimatePresence }
