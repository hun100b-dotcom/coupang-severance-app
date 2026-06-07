// 어드민 페이지 헤더 — 제목 + 부제목 + 우측 액션 슬롯
import { ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: string
  icon?: string
  actions?: ReactNode   // 우측 버튼들 (필터, 내보내기 등)
}

export default function PageHeader({ title, subtitle, icon, actions }: Props) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 20,
      flexWrap: 'wrap',
    }}>
      {/* 왼쪽: 제목 + 부제목 */}
      <div>
        <h1 style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 'clamp(1.1rem, 2.5vw, 1.4rem)',
          fontWeight: 800,
          color: '#0f172a',
          margin: 0,
          lineHeight: 1.2,
        }}>
          {icon && <span style={{ fontSize: '1.2rem' }}>{icon}</span>}
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: '0.78rem',
            color: '#64748b',
            marginTop: 4,
            marginBottom: 0,
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* 오른쪽: 액션 슬롯 */}
      {actions && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </div>
  )
}
