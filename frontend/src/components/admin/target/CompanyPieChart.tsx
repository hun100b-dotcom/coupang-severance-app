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
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '20px',
    }}>
      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
        사업장별 계산 비중
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={top}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={50}
            paddingAngle={2}
          >
            {top.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#16161e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
            formatter={(v: number, name: string) => [`${v}건`, name]}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
