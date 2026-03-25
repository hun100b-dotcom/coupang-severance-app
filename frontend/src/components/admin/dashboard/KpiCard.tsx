interface Props {
  label: string
  value: string | number
  sub?: string
  color?: string
  icon?: string
}

export default function KpiCard({ label, value, sub, color = '#3182f6', icon }: Props) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12,
      padding: 'clamp(10px,3vw,18px) clamp(12px,3vw,18px)',
      minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontSize: 'clamp(0.65rem,2vw,0.75rem)',
            color: 'rgba(255,255,255,0.55)',
            marginBottom: 5,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{label}</p>
          <p style={{
            fontSize: 'clamp(1.25rem,4.5vw,1.85rem)',
            fontWeight: 800,
            color,
            lineHeight: 1.1,
            wordBreak: 'break-all',
          }}>{value}</p>
          {sub && (
            <p style={{
              fontSize: 'clamp(0.62rem,1.8vw,0.72rem)',
              color: 'rgba(255,255,255,0.4)',
              marginTop: 5,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{sub}</p>
          )}
        </div>
        {icon && (
          <span style={{
            fontSize: 'clamp(1.2rem,4vw,1.6rem)',
            opacity: 0.55,
            flexShrink: 0,
            lineHeight: 1,
          }}>{icon}</span>
        )}
      </div>
    </div>
  )
}
