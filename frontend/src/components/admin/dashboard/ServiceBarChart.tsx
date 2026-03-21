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
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '20px',
    }}>
      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
        서비스별 클릭
      </p>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.5)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
          <Tooltip
            contentStyle={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="value" name="클릭수" radius={[6, 6, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
