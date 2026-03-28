import { useEffect, useState, useRef } from 'react'
import { getAdminStats, getAdminAnalytics, getAdminInquiries } from '../../../lib/api'
import type { AdminStats, AnalyticsResponse, AdminInquiry } from '../../../types/admin'
import { logAdminAction } from '../../../lib/adminAuditLog'
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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const auditLogged = useRef(false)

  // 대시보드 접근 감사 로그
  useEffect(() => {
    if (!auditLogged.current) {
      auditLogged.current = true
      logAdminAction('admin.view_dashboard', 'dashboard')
    }
  }, [])

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
      setLastUpdated(new Date())
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
      <div style={{ padding: '60px 40px', textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)',
          borderTopColor: '#3182f6', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>대시보드 로딩 중...</p>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 16, padding: '24px', color: '#fca5a5',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.95rem' }}>대시보드 로드 실패</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
            {error || '데이터를 불러오지 못했습니다.'}
          </div>
          <button onClick={load} style={btnPrimary}>재시도</button>
        </div>
      </div>
    )
  }

  // 전환율 계산
  const conversionRate = stats.users.total > 0
    ? Math.round(stats.reports.total / stats.users.total * 100) : 0
  // 문의 해결률
  const resolveRate = stats.inquiries.total > 0
    ? Math.round((stats.inquiries.answered + stats.inquiries.closed) / stats.inquiries.total * 100) : 0

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22, gap: 8, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>Dashboard</h2>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            서비스 핵심 지표
            {lastUpdated && ` · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신`}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none',
              background: range === d
                ? 'linear-gradient(135deg, #3182f6, #2563eb)'
                : 'rgba(255,255,255,0.06)',
              color: range === d ? '#fff' : 'rgba(255,255,255,0.45)',
              fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.15s',
            }}>{d}일</button>
          ))}
          <button onClick={load} style={{
            padding: '5px 10px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: 'rgba(255,255,255,0.4)',
            fontSize: '0.82rem', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>↻</button>
        </div>
      </div>

      {/* 핵심 KPI — 4열 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <KpiCard label="전체 유저" value={stats.users.total.toLocaleString()}
          sub={`오늘 +${stats.users.new_today}`} color="#3182f6" icon="👥" />
        <KpiCard label="계산 건수" value={stats.reports.total.toLocaleString()}
          sub={`적격 ${stats.reports.eligible}건`} color="#00c48c" icon="&#128202;" />
        <KpiCard label="대기 문의" value={stats.inquiries.waiting}
          sub={`전체 ${stats.inquiries.total}건`} color="#f08c00" icon="&#128172;" />
        <KpiCard label="평균 퇴직금" value={fmtMoney(stats.reports.avg_severance)}
          sub="적격자 기준" color="#8b5cf6" icon="&#128176;" />
      </div>

      {/* 차트 영역 — 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 mb-3">
        <DailyTrendChart data={analytics?.daily ?? []} />
        <ServiceBarChart severance={stats.clicks.severance} unemployment={stats.clicks.unemployment} />
      </div>

      {/* 보조 KPI — 5열 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <KpiCard label="마케팅 동의" value={`${stats.users.marketing_agreed}명`} color="#ec4899" icon="&#128140;" />
        <KpiCard label="이번 주 신규" value={`+${stats.users.new_this_week}명`} color="#06b6d4" icon="&#128640;" />
        <KpiCard label="총 클릭수" value={stats.clicks.total.toLocaleString()} color="#eab308" icon="&#128065;" />
        <KpiCard label="전환율" value={`${conversionRate}%`}
          sub={`${stats.users.total}명 중 ${stats.reports.total}건`} color="#22c55e" icon="&#128200;" />
        <KpiCard label="문의 해결률" value={`${resolveRate}%`}
          sub={`답변+종결 ${stats.inquiries.answered + stats.inquiries.closed}건`} color="#a78bfa" icon="&#9989;" />
      </div>

      {/* 문의 상태 분포 바 */}
      {stats.inquiries.total > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '16px 20px', marginBottom: 12,
        }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', marginBottom: 10 }}>
            문의 상태 분포
          </p>
          <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
            {[
              { key: 'waiting', count: stats.inquiries.waiting, color: '#f08c00' },
              { key: 'reviewing', count: stats.inquiries.reviewing, color: '#3182f6' },
              { key: 'answered', count: stats.inquiries.answered, color: '#22c55e' },
              { key: 'closed', count: stats.inquiries.closed, color: '#6b7280' },
            ].map(s => (
              <div key={s.key} style={{
                flex: s.count, background: s.color,
                minWidth: s.count > 0 ? 4 : 0,
                transition: 'flex 0.3s',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: '대기', count: stats.inquiries.waiting, color: '#f08c00' },
              { label: '검토', count: stats.inquiries.reviewing, color: '#3182f6' },
              { label: '답변', count: stats.inquiries.answered, color: '#22c55e' },
              { label: '종결', count: stats.inquiries.closed, color: '#6b7280' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.55)' }}>{s.label}</span>
                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: s.color }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 문의 활동 */}
      <RecentActivity inquiries={recentInquiries} />
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #3182f6, #2563eb)', color: '#fff',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
}
