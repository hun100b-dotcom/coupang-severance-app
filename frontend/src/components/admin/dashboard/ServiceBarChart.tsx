import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

interface Props {
  severance: number
  unemployment: number
}

export default function ServiceBarChart({ severance, unemployment }: Props) {
  const data = [
    { name: '퇴직금', value: severance,    color: '#3182f6' },
    { name: '실업급여', value: unemployment, color: '#00c48c' },
  ]

  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12,
      padding: 'clamp(12px,3vw,20px)',
    }}>
      <p style={{ fontSize: 'clamp(0.75rem,2.5vw,0.82rem)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
        서비스별 클릭
      </p>
      <ResponsiveContainer width="100%" height={150}>
        <BarChart data={data} margin={{ top: 0, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.55)' }} />
          <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} width={28} />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 11 }}
          />
          <Bar dataKey="value" name="클릭수" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
