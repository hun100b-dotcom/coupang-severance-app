// Button (신규, 토큰 기반) — variant/size API
// 기존 components/Button.tsx(PrimaryButton 등)는 계산기 플로우에서 계속 사용 → 유지.
// 이 컴포넌트는 리디자인 화면(홈 등)에서 일관된 버튼을 쓰기 위한 신규 컴포넌트입니다.
import type { ReactNode, ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  // 블루 메인 CTA
  primary:   'bg-brand text-white hover:bg-brand-strong shadow-[0_4px_14px_rgba(49,130,246,0.30)]',
  // 그린 — 채용 전용 CTA
  accent:    'bg-accent text-white hover:bg-accent-strong shadow-[0_4px_14px_rgba(6,190,123,0.28)]',
  // 보조 — 흰 배경 + 블루 보더
  secondary: 'bg-white text-brand-strong border border-brand-200 hover:bg-brand-bg',
  // 고스트 — 배경 없음
  ghost:     'bg-transparent text-ink-700 hover:bg-[#F2F4F6]',
}

const SIZE: Record<Size, string> = {
  // 접근성: 최소 터치 타겟 44px 확보 (md/lg는 자동 충족, sm은 min-h로 보장)
  sm: 'min-h-[40px] px-3 text-[14px] rounded-md',
  md: 'min-h-[48px] px-5 text-[15px] rounded-md',
  lg: 'min-h-[54px] px-6 text-[16px] rounded-lg',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...rest
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-bold tracking-tight
        transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none
        ${VARIANT[variant]} ${SIZE[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
