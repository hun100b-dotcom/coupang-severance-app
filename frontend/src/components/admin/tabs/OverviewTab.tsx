// OverviewTab — 어드민 대시보드 [개요] · 월드클래스 리디자인 (2026-07-02)
//   ⚠️ 데이터/로직 불변: getAdminStats/getAdminAnalytics/getAdminInquiries + notices 조회 그대로.
//      프레젠테이션만 새 비주얼(히어로 요약 바 + 프로 카드 + Framer Motion 진입)로 교체.
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { getAdminStats, getAdminAnalytics, getAdminInquiries } from '../../../lib/api'
import type { AdminStats, AnalyticsResponse, AdminInquiry } from '../../../types/admin'
import { logAdminAction } from '../../../lib/adminAuditLog'
import { supabase } from '../../../lib/supabase'
import DailyTrendChart from '../dashboard/DailyTrendChart'
import ServiceBarChart from '../dashboard/ServiceBarChart'
import RecentActivity from '../dashboard/RecentActivity'
import { UP, numeric } from '../shared/adminTheme'
import { HERO_BG, proCard, ELEV, R, fadeUp, containerStagger } from '../shared/adminUI'
import { AdminLoading } from '../shared/AdminState'

function fmtMoney(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`
  if (n >= 10000) return `${Math.round(n / 10000)}만원`
  return `${n.toLocaleString()}원`
}

function getDateRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
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

  if (loading) return <AdminLoading label="대시보드를 불러오는 중이에요…" />

  if (error || !stats) {
    return (
      <div style={{ padding: 'clamp(16px,3vw,32px)' }}>
        <div style={{ ...proCard, padding: 28, borderColor: UP.dangerLine, background: UP.dangerBg }}>
          <div className="text-a16" style={{ fontWeight: 800, color: UP.danger, marginBottom: 8 }}>대시보드 로드 실패</div>
          <div className="text-a13" style={{ color: UP.sub, marginBottom: 16 }}>{error || '데이터를 불러오지 못했습니다.'}</div>
          <button onClick={load} className="text-a13" style={{
            padding: '9px 20px', borderRadius: R.chip, border: 'none',
            background: UP.brand, color: '#fff', fontWeight: 700, cursor: 'pointer',
          }}>다시 시도</button>
        </div>
      </div>
    )
  }

  const conversionRate = stats.users.total > 0 ? Math.round(stats.reports.total / stats.users.total * 100) : 0
  const resolveRate = stats.inquiries.total > 0
    ? Math.round((stats.inquiries.answered + stats.inquiries.closed) / stats.inquiries.total * 100) : 0

  // 히어로 핵심 지표 4종
  const heroStats = [
    { label: '전체 유저',   value: stats.users.total.toLocaleString(), sub: `오늘 +${stats.users.new_today}`, accent: '#7FB2FF' },
    { label: '계산 건수',   value: stats.reports.total.toLocaleString(), sub: `적격 ${stats.reports.eligible}건`, accent: '#5BE7B0' },
    { label: '대기 문의',   value: String(stats.inquiries.waiting), sub: `전체 ${stats.inquiries.total}건`, accent: '#FFD27A' },
    { label: '평균 퇴직금', value: fmtMoney(stats.reports.avg_severance), sub: '적격자 기준', accent: '#B7C8FF' },
  ]

  // 보조 KPI 6종
  const kpis = [
    { label: '채용공고',     value: stats.jobs.total.toLocaleString(), sub: `활성 ${stats.jobs.active}건`, color: UP.navy, icon: '💼' },
    { label: '마케팅 동의',   value: `${stats.users.marketing_agreed}명`, sub: '수신 동의', color: UP.brand, icon: '📧' },
    { label: '이번 주 신규',  value: `+${stats.users.new_this_week}명`, sub: '주간 유입', color: UP.green, icon: '🚀' },
    { label: '총 클릭수',    value: stats.clicks.total.toLocaleString(), sub: '서비스 유입', color: UP.navy, icon: '👁️' },
    { label: '전환율',       value: `${conversionRate}%`, sub: `${stats.users.total}명 중 ${stats.reports.total}건`, color: UP.green, icon: '📈' },
    { label: '문의 해결률',   value: `${resolveRate}%`, sub: `해결 ${stats.inquiries.answered + stats.inquiries.closed}건`, color: UP.strong, icon: '✅' },
  ]

  return (
    <motion.div
      variants={containerStagger} initial="hidden" animate="show"
      style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 1440, margin: '0 auto' }}
    >
      {/* ══ 히어로 요약 바 ══ */}
      <motion.section variants={fadeUp} custom={0} style={{
        borderRadius: R.hero, background: HERO_BG, boxShadow: ELEV.hero,
        padding: 'clamp(22px, 3vw, 34px)', color: '#EAF1FF', marginBottom: 22,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
          <div>
            <div className="text-a13" style={{ color: '#9FB6E6', fontWeight: 700, letterSpacing: '0.02em' }}>
              안녕하세요 👋 CATCH 관리자
            </div>
            <h1 className="text-a30" style={{ fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', margin: '6px 0 0' }}>
              서비스 현황 한눈에
            </h1>
            <div className="text-a12" style={{ color: '#8FA6D6', marginTop: 6 }}>
              최근 {range}일 기준{lastUpdated ? ` · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.08)', padding: 4, borderRadius: R.pill }}>
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setRange(d)} className="text-a12" style={{
                  padding: '6px 14px', borderRadius: R.pill, border: 'none', cursor: 'pointer', fontWeight: 700,
                  background: range === d ? '#fff' : 'transparent',
                  color: range === d ? '#1B2C4E' : '#C9D6F0',
                  transition: 'all 0.15s',
                }}>{d}일</button>
              ))}
            </div>
            <button onClick={load} title="새로고침" className="text-a14" style={{
              width: 38, height: 38, borderRadius: R.chip, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: '#fff',
            }}>↻</button>
          </div>
        </div>

        {/* 큰 지표 4종 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 'clamp(14px,2vw,28px)' }}>
          {heroStats.map((h, i) => (
            <div key={h.label} style={{
              position: 'relative',
              paddingLeft: i === 0 ? 0 : 'clamp(14px,2vw,28px)',
              borderLeft: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.1)',
            }}>
              <div className="text-a11" style={{ color: '#9FB6E6', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {h.label}
              </div>
              <div style={{
                fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', fontWeight: 900, color: '#fff',
                lineHeight: 1.05, marginTop: 8, letterSpacing: '-0.02em',
                fontFamily: "'JetBrains Mono', monospace", ...numeric,
              }}>
                {h.value}
              </div>
              <div className="text-a12" style={{ color: h.accent, fontWeight: 700, marginTop: 6 }}>{h.sub}</div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ══ 보조 KPI 6종 ══ */}
      <SectionTitle>핵심 지표</SectionTitle>
      <motion.div variants={fadeUp} custom={1}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 26 }}>
        {kpis.map(k => (
          <div key={k.label} style={{ ...proCard, padding: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: -14, right: -14, width: 66, height: 66, borderRadius: '50%',
              background: `radial-gradient(circle, ${k.color}1e 0%, transparent 70%)`, pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span className="text-a10" style={{ fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: UP.sub }}>
                {k.label}
              </span>
              <span style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${k.color}14`,
              }}><span className="text-a13">{k.icon}</span></span>
            </div>
            <div style={{ fontSize: 'clamp(1.3rem,2.5vw,1.7rem)', fontWeight: 900, color: k.color, lineHeight: 1.1, letterSpacing: '-0.01em', ...numeric }}>
              {k.value}
            </div>
            {k.sub && <div className="text-a11" style={{ color: UP.caption, marginTop: 6 }}>{k.sub}</div>}
          </div>
        ))}
      </motion.div>

      {/* ══ 추이 차트 ══ */}
      <SectionTitle>유입 추이 & 서비스 클릭</SectionTitle>
      <motion.div variants={fadeUp} custom={2}
        className="grid grid-cols-1 lg:grid-cols-[2fr_1fr]"
        style={{ gap: 14, marginBottom: 26 }}>
        <DailyTrendChart data={analytics?.daily ?? []} />
        <ServiceBarChart severance={stats.clicks.severance} unemployment={stats.clicks.unemployment} />
      </motion.div>

      {/* ══ 문의 상태 분포 ══ */}
      {stats.inquiries.total > 0 && (
        <>
          <SectionTitle>문의 상태 분포</SectionTitle>
          <motion.div variants={fadeUp} custom={3} style={{ ...proCard, padding: '20px 24px', marginBottom: 26 }}>
            <div style={{ display: 'flex', gap: 2, height: 12, borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
              {[
                { key: 'waiting',   count: stats.inquiries.waiting,   color: UP.amberChart },
                { key: 'reviewing', count: stats.inquiries.reviewing, color: UP.brand },
                { key: 'answered',  count: stats.inquiries.answered,  color: UP.greenChart },
                { key: 'closed',    count: stats.inquiries.closed,    color: UP.caption },
              ].map(s => (
                <div key={s.key} style={{ flex: s.count, background: s.color, minWidth: s.count > 0 ? 6 : 0, transition: 'flex 0.4s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
              {[
                { label: '대기', count: stats.inquiries.waiting,   color: UP.amber },
                { label: '검토', count: stats.inquiries.reviewing, color: UP.brand },
                { label: '답변', count: stats.inquiries.answered,  color: UP.green },
                { label: '종결', count: stats.inquiries.closed,    color: UP.sub },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: s.color }} />
                  <span className="text-a12" style={{ color: UP.sub }}>{s.label}</span>
                  <span className="text-a14" style={{ fontWeight: 800, color: s.color, ...numeric }}>{s.count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {/* ══ 최근 활동 & 공지 ══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 14 }}>
        <motion.div variants={fadeUp} custom={4}>
          <SectionTitle>최근 문의</SectionTitle>
          <RecentActivity inquiries={recentInquiries} />
        </motion.div>

        <motion.div variants={fadeUp} custom={5}>
          <SectionTitle>최근 공지사항</SectionTitle>
          <div style={{ ...proCard, padding: '14px 18px' }}>
            {recentNotices.length === 0 ? (
              <div className="text-a13" style={{ color: UP.caption, textAlign: 'center', padding: '28px 0' }}>등록된 공지가 없습니다.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentNotices.map(n => (
                  <div key={n.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12,
                    background: UP.sunken, border: `1px solid ${UP.hairSoft}`,
                  }}>
                    <span className="text-a10" style={{
                      fontWeight: 800, padding: '3px 8px', borderRadius: 7,
                      background: n.is_active ? UP.brandBg : UP.sunken,
                      color: n.is_active ? UP.strong : UP.caption,
                      border: `1px solid ${n.is_active ? UP.brandLine : UP.hair}`,
                    }}>{n.is_active ? '활성' : '비활성'}</span>
                    <span className="text-a13" style={{ flex: 1, color: UP.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.title || '(제목 없음)'}
                    </span>
                    <span className="text-a11" style={{ color: UP.caption, flexShrink: 0, ...numeric }}>{n.created_at?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

// 큰 섹션 헤더 — 좌측 브랜드 액센트 바 + 굵은 타이틀
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 0 12px 2px' }}>
      <span style={{ width: 4, height: 16, borderRadius: 99, background: UP.brand }} />
      <span className="text-a15" style={{ fontWeight: 800, color: UP.navy, letterSpacing: '-0.01em' }}>{children}</span>
    </div>
  )
}
