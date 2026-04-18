// ============================================================
// OverviewTab: 어드민 대시보드 [개요] 탭
// 기존 DashboardMenu의 모든 내용을 그대로 이전한 탭입니다.
// - 핵심 KPI 10개 (유저/계산/채용/문의/평균퇴직금 등)
// - 일별 트렌드 차트 + 서비스별 바 차트
// - 문의 상태 분포 + 최근 공지사항
// ============================================================

import React, { useEffect, useState, useRef } from 'react'
import { getAdminStats, getAdminAnalytics, getAdminInquiries } from '../../../lib/api'
import type { AdminStats, AnalyticsResponse, AdminInquiry } from '../../../types/admin'
import { logAdminAction } from '../../../lib/adminAuditLog'
import { supabase } from '../../../lib/supabase'
import KpiCard from '../dashboard/KpiCard'
import DailyTrendChart from '../dashboard/DailyTrendChart'
import ServiceBarChart from '../dashboard/ServiceBarChart'
import RecentActivity from '../dashboard/RecentActivity'

// ── 금액 포맷 헬퍼 ──────────────────────────────────────────
function fmtMoney(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000)}만원`
  return `${n.toLocaleString()}원`
}

// ── 날짜 범위 계산 헬퍼 ──────────────────────────────────────
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

  // 대시보드 접근 감사 로그 (1회만 기록)
  useEffect(() => {
    if (!auditLogged.current) {
      auditLogged.current = true
      logAdminAction('admin.view_dashboard', 'dashboard')
    }
  }, [])

  // 데이터 로드 함수
  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { start, end } = getDateRange(range)
      // 통계/분석/문의/공지를 병렬로 로드해 대기 시간을 줄입니다.
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

  // 날짜 범위가 변경될 때마다 재로드
  useEffect(() => { load() }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 로딩 상태 ─────────────────────────────────────────────
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

  // ── 에러 상태 ─────────────────────────────────────────────
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

  // 전환율 계산 (계산 건수 / 전체 유저)
  const conversionRate = stats.users.total > 0
    ? Math.round(stats.reports.total / stats.users.total * 100) : 0
  // 문의 해결률 (답변+종결 / 전체)
  const resolveRate = stats.inquiries.total > 0
    ? Math.round((stats.inquiries.answered + stats.inquiries.closed) / stats.inquiries.total * 100) : 0

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* ── 헤더: 제목 + 날짜 범위 필터 ─────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 22, gap: 8, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0 }}>Overview</h2>
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

      {/* ── 핵심 KPI — 2열(모바일) / 5열(데스크탑) ─────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <KpiCard label="전체 유저" value={stats.users.total.toLocaleString()}
          sub={`오늘 +${stats.users.new_today}`} color="#3182f6" icon="👥" />
        <KpiCard label="계산 건수" value={stats.reports.total.toLocaleString()}
          sub={`적격 ${stats.reports.eligible}건`} color="#00c48c" icon="&#128202;" />
        <KpiCard label="채용공고" value={stats.jobs.total.toLocaleString()}
          sub={`활성 ${stats.jobs.active}건`} color="#06b6d4" icon="&#128188;" />
        <KpiCard label="대기 문의" value={stats.inquiries.waiting}
          sub={`전체 ${stats.inquiries.total}건`} color="#f08c00" icon="&#128172;" />
        <KpiCard label="평균 퇴직금" value={fmtMoney(stats.reports.avg_severance)}
          sub="적격자 기준" color="#8b5cf6" icon="&#128176;" />
      </div>

      {/* ── 차트 영역 — 2열 ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 mb-3">
        <DailyTrendChart data={analytics?.daily ?? []} />
        <ServiceBarChart severance={stats.clicks.severance} unemployment={stats.clicks.unemployment} />
      </div>

      {/* ── 보조 KPI — 5열 ─────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <KpiCard label="마케팅 동의" value={`${stats.users.marketing_agreed}명`} color="#ec4899" icon="&#128140;" />
        <KpiCard label="이번 주 신규" value={`+${stats.users.new_this_week}명`} color="#06b6d4" icon="&#128640;" />
        <KpiCard label="총 클릭수" value={stats.clicks.total.toLocaleString()} color="#eab308" icon="&#128065;" />
        <KpiCard label="전환율" value={`${conversionRate}%`}
          sub={`${stats.users.total}명 중 ${stats.reports.total}건`} color="#22c55e" icon="&#128200;" />
        <KpiCard label="문의 해결률" value={`${resolveRate}%`}
          sub={`답변+종결 ${stats.inquiries.answered + stats.inquiries.closed}건`} color="#a78bfa" icon="&#9989;" />
      </div>

      {/* ── 문의 상태 분포 바 ──────────────────────────────── */}
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
              { key: 'waiting',  count: stats.inquiries.waiting,  color: '#f08c00' },
              { key: 'reviewing',count: stats.inquiries.reviewing, color: '#3182f6' },
              { key: 'answered', count: stats.inquiries.answered,  color: '#22c55e' },
              { key: 'closed',   count: stats.inquiries.closed,    color: '#6b7280' },
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
              { label: '대기', count: stats.inquiries.waiting,  color: '#f08c00' },
              { label: '검토', count: stats.inquiries.reviewing,color: '#3182f6' },
              { label: '답변', count: stats.inquiries.answered, color: '#22c55e' },
              { label: '종결', count: stats.inquiries.closed,   color: '#6b7280' },
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

      {/* ── 최근 문의 활동 ──────────────────────────────────── */}
      <RecentActivity inquiries={recentInquiries} />

      {/* ── 최근 공지사항 ────────────────────────────────────── */}
      {recentNotices.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16, padding: '16px 20px', marginTop: 12,
        }}>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', marginBottom: 10 }}>
            최근 공지사항
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentNotices.map(n => (
              <div key={n.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 6,
                  background: n.is_active ? 'rgba(49,130,246,0.2)' : 'rgba(255,255,255,0.08)',
                  color: n.is_active ? '#60a5fa' : 'rgba(255,255,255,0.3)',
                }}>{n.is_active ? '활성' : '비활성'}</span>
                <span style={{
                  flex: 1, fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{n.title || '(제목 없음)'}</span>
                <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
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
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #3182f6, #2563eb)', color: '#fff',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
}
