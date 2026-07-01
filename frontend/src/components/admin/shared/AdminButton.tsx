// ─────────────────────────────────────────────────────────────
// AdminButton — 공통 버튼 (primary/secondary/ghost/danger)
//   목적: adminTheme의 btnPrimary/btnSecondary/btnGhost 인라인 스타일 헬퍼를 컴포넌트로 승격.
//         (기존 헬퍼는 하위호환 유지 — 신규/치환 코드는 이 컴포넌트 사용 권장)
//   폰트: 인라인 fontSize 대신 어드민 전용 유틸 `text-a13`(=13px, override 미적용) 사용.
//   토큰: 사용자앱 ui<Button> 톤(브랜드 채움/보더 보조/고스트). radius 12·무지개 금지.
// ─────────────────────────────────────────────────────────────
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { UP, RADIUS } from './adminTheme'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

// variant별 색 — 흰/옅은 배경 대비 AA 고려(텍스트는 진한 톤)
const VARIANT: Record<Variant, React.CSSProperties> = {
  primary:   { background: UP.brand,   color: '#fff',      border: '1px solid transparent', boxShadow: '0 4px 14px rgba(49,130,246,0.30)' },
  secondary: { background: UP.surface, color: UP.strong,   border: `1px solid ${UP.brandLine}` },
  ghost:     { background: 'transparent', color: UP.body,  border: `1px solid ${UP.hair}` },
  danger:    { background: UP.dangerBg, color: UP.danger,  border: `1px solid ${UP.dangerLine}` },
}

export default function AdminButton({ variant = 'primary', children, className = '', style, ...rest }: Props) {
  return (
    <button
      className={`text-a13 ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '9px 16px',
        borderRadius: RADIUS.btn, // 12
        fontWeight: 700,
        letterSpacing: '-0.01em',
        cursor: 'pointer',
        lineHeight: 1.4,
        ...VARIANT[variant],
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
