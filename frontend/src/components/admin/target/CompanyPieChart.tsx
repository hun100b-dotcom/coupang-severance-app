import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { CompanyTarget } from '../../../types/admin'
import { UP, CHART_SERIES } from '../shared/adminTheme'

// (P5) 무지개 리터럴 팔레트(purple/pink/teal/gold) → 규정 CHART_SERIES(브랜드/그린/앰버/네이비/회색) 절제 팔레트로 정돈
const COLORS = CHART_SERIES

interface Props {
  companies: CompanyTarget[]
}

export default function CompanyPieChart({ companies }: Props) {
  const top = companies.slice(0, 8)

  return (
    <div style={{
      background: UP.sunken,
      border: `1px solid ${UP.hair}`,
      borderRadius: 16,
      padding: 'clamp(12px,3vw,20px)',
    }}>
      <p style={{ fontSize: 'clamp(0.75rem,2.5vw,0.82rem)', fontWeight: 700, color: UP.sub, marginBottom: 12 }}>
        사업장별 계산 비중
      </p>
      {top.length === 0 ? (
        <p className="text-a13" style={{ color: UP.caption, textAlign: 'center', padding: '40px 0' }}>데이터 없음</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={top}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="42%"
              innerRadius="24%"
              paddingAngle={2}
            >
              {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: UP.surface, border: `1px solid ${UP.hair}`, borderRadius: 8, fontSize: 11 }}
              formatter={(v: number, name: string) => [`${v}건`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 10, color: UP.sub }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
