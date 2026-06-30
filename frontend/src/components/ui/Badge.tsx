// Badge — 작은 상태 라벨 (급구/D-day/혜택 등)
// 색 규칙: 블루 메인 · 그린(채용) 보조 · 회색 중립 · danger(긴급)만 빨강 허용
import type { ReactNode } from 'react'

type Tone = 'brand' | 'accent' | 'neutral' | 'danger' | 'warning'

const TONE: Record<Tone, string> = {
  brand:   'bg-brand-bg text-brand-strong',
  accent:  'bg-accent-bg text-accent-strong',
  neutral: 'bg-up-sunken text-ink-700',
  danger:  'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
}

interface Props {
  children: ReactNode
  tone?: Tone
  className?: string
}

export default function Badge({ children, tone = 'brand', className = '' }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[11px] font-bold leading-none ${TONE[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
