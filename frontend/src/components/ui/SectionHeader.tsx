// SectionHeader — 섹션 제목 + 선택적 우측 액션(더보기 등)
// A(깔끔한 섹션 구분)을 위해 모든 홈 섹션 상단에 일관되게 사용
import type { ReactNode } from 'react'

interface Props {
  title: string
  /** 제목 왼쪽 작은 액센트 바 색상: 'brand'(블루) | 'accent'(그린) */
  tone?: 'brand' | 'accent'
  /** 우측 액션 영역 (예: "더 보기" 버튼) */
  action?: ReactNode
  /** 제목 아래 보조 설명 */
  subtitle?: string
  className?: string
}

export default function SectionHeader({ title, tone = 'brand', action, subtitle, className = '' }: Props) {
  const barColor = tone === 'accent' ? 'bg-accent' : 'bg-brand'
  return (
    <div className={`flex items-end justify-between gap-3 mb-3 ${className}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {/* 좌측 액센트 바 — 섹션 구분 시각 신호 */}
          <span className={`w-1 h-4 rounded-pill ${barColor} flex-shrink-0`} aria-hidden="true" />
          <h2 className="text-[17px] font-extrabold text-ink-900 tracking-tight truncate">{title}</h2>
        </div>
        {subtitle && <p className="text-[13px] text-ink-600 mt-1 ml-3">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
