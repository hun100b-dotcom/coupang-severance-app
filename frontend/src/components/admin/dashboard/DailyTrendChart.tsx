import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyAnalytics } from '../../../types/admin'

interface Props {
  data: DailyAnalytics[]
}

export default function DailyTrendChart({ data }: Props) {
  const fmt = (d: string) => d.slice(5) // MM-DD

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '20px',
    }}>
      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
        일별 트렌드
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="date" tickFormatter={fmt} tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
          <YAxis tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
          <Tooltip
            contentStyle={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
          <Line type="monotone" dataKey="new_users"    name="신규 유저"  stroke="#3182f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="new_reports"  name="계산 건수"  stroke="#00c48c" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="new_inquiries" name="문의 건수" stroke="#f08c00" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
