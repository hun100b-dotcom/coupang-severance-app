// 어드민 페이지 헤더 — 제목 + 부제목 + 우측 액션 슬롯 (업비트 톤)
import { ReactNode } from 'react'
import { UP } from './adminTheme'

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
      marginBottom: 22,
      paddingBottom: 14,
      borderBottom: `1px solid ${UP.hair}`,   // 헤더 하단 헤어라인으로 콘텐츠와 구분
      flexWrap: 'wrap',
    }}>
      {/* 왼쪽: 제목 + 부제목 */}
      <div style={{ minWidth: 0 }}>
        <h1 style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)',
          fontWeight: 800,
          color: UP.navy,
          margin: 0,
          lineHeight: 1.2,
          letterSpacing: '-0.01em',
        }}>
          {icon && <span style={{ fontSize: '1.2rem' }}>{icon}</span>}
          {title}
        </h1>
        {subtitle && (
          <p style={{
            fontSize: '0.8rem',
            color: UP.sub,
            marginTop: 5,
            marginBottom: 0,
            lineHeight: 1.4,
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
