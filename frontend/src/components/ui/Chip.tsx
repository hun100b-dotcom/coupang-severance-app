// Chip — 필터/태그/특징 표시용 (Badge보다 약간 큼, 아이콘 동반 가능)
// active 상태 지원 (선택형 필터에 사용)
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  active?: boolean
  icon?: ReactNode
  onClick?: () => void
  className?: string
}

export default function Chip({ children, active = false, icon, onClick, className = '' }: Props) {
  const interactive = typeof onClick === 'function'
  const base =
    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-[13px] font-semibold leading-none border transition-colors'
  const state = active
    ? 'bg-brand text-white border-brand'
    : 'bg-white text-ink-700 border-line hover:border-brand-200'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`${base} ${state} ${interactive ? 'active:scale-95 cursor-pointer' : 'cursor-default'} ${className}`}
    >
      {icon}
      {children}
    </button>
  )
}
