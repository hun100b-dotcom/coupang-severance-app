import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { SegmentItem } from '../../../types/admin'

interface Props {
  data: SegmentItem[]
}

const COLORS = ['#6c5ce7', '#3182f6', '#00c48c', '#f08c00']

export default function WorkDurationSegment({ data }: Props) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '20px',
    }}>
      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
        근무기간별 분포
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.4)' }} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)' }} />
          <Tooltip
            contentStyle={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
            formatter={(v: number) => [`${v}명`, '인원']}
          />
          <Bar dataKey="count" name="인원" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
