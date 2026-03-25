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
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12,
      padding: 'clamp(12px,3vw,20px)',
    }}>
      <p style={{ fontSize: 'clamp(0.75rem,2.5vw,0.82rem)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
        일별 트렌드
      </p>
      <ResponsiveContainer width="100%" height={Math.max(160, Math.min(220, window.innerHeight * 0.22))}>
        <LineChart data={data} margin={{ top: 0, right: 8, left: -24, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
          <XAxis
            dataKey="date"
            tickFormatter={fmt}
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }}
            interval="preserveStartEnd"
          />
          <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} width={28} />
          <Tooltip
            contentStyle={{
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 8,
              fontSize: 11,
            }}
            labelStyle={{ color: 'rgba(255,255,255,0.8)' }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }} />
          <Line type="monotone" dataKey="new_users"     name="신규 유저" stroke="#3182f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="new_reports"   name="계산 건수" stroke="#00c48c" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="new_inquiries" name="문의 건수" stroke="#f08c00" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
