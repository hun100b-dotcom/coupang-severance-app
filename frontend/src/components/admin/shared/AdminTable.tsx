// ─────────────────────────────────────────────────────────────
// AdminTable — 공통 표 (헤더/셀 표준)
//   목적: NoticesMenu/InquiryTable 등에서 각자 정의한 표 헤더/셀 인라인 스타일 중복을 흡수.
//   구성: <AdminTable>(가로 스크롤 래퍼+table) + <Th>(헤더셀) + <Td>(본문셀, mono 옵션).
//   폰트: 헤더 `text-a11`, 셀 `text-a13`(override 미적용). 숫자는 mono+tabular.
//   토큰: 헤더 sunken 배경 옵션, 행 구분 hairSoft.
// ─────────────────────────────────────────────────────────────
import type { ReactNode, CSSProperties, ThHTMLAttributes, TdHTMLAttributes } from 'react'
import { UP } from './adminTheme'

// 표 래퍼 — 좁은 화면 가로 스크롤 허용(데이터밀도 유지)
export function AdminTable({ children, className = '', minWidth, style }: { children: ReactNode; className?: string; minWidth?: number; style?: CSSProperties }) {
  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <table className={className} style={{ width: '100%', minWidth, borderCollapse: 'collapse', ...style }}>
        {children}
      </table>
    </div>
  )
}

type Align = 'left' | 'right' | 'center'

// 헤더 셀 — 라벨(대문자·자간·회색)
export function Th({ children, align = 'left', style, ...rest }: { children?: ReactNode; align?: Align } & ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className="text-a11"
      style={{
        textAlign: align,
        padding: '10px 12px',
        color: UP.sub,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        background: UP.sunken,
        borderBottom: `1px solid ${UP.hair}`,
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {children}
    </th>
  )
}

// 본문 셀 — mono=true면 숫자 정렬(JetBrains Mono + tabular-nums)
export function Td({ children, align = 'left', mono = false, style, ...rest }: { children?: ReactNode; align?: Align; mono?: boolean } & TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={`text-a13 ${mono ? 'tabular-nums' : ''}`}
      style={{
        textAlign: align,
        padding: '10px 12px',
        color: UP.body,
        borderBottom: `1px solid ${UP.hairSoft}`,
        fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
        ...style,
      }}
      {...rest}
    >
      {children}
    </td>
  )
}
