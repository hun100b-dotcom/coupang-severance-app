import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { SegmentItem } from '../../../types/admin'

interface Props {
  data: SegmentItem[]
}

const COLORS = ['#cc2233', '#f08c00', '#00c48c', '#3182f6']

export default function WageSegment({ data }: Props) {
  return (
    <div style={{
      background: '#f1f5f9',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: 'clamp(12px,3vw,20px)',
    }}>
      <p style={{ fontSize: 'clamp(0.75rem,2.5vw,0.82rem)', fontWeight: 700, color: '#475569', marginBottom: 12 }}>
        급여수준별 분포
      </p>
      {data.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>데이터 없음</p>
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 62, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} width={28} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} width={58} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }}
              formatter={(v: number) => [`${v}명`, '인원']}
            />
            <Bar dataKey="count" name="인원" radius={[0, 6, 6, 0]}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
