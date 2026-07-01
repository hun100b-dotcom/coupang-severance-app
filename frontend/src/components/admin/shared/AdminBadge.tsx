// ─────────────────────────────────────────────────────────────
// AdminBadge — 공통 배지 (알약형 + 옅은 배경 + 진한 텍스트)
//   목적: adminTheme의 badge() 인라인 헬퍼를 컴포넌트로 승격(기존 헬퍼는 하위호환 유지).
//   폰트: 인라인 대신 `text-a10`(=10px, override 미적용).
//   톤: 무지개 금지 — brand/green/neutral/danger/amber만.
// ─────────────────────────────────────────────────────────────
import type { ReactNode } from 'react'
import { UP, RADIUS } from './adminTheme'

type Tone = 'brand' | 'green' | 'neutral' | 'danger' | 'amber'

const MAP: Record<Tone, { background: string; color: string }> = {
  brand:   { background: UP.brandBg,  color: UP.strong },
  green:   { background: UP.greenBg,  color: UP.green },
  neutral: { background: UP.sunken,   color: UP.sub },
  danger:  { background: UP.dangerBg, color: UP.danger },
  amber:   { background: UP.amberBg,  color: UP.amber },
}

export default function AdminBadge({ tone = 'brand', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={`text-a10 ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: RADIUS.pill,
        fontWeight: 700,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        ...MAP[tone],
      }}
    >
      {children}
    </span>
  )
}
