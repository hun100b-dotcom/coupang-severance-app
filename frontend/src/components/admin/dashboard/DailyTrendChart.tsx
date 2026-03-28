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
      background: 'rgba(15,15,30,0.95)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
      padding: '12px 16px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{p.name}</span>
          <span style={{ fontSize: '0.78rem', color: '#fff', fontWeight: 700, marginLeft: 'auto' }}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function DailyTrendChart({ data }: Props) {
  const fmt = (d: string) => d.slice(5)

  // 합계 계산
  const totals = data.reduce((acc, d) => ({
    users: acc.users + d.new_users,
    reports: acc.reports + d.new_reports,
    inquiries: acc.inquiries + d.new_inquiries,
  }), { users: 0, reports: 0, inquiries: 0 })

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, padding: 'clamp(14px,3vw,22px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 'clamp(0.78rem,2.5vw,0.88rem)', fontWeight: 700, color: '#fff', margin: 0 }}>
            일별 트렌드
          </p>
          <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            기간 내 유저·계산·문의 추이
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: '유저', value: totals.users, color: '#3182f6' },
            { label: '계산', value: totals.reports, color: '#00c48c' },
            { label: '문의', value: totals.inquiries, color: '#f08c00' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.62rem', color: item.color, fontWeight: 600 }}>{item.label}</span>
              <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#fff' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, Math.min(240, window.innerHeight * 0.24))}>
        <AreaChart data={data} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3182f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3182f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gReports" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00c48c" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00c48c" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gInquiries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f08c00" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f08c00" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tickFormatter={fmt}
            tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }} width={28} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', paddingTop: 8 }} />
          <Area type="monotone" dataKey="new_users" name="신규 유저" stroke="#3182f6" strokeWidth={2} fill="url(#gUsers)" dot={false} />
          <Area type="monotone" dataKey="new_reports" name="계산 건수" stroke="#00c48c" strokeWidth={2} fill="url(#gReports)" dot={false} />
          <Area type="monotone" dataKey="new_inquiries" name="문의 건수" stroke="#f08c00" strokeWidth={2} fill="url(#gInquiries)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
