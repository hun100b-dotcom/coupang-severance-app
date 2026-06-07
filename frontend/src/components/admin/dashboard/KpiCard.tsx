// KPI 카드 — 라이트 모드 (캐치퀀트봇 스타일)
// border-slate-200 + shadow-sm + rounded-2xl
interface Props {
  label: string
  value: string | number
  sub?: string
  color?: string
  icon?: string
  trend?: number
}

export default function KpiCard({ label, value, sub, color = '#3182f6', icon, trend }: Props) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 14,
      padding: 'clamp(12px,2.5vw,18px)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      transition: 'box-shadow 0.15s, transform 0.15s',
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLDivElement
      el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'
      el.style.transform = 'translateY(-1px)'
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLDivElement
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'
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
            fontSize: '0.62rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: '#64748b',
            marginBottom: 8,
          }}>
            {label}
          </p>

          {/* 큰 숫자 */}
          <p style={{
            fontSize: 'clamp(1.2rem,3.5vw,1.7rem)',
            fontWeight: 800,
            color,
            lineHeight: 1.1,
            wordBreak: 'break-all',
          }}>
            {value}
          </p>

          {/* 트렌드 + 부제목 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {trend !== undefined && trend !== 0 && (
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: trend > 0 ? '#059669' : '#e11d48',
                background: trend > 0 ? '#d1fae5' : '#ffe4e6',
                padding: '2px 6px',
                borderRadius: 6,
              }}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
            {sub && (
              <p style={{
                fontSize: '0.65rem',
                color: '#94a3b8',
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
