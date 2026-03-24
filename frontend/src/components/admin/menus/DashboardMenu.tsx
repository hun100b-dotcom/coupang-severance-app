import { useEffect, useState } from 'react'
import { getAdminStats, getAdminAnalytics, getAdminInquiries } from '../../../lib/api'
import type { AdminStats, AnalyticsResponse, AdminInquiry } from '../../../types/admin'
import KpiCard from '../dashboard/KpiCard'
import DailyTrendChart from '../dashboard/DailyTrendChart'
import ServiceBarChart from '../dashboard/ServiceBarChart'
import RecentActivity from '../dashboard/RecentActivity'

function fmtMoney(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000)}만원`
  return `${n.toLocaleString()}원`
}

function getDateRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

export default function DashboardMenu() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [recentInquiries, setRecentInquiries] = useState<AdminInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState(30)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { start, end } = getDateRange(range)
      const [s, a, inq] = await Promise.all([
        getAdminStats(),
        getAdminAnalytics(start, end),
        getAdminInquiries({ limit: 8, page: 1 }),
      ])
      setStats(s)
      setAnalytics(a)
      setRecentInquiries(inq.inquiries ?? [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg || '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [range])

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>
        대시보드 로딩 중...
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{
          background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
          borderRadius: 12, padding: '24px', color: '#ff6b6b',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ 대시보드 데이터 로드 실패</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
            {error || '데이터를 불러오지 못했습니다.'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
            <b>체크리스트:</b><br />
            1. Render 환경변수: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>ADMIN_SECRET</code> 설정 여부<br />
            2. Render 환경변수: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>SUPABASE_SERVICE_ROLE_KEY</code> 설정 여부<br />
            3. Vercel 환경변수: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>VITE_ADMIN_SECRET</code> 설정 여부
          </div>
          <button onClick={load} style={{
            marginTop: 16, padding: '8px 20px', borderRadius: 8, border: 'none',
            background: '#3182f6', color: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
          }}>재시도</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24, gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>Dashboard</h2>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>서비스 핵심 지표 한눈에</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)} style={{
              padding: '4px 12px', borderRadius: 999, border: 'none',
              background: range === d ? '#3182f6' : 'rgba(255,255,255,0.08)',
              color: range === d ? '#fff' : 'rgba(255,255,255,0.5)',
              fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
            }}>{d}일</button>
          ))}
          <button onClick={load} style={{
            padding: '4px 12px', borderRadius: 999, border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', cursor: 'pointer',
          }}>↻</button>
        </div>
      </div>

      {/* KPI 그리드 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label="전체 유저" value={stats.users.total.toLocaleString()} sub={`오늘 +${stats.users.new_today}`} color="#3182f6" icon="👥" />
        <KpiCard label="계산 건수" value={stats.reports.total.toLocaleString()} sub={`적격 ${stats.reports.eligible}건`} color="#00c48c" icon="📊" />
        <KpiCard label="대기 문의" value={stats.inquiries.waiting} sub={`전체 ${stats.inquiries.total}건`} color="#f08c00" icon="💬" />
        <KpiCard label="평균 퇴직금" value={fmtMoney(stats.reports.avg_severance)} sub="적격자 기준" color="#6c5ce7" icon="💰" />
      </div>

      {/* 2열 차트 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 14 }}>
        <DailyTrendChart data={analytics?.daily ?? []} />
        <ServiceBarChart severance={stats.clicks.severance} unemployment={stats.clicks.unemployment} />
      </div>

      {/* 추가 KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <KpiCard label="마케팅 동의" value={`${stats.users.marketing_agreed}명`} color="#fd79a8" />
        <KpiCard label="이번 주 신규" value={`+${stats.users.new_this_week}명`} color="#00cec9" />
        <KpiCard label="총 클릭수" value={stats.clicks.total.toLocaleString()} color="#fdcb6e" />
      </div>

      {/* 최근 문의 */}
      <RecentActivity inquiries={recentInquiries} />
    </div>
  )
}
