interface Props {
  label: string
  value: string | number
  sub?: string
  color?: string
  icon?: string
  trend?: number // 증감률 (양수: 증가, 음수: 감소)
}

export default function KpiCard({ label, value, sub, color = '#3182f6', icon, trend }: Props) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16,
      padding: 'clamp(14px,3vw,20px)',
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.15s, border-color 0.15s',
    }}
    onMouseEnter={e => {
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.borderColor = `${color}44`
    }}
    onMouseLeave={e => {
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
    }}
    >
      {/* 배경 글로우 */}
      <div style={{
        position: 'absolute', top: -20, right: -20,
        width: 80, height: 80, borderRadius: '50%',
        background: `radial-gradient(circle, ${color}15 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, position: 'relative' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontSize: 'clamp(0.65rem,2vw,0.73rem)',
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 8,
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}>{label}</p>
          <p style={{
            fontSize: 'clamp(1.3rem,4.5vw,1.9rem)',
            fontWeight: 800,
            color,
            lineHeight: 1.1,
            wordBreak: 'break-all',
          }}>{value}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            {trend !== undefined && trend !== 0 && (
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                color: trend > 0 ? '#22c55e' : '#ef4444',
                background: trend > 0 ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                padding: '2px 6px',
                borderRadius: 6,
              }}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
            {sub && (
              <p style={{
                fontSize: 'clamp(0.6rem,1.8vw,0.7rem)',
                color: 'rgba(255,255,255,0.35)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{sub}</p>
            )}
          </div>
        </div>
        {icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: `${color}14`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  )
}
