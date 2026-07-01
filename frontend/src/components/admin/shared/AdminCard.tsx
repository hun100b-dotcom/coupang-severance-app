// ─────────────────────────────────────────────────────────────
// AdminCard — 공통 카드 (업비트풍 통일)
//   목적: 5개 파일(CalcStatsTab/OverviewTab/RecruitTab/VisitorTab/TargetMenu)에서 각자 정의한
//         로컬 `CARD` 상수 + adminTheme.adminCard 인라인 사용을 하나로 흡수.
//   토큰: 흰 면 + 헤어라인 보더 + radius 16(승인: 20→16) + flat shadow(사용자앱 홈 카드 톤).
//   ⚠️ 계산 로직·데이터와 무관한 순수 표현 컴포넌트.
// ─────────────────────────────────────────────────────────────
import type { ReactNode, CSSProperties } from 'react'
import { UP } from './adminTheme'

interface Props {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** 내부 여백. 기본 clamp(16~24px) */
  padding?: number | string
  /** true면 그림자 없이 보더만(더 평평하게) */
  flat?: boolean
  /** 시맨틱 태그 */
  as?: 'div' | 'section' | 'article'
  onClick?: () => void
}

// 얕은 소프트 섀도우(사용자앱 shadow-card와 동일 톤) — flat 지향이라 은은하게만
const SOFT_SHADOW = '0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.06)'

export default function AdminCard({
  children,
  className = '',
  style,
  padding = 'clamp(16px, 2.5vw, 24px)',
  flat = false,
  as: Tag = 'div',
  onClick,
}: Props) {
  return (
    <Tag
      className={className}
      onClick={onClick}
      style={{
        background: UP.surface,
        border: `1px solid ${UP.hair}`,
        borderRadius: 16, // radius 20→16 통일
        boxShadow: flat ? 'none' : SOFT_SHADOW,
        padding,
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}
