import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

interface Props {
  severance: number
  unemployment: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; color: string } }> }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'rgba(15,15,30,0.95)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
      padding: '10px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
        <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 600 }}>{d.name}</span>
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 800, color: d.color, marginTop: 4 }}>
        {d.value.toLocaleString()} 클릭
      </div>
    </div>
  )
}

export default function ServiceBarChart({ severance, unemployment }: Props) {
  const total = severance + unemployment
  const data = [
    { name: '퇴직금', value: severance, color: '#3182f6', pct: total ? Math.round(severance / total * 100) : 0 },
    { name: '실업급여', value: unemployment, color: '#00c48c', pct: total ? Math.round(unemployment / total * 100) : 0 },
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, padding: 'clamp(14px,3vw,22px)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 'clamp(0.78rem,2.5vw,0.88rem)', fontWeight: 700, color: '#fff', margin: 0 }}>
          서비스별 클릭
        </p>
        <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
          총 {total.toLocaleString()}회
        </p>
      </div>

      {/* 비율 바 */}
      <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
        {data.map(d => (
          <div key={d.name} style={{ flex: d.value, background: d.color, minWidth: d.value > 0 ? 4 : 0 }} />
        ))}
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {data.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
            <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.6)' }}>{d.name}</span>
            <span style={{ fontSize: '0.73rem', color: d.color, fontWeight: 700 }}>{d.pct}%</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={data} margin={{ top: 0, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }} width={28} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="value" name="클릭수" radius={[8, 8, 0, 0]} barSize={40}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
