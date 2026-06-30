// KPI 카드 — 업비트 톤 (흰 면 + 헤어라인 + tabular 숫자)
import { UP, numeric } from '../shared/adminTheme'

interface Props {
  label: string
  value: string | number
  sub?: string
  color?: string
  icon?: string
  trend?: number
}

export default function KpiCard({ label, value, sub, color = UP.brand, icon, trend }: Props) {
  return (
    <div style={{
      background: UP.surface,
      border: `1px solid ${UP.hair}`,
      borderRadius: 12,
      padding: 'clamp(14px,2.5vw,18px)',
      boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
      transition: 'box-shadow 0.15s, transform 0.15s',
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLDivElement
      el.style.boxShadow = '0 4px 16px rgba(16,24,40,0.09)'
      el.style.transform = 'translateY(-1px)'
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLDivElement
      el.style.boxShadow = '0 1px 2px rgba(16,24,40,0.04)'
      el.style.transform = 'translateY(0)'
    }}
    >
      {/* 상단 우측 색상 글로우 */}
      <div style={{
        position: 'absolute', top: -12, right: -12,
        width: 60, height: 60, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          {/* 라벨 */}
          <p style={{
            fontSize: '0.625rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: UP.sub,
            marginBottom: 8,
          }}>
            {label}
          </p>

          {/* 큰 숫자 */}
          <p style={{
            fontSize: 'clamp(1.25rem,3.5vw,1.75rem)',
            fontWeight: 800,
            color,
            lineHeight: 1.1,
            wordBreak: 'break-all',
            ...numeric,
          }}>
            {value}
          </p>

          {/* 트렌드 + 부제목 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {trend !== undefined && trend !== 0 && (
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: trend > 0 ? UP.green : UP.danger,
                background: trend > 0 ? UP.greenBg : UP.dangerBg,
                padding: '2px 6px',
                borderRadius: 6,
                ...numeric,
              }}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
            {sub && (
              <p style={{
                fontSize: '0.66rem',
                color: UP.caption,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {sub}
              </p>
            )}
          </div>
        </div>

        {/* 아이콘 */}
        {icon && (
          <div style={{
            width: 36, height: 36,
            borderRadius: 10,
            background: `${color}12`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '1.05rem', lineHeight: 1 }}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  )
}
