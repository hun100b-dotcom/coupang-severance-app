// 어드민 공용 카드 컴포넌트 — 캐치퀀트봇 라이트 스타일 기준
// border-slate-200 + shadow-sm + rounded-2xl
import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  padding?: string   // 기본 '20px 24px'
  style?: React.CSSProperties
}

export default function AdminCard({ children, className = '', padding = '20px 24px', style }: Props) {
  return (
    <div
      className={className}
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',           // slate-200
        borderRadius: 16,
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
