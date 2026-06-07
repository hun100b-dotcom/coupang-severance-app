// 일별 트렌드 차트 — 라이트 모드 전환
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyAnalytics } from '../../../types/admin'

interface Props {
  data: DailyAnalytics[]
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    }}>
      <p style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ fontSize: '0.75rem', color: '#475569' }}>{p.name}</span>
          <span style={{ fontSize: '0.75rem', color: '#0f172a', fontWeight: 700, marginLeft: 'auto' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function DailyTrendChart({ data }: Props) {
  const fmt = (d: string) => d.slice(5)

  const totals = data.reduce((acc, d) => ({
    users: acc.users + d.new_users,
    reports: acc.reports + d.new_reports,
    inquiries: acc.inquiries + d.new_inquiries,
  }), { users: 0, reports: 0, inquiries: 0 })

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: 'clamp(14px,3vw,22px)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>일별 트렌드</p>
          <p style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>기간 내 유저·계산·문의 추이</p>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { label: '유저', value: totals.users, color: '#3182f6' },
            { label: '계산', value: totals.reports, color: '#059669' },
            { label: '문의', value: totals.inquiries, color: '#d97706' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.6rem', color: item.color, fontWeight: 600 }}>{item.label}</span>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#0f172a' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, Math.min(240, window.innerHeight * 0.24))}>
        <AreaChart data={data} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3182f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3182f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gReports" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#059669" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gInquiries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d97706" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* 라이트 모드: 연한 회색 그리드 */}
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="date" tickFormatter={fmt}
            tick={{ fontSize: 10, fill: '#94a3b8' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} width={28} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#64748b', paddingTop: 8 }} />
          <Area type="monotone" dataKey="new_users" name="신규 유저" stroke="#3182f6" strokeWidth={2} fill="url(#gUsers)" dot={false} />
          <Area type="monotone" dataKey="new_reports" name="계산 건수" stroke="#059669" strokeWidth={2} fill="url(#gReports)" dot={false} />
          <Area type="monotone" dataKey="new_inquiries" name="문의 건수" stroke="#d97706" strokeWidth={2} fill="url(#gInquiries)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
