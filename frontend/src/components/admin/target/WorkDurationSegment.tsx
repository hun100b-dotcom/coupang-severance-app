import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { SegmentItem } from '../../../types/admin'
import { UP } from '../shared/adminTheme'

interface Props {
  data: SegmentItem[]
}

// (P5) 무지개 리터럴(purple 등) → 규정 팔레트 토큰(강조블루→브랜드→그린→앰버, 근속 구간 오름차순)
const COLORS = [UP.strong, UP.brand, UP.greenChart, UP.amberChart]

export default function WorkDurationSegment({ data }: Props) {
  return (
    <div style={{
      background: UP.sunken,
      border: `1px solid ${UP.hair}`,
      borderRadius: 16,
      padding: 'clamp(12px,3vw,20px)',
    }}>
      <p style={{ fontSize: 'clamp(0.75rem,2.5vw,0.82rem)', fontWeight: 700, color: UP.sub, marginBottom: 12 }}>
        근무기간별 분포
      </p>
      {data.length === 0 ? (
        <p className="text-a13" style={{ color: UP.caption, textAlign: 'center', padding: '24px 0' }}>데이터 없음</p>
      ) : (
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 56, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={UP.sunken} horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10, fill: UP.sub }} width={28} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: UP.sub }} width={52} />
            <Tooltip
              contentStyle={{ background: UP.surface, border: `1px solid ${UP.hair}`, borderRadius: 8, fontSize: 11 }}
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
