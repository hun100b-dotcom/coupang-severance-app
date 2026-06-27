// Card — 토큰 기반 섹션 카드
// - 흰 배경 + 토큰 보더(line) + radius-xl(20px) + shadow-card
// - variant: 'solid'(기본 흰 카드) | 'float'(깊이감 강조 플로팅 카드) | 'ghost'(보더만)
// - as: button으로 쓰면 클릭 가능한 카드 (터치 타겟·active 스케일 자동)
import type { ReactNode, CSSProperties, ButtonHTMLAttributes } from 'react'

type Variant = 'solid' | 'float' | 'ghost'
type Padding = 'none' | 'sm' | 'md' | 'lg'

const PAD: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

const VARIANT: Record<Variant, string> = {
  solid: 'bg-white border border-line shadow-card',
  float: 'bg-white border border-line shadow-float',
  ghost: 'bg-white/60 border border-line',
}

interface CardProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
  variant?: Variant
  padding?: Padding
}

export default function Card({
  children,
  className = '',
  style,
  variant = 'solid',
  padding = 'md',
}: CardProps) {
  return (
    <div className={`rounded-xl ${VARIANT[variant]} ${PAD[padding]} ${className}`} style={style}>
      {children}
    </div>
  )
}

// 클릭 가능한 카드(버튼) — 채용 카드·계산기 카드 등에 사용
interface CardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: Variant
  padding?: Padding
}

export function CardButton({
  children,
  className = '',
  variant = 'solid',
  padding = 'md',
  ...rest
}: CardButtonProps) {
  return (
    <button
      className={`rounded-xl text-left transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-float active:scale-[0.98] active:translate-y-0 ${VARIANT[variant]} ${PAD[padding]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
