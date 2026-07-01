// 일별 트렌드 차트 — 업비트 톤 (색은 토큰 매핑, 데이터/로직 불변)
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { DailyAnalytics } from '../../../types/admin'
import { UP, numeric } from '../shared/adminTheme'

interface Props {
  data: DailyAnalytics[]
}

// 차트 시리즈 색 — 토큰 기반 (브랜드/그린/앰버)
const S_USERS = UP.brand
const S_REPORTS = UP.greenChart
const S_INQUIRIES = UP.amberChart

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div style={{
      background: UP.surface,
      border: `1px solid ${UP.hair}`,
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 4px 16px rgba(16,24,40,0.12)',
    }}>
      <p className="text-a11" style={{ color: UP.sub, marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color }} />
          <span className="text-a12" style={{ color: UP.body }}>{p.name}</span>
          <span className="text-a12" style={{ color: UP.navy, fontWeight: 700, marginLeft: 'auto', ...numeric }}>{p.value}</span>
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
      background: UP.surface,
      border: `1px solid ${UP.hair}`,
      borderRadius: 12,
      padding: 'clamp(14px,3vw,22px)',
      boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <p className="text-a14" style={{ fontWeight: 700, color: UP.navy, margin: 0 }}>일별 트렌드</p>
          <p className="text-a11" style={{ color: UP.caption, marginTop: 2 }}>기간 내 유저·계산·문의 추이</p>
        </div>
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { label: '유저', value: totals.users, color: S_USERS },
            { label: '계산', value: totals.reports, color: S_REPORTS },
            { label: '문의', value: totals.inquiries, color: S_INQUIRIES },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'right' }}>
              <span className="text-a10" style={{ color: item.color, fontWeight: 700 }}>{item.label}</span>
              <div className="text-a14" style={{ fontWeight: 800, color: UP.navy, ...numeric }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, Math.min(240, window.innerHeight * 0.24))}>
        <AreaChart data={data} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={S_USERS} stopOpacity={0.2} />
              <stop offset="95%" stopColor={S_USERS} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gReports" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={S_REPORTS} stopOpacity={0.2} />
              <stop offset="95%" stopColor={S_REPORTS} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gInquiries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={S_INQUIRIES} stopOpacity={0.2} />
              <stop offset="95%" stopColor={S_INQUIRIES} stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* 옅은 헤어라인 그리드 */}
          <CartesianGrid strokeDasharray="3 3" stroke={UP.hairSoft} />
          <XAxis dataKey="date" tickFormatter={fmt}
            tick={{ fontSize: 10, fill: UP.caption }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10, fill: UP.caption }} width={28} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: UP.sub, paddingTop: 8 }} />
          <Area type="monotone" dataKey="new_users" name="신규 유저" stroke={S_USERS} strokeWidth={2} fill="url(#gUsers)" dot={false} />
          <Area type="monotone" dataKey="new_reports" name="계산 건수" stroke={S_REPORTS} strokeWidth={2} fill="url(#gReports)" dot={false} />
          <Area type="monotone" dataKey="new_inquiries" name="문의 건수" stroke={S_INQUIRIES} strokeWidth={2} fill="url(#gInquiries)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
