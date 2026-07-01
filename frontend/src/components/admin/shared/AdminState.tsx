// ─────────────────────────────────────────────────────────────
// AdminState — 4상태 중 로딩/빈/에러 표준 컴포넌트
//   목적: 메뉴마다 제각각인 로딩 스피너·빈 상태·에러 UI를 통일(UX 규칙: 로딩/성공/실패/빈 4상태).
//   폰트: text-a13/a14(override 미적용). 스피너는 AdminSpinner 재사용.
// ─────────────────────────────────────────────────────────────
import type { ReactNode } from 'react'
import { UP } from './adminTheme'
import AdminSpinner from './AdminSpinner'

const WRAP = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  padding: '48px 16px',
  textAlign: 'center' as const,
}

// 로딩 상태
export function AdminLoading({ label = '불러오는 중이에요…' }: { label?: string }) {
  return (
    <div style={WRAP}>
      <AdminSpinner />
      <p className="text-a13" style={{ color: UP.sub }}>{label}</p>
    </div>
  )
}

// 빈 상태 — 아이콘(선택) + 제목 + 설명
export function AdminEmpty({ icon, title, desc }: { icon?: ReactNode; title: string; desc?: string }) {
  return (
    <div style={WRAP}>
      {icon}
      <p className="text-a14" style={{ color: UP.navy, fontWeight: 700 }}>{title}</p>
      {desc && <p className="text-a13" style={{ color: UP.sub }}>{desc}</p>}
    </div>
  )
}

// 에러 상태 — 메시지 + 재시도 버튼(선택)
export function AdminError({ message = '불러오지 못했어요', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div style={WRAP}>
      <p className="text-a13" style={{ color: UP.sub }}>{message}</p>
      {onRetry && (
        <button
          className="text-a13"
          onClick={onRetry}
          style={{ color: UP.brand, fontWeight: 700, cursor: 'pointer', background: 'none', border: 'none', padding: '8px 12px' }}
        >
          다시 시도
        </button>
      )}
    </div>
  )
}
