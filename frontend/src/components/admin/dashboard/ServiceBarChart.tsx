// 서비스별 클릭 바 차트 — 업비트 톤 (색은 토큰 매핑, 데이터/로직 불변)
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import { UP, numeric } from '../shared/adminTheme'

interface Props {
  severance: number
  unemployment: number
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; color: string } }> }) {
  if (!active || !payload?.[0]) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: UP.surface,
      border: `1px solid ${UP.hair}`,
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 4px 12px rgba(16,24,40,0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
        <span className="text-a12" style={{ color: UP.navy, fontWeight: 600 }}>{d.name}</span>
      </div>
      <div className="text-a16" style={{ fontWeight: 800, color: d.color, marginTop: 4, ...numeric }}>
        {d.value.toLocaleString()} 클릭
      </div>
    </div>
  )
}

export default function ServiceBarChart({ severance, unemployment }: Props) {
  const total = severance + unemployment
  // color = 막대/도트 fill(고채도 차트색), textColor = 흰 배경 AA 통과용 텍스트색
  const data = [
    { name: '퇴직금', value: severance, color: UP.brand, textColor: UP.strong, pct: total ? Math.round(severance / total * 100) : 0 },
    { name: '실업급여', value: unemployment, color: UP.greenChart, textColor: UP.green, pct: total ? Math.round(unemployment / total * 100) : 0 },
  ]

  return (
    <div style={{
      background: UP.surface,
      border: `1px solid ${UP.hair}`,
      borderRadius: 12,
      padding: 'clamp(14px,3vw,22px)',
      boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div style={{ marginBottom: 12 }}>
        <p className="text-a14" style={{ fontWeight: 700, color: UP.navy, margin: 0 }}>서비스별 클릭</p>
        <p className="text-a11" style={{ color: UP.caption, marginTop: 2, ...numeric }}>총 {total.toLocaleString()}회</p>
      </div>

      {/* 비율 바 */}
      <div style={{ display: 'flex', gap: 2, height: 6, borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
        {data.map(d => (
          <div key={d.name} style={{ flex: d.value, background: d.color, minWidth: d.value > 0 ? 4 : 0 }} />
        ))}
      </div>

      {/* 범례 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        {data.map(d => (
          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
            <span className="text-a12" style={{ color: UP.body }}>{d.name}</span>
            <span className="text-a12" style={{ color: d.textColor, fontWeight: 700, ...numeric }}>{d.pct}%</span>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={data} margin={{ top: 0, right: 8, left: -22, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={UP.hairSoft} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: UP.sub }} />
            <YAxis tick={{ fontSize: 10, fill: UP.caption }} width={28} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: UP.sunken }} />
            <Bar dataKey="value" name="클릭수" radius={[8, 8, 0, 0]} barSize={40}>
              {data.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
