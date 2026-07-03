// OverviewTab — C1 운영 대시보드 [개요] · 새 DS(Aurora Light) 재설계 (S1)
//   ⚠️ 데이터/로직 불변: getAdminStats/getAdminAnalytics/getAdminInquiries + notices 조회 그대로.
//   ★새 디자인 언어: 딥네이비 히어로 폐기 → 라이트 "스탯 리본"(흰 패널+브랜드 워시+큰 잉크 숫자).
//   ★framer-motion 미사용 — 진입은 CSS .animate-staggered-fade(forwards)만(빈섹션 재발 방지).
import { useEffect, useState, useRef } from 'react'
import { getAdminStats, getAdminAnalytics, getAdminInquiries, getAdminNotices } from '../../../lib/api'
import type { AdminStats, AnalyticsResponse, AdminInquiry } from '../../../types/admin'
import { logAdminAction } from '../../../lib/adminAuditLog'
import DailyTrendChart from '../dashboard/DailyTrendChart'
import ServiceBarChart from '../dashboard/ServiceBarChart'
import RecentActivity from '../dashboard/RecentActivity'
import { DS, RAD, SHADOW, panel, mono } from '../ds/adminDS'
import { AdminLoading } from '../shared/AdminState'

function fmtMoney(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000)}만원`
  return `${n.toLocaleString()}원`
}
function getDateRange(days: number) {
  const end = new Date(); const start = new Date(); start.setDate(start.getDate() - days)
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) }
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
    if (!auditLogged.current) { auditLogged.current = true; logAdminAction('admin.view_dashboard', 'dashboard') }
  }, [])

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const { start, end } = getDateRange(range)
      // 공지도 백엔드(service-role) 경로로 통일 — supabase 직접 조회는 RLS 세션에 따라
      // 비활성 공지가 누락될 수 있었다. getAdminNotices 는 관리용 전체 목록을 반환한다.
      const [s, a, inq, noticesAll] = await Promise.all([
        getAdminStats(),
        getAdminAnalytics(start, end),
        getAdminInquiries({ limit: 8, page: 1 }),
        getAdminNotices(),
      ])
      setStats(s); setAnalytics(a); setRecentInquiries(inq.inquiries ?? [])
      // 백엔드는 priority 순으로 주므로 "최근 공지" 표시용으로 최신순 재정렬 후 3건만
      const noticeList = ((noticesAll ?? []) as { id: string; title: string; created_at: string; is_active: boolean }[])
        .slice().sort((x, y) => (y.created_at ?? '').localeCompare(x.created_at ?? '')).slice(0, 3)
      setRecentNotices(noticeList)
      setLastUpdated(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e) || '알 수 없는 오류')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <AdminLoading label="대시보드를 불러오는 중이에요…" />

  if (error || !stats) {
    return (
      <div style={{ padding: 'clamp(16px,3vw,28px)', maxWidth: 1440, margin: '0 auto' }}>
        <div style={{ ...panel, padding: 28, borderColor: DS.badLine, background: DS.badSoft }}>
          <div className="text-a16" style={{ fontWeight: 800, color: DS.bad, marginBottom: 8 }}>대시보드 로드 실패</div>
          <div className="text-a13" style={{ color: DS.sub, marginBottom: 16 }}>{error || '데이터를 불러오지 못했습니다.'}</div>
          <button onClick={load} className="text-a13" style={{ padding: '9px 20px', borderRadius: RAD.sm, border: 'none', background: DS.accent, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>다시 시도</button>
        </div>
      </div>
    )
  }

  const conversionRate = stats.users.total > 0 ? Math.round(stats.reports.total / stats.users.total * 100) : 0
  const resolveRate = stats.inquiries.total > 0 ? Math.round((stats.inquiries.answered + stats.inquiries.closed) / stats.inquiries.total * 100) : 0

  const ribbon = [
    { label: '전체 유저',   value: stats.users.total.toLocaleString(), sub: `오늘 +${stats.users.new_today}`, tone: DS.accentStrong },
    { label: '계산 건수',   value: stats.reports.total.toLocaleString(), sub: `적격 ${stats.reports.eligible}건`, tone: DS.ok },
    { label: '대기 문의',   value: String(stats.inquiries.waiting), sub: `전체 ${stats.inquiries.total}건`, tone: DS.warn },
    { label: '평균 퇴직금', value: fmtMoney(stats.reports.avg_severance), sub: '적격자 기준', tone: DS.ink },
  ]
  const kpis = [
    { label: '채용공고',     value: stats.jobs.total.toLocaleString(), sub: `활성 ${stats.jobs.active}건`, tone: DS.ink,          icon: '💼' },
    { label: '마케팅 동의',   value: `${stats.users.marketing_agreed}명`, sub: '수신 동의', tone: DS.accentStrong, icon: '📧' },
    { label: '이번 주 신규',  value: `+${stats.users.new_this_week}명`, sub: '주간 유입', tone: DS.ok,          icon: '🚀' },
    { label: '총 클릭수',    value: stats.clicks.total.toLocaleString(), sub: '서비스 유입', tone: DS.ink,          icon: '👁️' },
    { label: '전환율',       value: `${conversionRate}%`, sub: `${stats.users.total}명 중 ${stats.reports.total}건`, tone: DS.ok, icon: '📈' },
    { label: '문의 해결률',   value: `${resolveRate}%`, sub: `해결 ${stats.inquiries.answered + stats.inquiries.closed}건`, tone: DS.accentStrong, icon: '✅' },
  ]

  return (
    <div className="animate-staggered-fade" style={{ padding: 'clamp(16px,3vw,28px)', maxWidth: 1440, margin: '0 auto' }}>
      {/* ═══ 스탯 리본 (라이트 히어로) ═══ */}
      <section style={{
        ...panel, borderRadius: RAD.xl, boxShadow: SHADOW.pop, overflow: 'hidden',
        position: 'relative', marginBottom: 22,
      }}>
        {/* 브랜드 워시(우상단) */}
        <div style={{ position: 'absolute', top: -80, right: -60, width: 340, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(49,130,246,0.10) 0%, transparent 68%)', pointerEvents: 'none' }} />
        <div style={{ padding: 'clamp(20px,3vw,32px)' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 22 }}>
            <div>
              <div className="text-a12" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: DS.sub, fontWeight: 700 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: DS.okChart, boxShadow: `0 0 8px ${DS.okChart}` }} />
                실시간 · 최근 {range}일{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신` : ''}
              </div>
              <h1 className="text-a30" style={{ fontWeight: 900, color: DS.ink, letterSpacing: '-0.03em', margin: '8px 0 0' }}>서비스 현황 한눈에</h1>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 3, background: DS.sunken, padding: 3, borderRadius: RAD.pill, border: `1px solid ${DS.line}` }}>
                {[7, 30, 90].map(d => (
                  <button key={d} onClick={() => setRange(d)} className="text-a12" style={{
                    padding: '6px 14px', borderRadius: RAD.pill, border: 'none', cursor: 'pointer', fontWeight: 800,
                    background: range === d ? DS.panel : 'transparent', color: range === d ? DS.accentStrong : DS.sub,
                    boxShadow: range === d ? SHADOW.sm : 'none', transition: 'all 0.12s',
                  }}>{d}일</button>
                ))}
              </div>
              <button onClick={load} title="새로고침" className="text-a14" style={{
                width: 38, height: 38, borderRadius: RAD.sm, cursor: 'pointer',
                border: `1px solid ${DS.line}`, background: DS.panel, color: DS.sub,
              }}>↻</button>
            </div>
          </div>

          {/* 큰 지표 4종 (하이라인 구분) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 0 }}>
            {ribbon.map((h, i) => (
              <div key={h.label} style={{
                paddingLeft: i === 0 ? 0 : 'clamp(16px,2vw,28px)',
                paddingRight: 'clamp(16px,2vw,28px)',
                borderLeft: i === 0 ? 'none' : `1px solid ${DS.line}`,
              }}>
                <div className="text-a11" style={{ color: DS.sub, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h.label}</div>
                <div style={{ fontSize: 'clamp(1.7rem,3.6vw,2.5rem)', fontWeight: 900, color: h.tone, lineHeight: 1.05, marginTop: 8, letterSpacing: '-0.02em', ...mono }}>{h.value}</div>
                <div className="text-a12" style={{ color: DS.sub, fontWeight: 700, marginTop: 6 }}>{h.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 핵심 지표 ═══ */}
      <SectionTitle>핵심 지표</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 26 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ ...panel, padding: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="text-a10" style={{ fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: DS.sub }}>{k.label}</span>
              <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: DS.sunken }}>
                <span className="text-a13">{k.icon}</span>
              </span>
            </div>
            <div style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 900, color: k.tone, lineHeight: 1.1, letterSpacing: '-0.01em', ...mono }}>{k.value}</div>
            {k.sub && <div className="text-a11" style={{ color: DS.faint, marginTop: 6 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* ═══ 추이 차트 ═══ */}
      <SectionTitle>유입 추이 &amp; 서비스 클릭</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr]" style={{ gap: 14, marginBottom: 26 }}>
        <DailyTrendChart data={analytics?.daily ?? []} />
        <ServiceBarChart severance={stats.clicks.severance} unemployment={stats.clicks.unemployment} />
      </div>

      {/* ═══ 문의 상태 분포 ═══ */}
      {stats.inquiries.total > 0 && (
        <>
          <SectionTitle>문의 상태 분포</SectionTitle>
          <div style={{ ...panel, padding: '20px 24px', marginBottom: 26 }}>
            <div style={{ display: 'flex', gap: 2, height: 12, borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
              {[
                { key: 'waiting', count: stats.inquiries.waiting, color: DS.warnChart },
                { key: 'reviewing', count: stats.inquiries.reviewing, color: DS.accent },
                { key: 'answered', count: stats.inquiries.answered, color: DS.okChart },
                { key: 'closed', count: stats.inquiries.closed, color: DS.faint },
              ].map(s => <div key={s.key} style={{ flex: s.count, background: s.color, minWidth: s.count > 0 ? 6 : 0, transition: 'flex 0.4s' }} />)}
            </div>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              {[
                { label: '대기', count: stats.inquiries.waiting, color: DS.warn },
                { label: '검토', count: stats.inquiries.reviewing, color: DS.accent },
                { label: '답변', count: stats.inquiries.answered, color: DS.ok },
                { label: '종결', count: stats.inquiries.closed, color: DS.sub },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: s.color }} />
                  <span className="text-a12" style={{ color: DS.sub }}>{s.label}</span>
                  <span className="text-a14" style={{ fontWeight: 800, color: s.color, ...mono }}>{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ═══ 최근 활동 & 공지 ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 14 }}>
        <div>
          <SectionTitle>최근 문의</SectionTitle>
          <RecentActivity inquiries={recentInquiries} />
        </div>
        <div>
          <SectionTitle>최근 공지사항</SectionTitle>
          <div style={{ ...panel, padding: '14px 18px' }}>
            {recentNotices.length === 0 ? (
              <div className="text-a13" style={{ color: DS.faint, textAlign: 'center', padding: '28px 0' }}>등록된 공지가 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentNotices.map(n => (
                  <div key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: DS.sunken, border: `1px solid ${DS.lineSoft}` }}>
                    <span className="text-a10" style={{
                      fontWeight: 800, padding: '3px 8px', borderRadius: 7,
                      background: n.is_active ? DS.accentSoft : DS.sunken,
                      color: n.is_active ? DS.accentStrong : DS.faint,
                      border: `1px solid ${n.is_active ? DS.accentLine : DS.line}`,
                    }}>{n.is_active ? '활성' : '비활성'}</span>
                    <span className="text-a13" style={{ flex: 1, color: DS.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title || '(제목 없음)'}</span>
                    <span className="text-a11" style={{ color: DS.faint, flexShrink: 0, ...mono }}>{n.created_at?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// 큰 섹션 헤더 — 좌측 브랜드 액센트 바 + 굵은 잉크 타이틀
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px 2px' }}>
      <span style={{ width: 4, height: 16, borderRadius: 99, background: DS.accent }} />
      <span className="text-a15" style={{ fontWeight: 800, color: DS.ink, letterSpacing: '-0.01em' }}>{children}</span>
    </div>
  )
}
