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
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '18px 20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>{label}</p>
          <p style={{ fontSize: '2rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 6 }}>{sub}</p>}
        </div>
        {icon && <span style={{ fontSize: '1.8rem', opacity: 0.6 }}>{icon}</span>}
      </div>
    </div>
  )
}
