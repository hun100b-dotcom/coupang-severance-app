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
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12,
      padding: 'clamp(12px,3vw,20px)',
    }}>
      <p style={{ fontSize: 'clamp(0.75rem,2.5vw,0.82rem)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
        급여수준별 분포
      </p>
      {data.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '24px 0' }}>데이터 없음</p>
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 62, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.45)' }} width={28} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.55)' }} width={58} />
            <Tooltip
              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 11 }}
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
