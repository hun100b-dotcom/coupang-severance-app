import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { CompanyTarget } from '../../../types/admin'

const COLORS = ['#3182f6', '#00c48c', '#f08c00', '#cc2233', '#6c5ce7', '#fd79a8', '#00cec9', '#fdcb6e']

interface Props {
  companies: CompanyTarget[]
}

export default function CompanyPieChart({ companies }: Props) {
  const top = companies.slice(0, 8)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12,
      padding: 'clamp(12px,3vw,20px)',
    }}>
      <p style={{ fontSize: 'clamp(0.75rem,2.5vw,0.82rem)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
        사업장별 계산 비중
      </p>
      {top.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '40px 0' }}>데이터 없음</p>
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
              contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, fontSize: 11 }}
              formatter={(v: number, name: string) => [`${v}건`, name]}
            />
            <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
