// OverviewTab: 어드민 대시보드 [개요] 탭 — 라이트 모드 전환
import React, { useEffect, useState, useRef } from 'react'
import { getAdminStats, getAdminAnalytics, getAdminInquiries } from '../../../lib/api'
import type { AdminStats, AnalyticsResponse, AdminInquiry } from '../../../types/admin'
import { logAdminAction } from '../../../lib/adminAuditLog'
import { supabase } from '../../../lib/supabase'
import KpiCard from '../dashboard/KpiCard'
import DailyTrendChart from '../dashboard/DailyTrendChart'
import ServiceBarChart from '../dashboard/ServiceBarChart'
import RecentActivity from '../dashboard/RecentActivity'
import PageHeader from '../shared/PageHeader'

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

export default function OverviewTab() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null)
  const [recentInquiries, setRecentInquiries] = useState<AdminInquiry[]>([])
  const [recentNotices, setRecentNotices] = useState<{ id: string; title: string; created_at: string; is_active: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState(30)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const auditLogged = useRef(false)

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
      const [s, a, inq, noticesRes] = await Promise.all([
        getAdminStats(),
        getAdminAnalytics(start, end),
        getAdminInquiries({ limit: 8, page: 1 }),
        supabase!.from('notices').select('id, title, created_at, is_active')
          .order('created_at', { ascending: false }).limit(3),
      ])
      setStats(s)
      setAnalytics(a)
      setRecentInquiries(inq.inquiries ?? [])
      setRecentNotices((noticesRes.data ?? []) as { id: string; title: string; created_at: string; is_active: boolean }[])
      setLastUpdated(new Date())
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg || '알 수 없는 오류')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  // 로딩 스피너 — 라이트 버전
  if (loading) {
    return (
      <div style={{ padding: '60px 40px', textAlign: 'center' }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid #e2e8f0',
          borderTopColor: '#3182f6',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
          margin: '0 auto 16px',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>대시보드 로딩 중...</p>
      </div>
    )
  }

  // 에러 상태 — 라이트 버전
  if (error || !stats) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          background: '#fff1f2',
          border: '1px solid #fecdd3',
          borderRadius: 16,
          padding: '24px',
          color: '#e11d48',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: '0.95rem' }}>대시보드 로드 실패</div>
          <div style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 16 }}>
            {error || '데이터를 불러오지 못했습니다.'}
          </div>
          <button onClick={load} style={btnPrimary}>재시도</button>
        </div>
      </div>
    )
  }

  const conversionRate = stats.users.total > 0
    ? Math.round(stats.reports.total / stats.users.total * 100) : 0
  const resolveRate = stats.inquiries.total > 0
    ? Math.round((stats.inquiries.answered + stats.inquiries.closed) / stats.inquiries.total * 100) : 0

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 28px)' }}>
      {/* 헤더 — PageHeader 공용 컴포넌트 사용 */}
      <PageHeader
        icon="🏠"
        title="Overview"
        subtitle={`서비스 핵심 지표${lastUpdated ? ` · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신` : ''}`}
        actions={
          <>
            {/* 날짜 범위 필터 */}
            <div style={{ display: 'flex', gap: 4 }}>
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setRange(d)} style={{
                  padding: '5px 12px',
                  borderRadius: 8,
                  border: range === d ? '1px solid #3182f6' : '1px solid #e2e8f0',
                  background: range === d ? '#eff6ff' : '#fff',
                  color: range === d ? '#1d4ed8' : '#64748b',
                  fontSize: '0.73rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}>
                  {d}일
                </button>
              ))}
            </div>
            {/* 새로고침 버튼 */}
            <button onClick={load} style={{
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#fff',
              color: '#64748b',
              fontSize: '0.82rem',
              cursor: 'pointer',
            }}>
              ↻
            </button>
          </>
        }
      />

      {/* 핵심 KPI — 2열(모바일) / 5열(데스크탑) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <KpiCard label="전체 유저" value={stats.users.total.toLocaleString()}
          sub={`오늘 +${stats.users.new_today}`} color="#3182f6" icon="👥" />
        <KpiCard label="계산 건수" value={stats.reports.total.toLocaleString()}
          sub={`적격 ${stats.reports.eligible}건`} color="#059669" icon="📊" />
        <KpiCard label="채용공고" value={stats.jobs.total.toLocaleString()}
          sub={`활성 ${stats.jobs.active}건`} color="#0891b2" icon="💼" />
        <KpiCard label="대기 문의" value={stats.inquiries.waiting}
          sub={`전체 ${stats.inquiries.total}건`} color="#d97706" icon="💬" />
        <KpiCard label="평균 퇴직금" value={fmtMoney(stats.reports.avg_severance)}
          sub="적격자 기준" color="#7c3aed" icon="💰" />
      </div>

      {/* 차트 영역 — 2열 */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 mb-4">
        <DailyTrendChart data={analytics?.daily ?? []} />
        <ServiceBarChart severance={stats.clicks.severance} unemployment={stats.clicks.unemployment} />
      </div>

      {/* 보조 KPI — 5열 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <KpiCard label="마케팅 동의" value={`${stats.users.marketing_agreed}명`} color="#db2777" icon="📧" />
        <KpiCard label="이번 주 신규" value={`+${stats.users.new_this_week}명`} color="#0891b2" icon="🚀" />
        <KpiCard label="총 클릭수" value={stats.clicks.total.toLocaleString()} color="#ca8a04" icon="👁️" />
        <KpiCard label="전환율" value={`${conversionRate}%`}
          sub={`${stats.users.total}명 중 ${stats.reports.total}건`} color="#059669" icon="📈" />
        <KpiCard label="문의 해결률" value={`${resolveRate}%`}
          sub={`답변+종결 ${stats.inquiries.answered + stats.inquiries.closed}건`} color="#7c3aed" icon="✅" />
      </div>

      {/* 문의 상태 분포 바 */}
      {stats.inquiries.total > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: '16px 20px',
          marginBottom: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
            문의 상태 분포
          </p>
          <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
            {[
              { key: 'waiting',   count: stats.inquiries.waiting,   color: '#d97706' },
              { key: 'reviewing', count: stats.inquiries.reviewing,  color: '#3182f6' },
              { key: 'answered',  count: stats.inquiries.answered,   color: '#059669' },
              { key: 'closed',    count: stats.inquiries.closed,     color: '#94a3b8' },
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
              { label: '대기', count: stats.inquiries.waiting,   color: '#d97706' },
              { label: '검토', count: stats.inquiries.reviewing, color: '#3182f6' },
              { label: '답변', count: stats.inquiries.answered,  color: '#059669' },
              { label: '종결', count: stats.inquiries.closed,    color: '#94a3b8' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: '0.73rem', color: '#64748b' }}>{s.label}</span>
                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: s.color }}>{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 문의 활동 */}
      <RecentActivity inquiries={recentInquiries} />

      {/* 최근 공지사항 */}
      {recentNotices.length > 0 && (
        <div style={{
          background: '#fff',
          border: '1px solid #e2e8f0',
          borderRadius: 16,
          padding: '16px 20px',
          marginTop: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
            최근 공지사항
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentNotices.map(n => (
              <div key={n.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
              }}>
                <span style={{
                  fontSize: '0.62rem', fontWeight: 700,
                  padding: '2px 7px', borderRadius: 6,
                  background: n.is_active ? '#eff6ff' : '#f1f5f9',
                  color: n.is_active ? '#1d4ed8' : '#94a3b8',
                  border: `1px solid ${n.is_active ? '#bfdbfe' : '#e2e8f0'}`,
                }}>
                  {n.is_active ? '활성' : '비활성'}
                </span>
                <span style={{
                  flex: 1, fontSize: '0.8rem', color: '#334155',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {n.title || '(제목 없음)'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0 }}>
                  {n.created_at?.slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px',
  borderRadius: 8,
  border: 'none',
  background: '#3182f6',
  color: '#fff',
  fontSize: '0.82rem',
  cursor: 'pointer',
  fontWeight: 700,
}
