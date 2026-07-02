import { useEffect, useState, useRef } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
} from 'recharts'
import { getTargetInsights } from '../../../lib/api'
import type { TargetInsights } from '../../../types/admin'
import { logAdminAction } from '../../../lib/adminAuditLog'
import { UP, btnSecondary, cardBox } from '../shared/adminTheme'
import { PageHead } from '../ds/DSKit'
import { AdminLoading } from '../shared/AdminState' // 공통 로딩 상태(인라인 스피너+@keyframes 대체)

/* ── Color Palette ──────────────────────────────────────────
   무지개색 금지 — 브랜드 블루/그린/앰버/네이비 계열로 절제(up.* 토큰 기반).
   기존 C.* 키는 그대로 두어 차트 참조 로직은 불변, 값만 토큰으로 교체. */
const C = {
  blue: UP.brand, green: UP.greenChart, orange: UP.amberChart, red: UP.dangerChart,
  purple: UP.strong, cyan: UP.navy, pink: UP.sub, gold: UP.amber,
}
const PIE = [C.blue, C.green, C.orange, C.red, C.purple, C.pink, C.cyan, C.gold]
const TAG_CLR: Record<string, string> = {
  '퇴직금_적격자': C.green, '고액_수급자': C.gold, '장기근속자': C.blue,
  '분쟁_위험군': C.red, '다중_사업장': C.purple, '반복_이용자': C.cyan, '신규_유저': C.pink,
}

/* ── Helpers ─────────────────────────────────────────────── */
function fmtN(n: number) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억`
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}만`
  return n.toLocaleString()
}
function fmtW(n: number) {
  if (n >= 1e8) return `${(n / 1e8).toFixed(1)}억원`
  if (n >= 1e4) return `${Math.round(n / 1e4).toLocaleString()}만원`
  return `${n.toLocaleString()}원`
}

// (P3-b) 공용 cardBox 참조(+padding) — radius 16 통일.
const CARD: React.CSSProperties = { ...cardBox, padding: 'clamp(16px, 3vw, 24px)' }

// 차트 툴팁 — 라이트 톤(과거 다크 #12122a 잔재 제거)
const TT: React.CSSProperties = {
  background: UP.surface, border: `1px solid ${UP.hair}`,
  borderRadius: 10, fontSize: 11, color: UP.navy,
}

const Empty = () => (
  <div className="text-a13" style={{ textAlign: 'center', padding: '28px 0', color: UP.sub, }}>
    데이터 없음
  </div>
)

/* ════════════════════════════════════════════════════════════
   Main Component
   ════════════════════════════════════════════════════════════ */
export default function TargetMenu() {
  const [data, setData] = useState<TargetInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const logged = useRef(false)

  useEffect(() => {
    if (!logged.current) { logged.current = true; logAdminAction('admin.view_target', 'target') }
  }, [])

  const load = async () => {
    setLoading(true); setError(null)
    try { setData(await getTargetInsights()) }
    catch (e: unknown) { setError(e instanceof Error ? e.message : String(e)) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  /* ── Loading ──────────────────────────────────────────── */
  if (loading) return <AdminLoading label="인사이트 데이터를 분석하는 중이에요…" />

  /* ── Error ────────────────────────────────────────────── */
  if (error || !data) return (
    <div style={{ padding: 20 }}>
      <div style={{ ...CARD, background: UP.dangerBg, border: `1px solid ${UP.dangerLine}` }}>
        <div style={{ fontWeight: 700, color: UP.danger, marginBottom: 8 }}>타겟 인사이트 로드 실패</div>
        <div className="text-a13" style={{ color: UP.sub, marginBottom: 16 }}>{error || '데이터를 불러오지 못했습니다.'}</div>
        <button onClick={load} className="text-a13" style={{
          padding: '8px 24px', borderRadius: 10, border: 'none',
          background: `linear-gradient(135deg, ${UP.brand}, ${UP.strong})`,
          color: '#fff', fontWeight: 700, cursor: 'pointer',
        }}>재시도</button>
      </div>
    </div>
  )

  /* ── Destructure ──────────────────────────────────────── */
  const { overview: ov, funnel, companies, segments, revenue } = data
  // API 응답 null safety: 백엔드 버그로 일부 필드가 null로 올 경우 대비
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = data as any
  const demo: TargetInsights['demographics'] | null = raw.demographics ?? data.demographics ?? null
  const inq: TargetInsights['inquiry_analysis'] | null = raw.inquiry_analysis ?? data.inquiry_analysis ?? null
  const tags: TargetInsights['tags'] = raw.tags ?? data.tags ?? []
  const growth: TargetInsights['growth'] = raw.growth ?? data.growth ?? []
  const serviceUsage: TargetInsights['service_usage'] | null = raw.service_usage ?? data.service_usage ?? null

  const funnelSteps = [
    { label: '방문자 (클릭)', value: funnel.visitors, color: UP.caption },
    { label: '가입자', value: funnel.signups, color: C.blue },
    { label: '계산 이용자', value: funnel.calculations, color: C.green },
    { label: '퇴직금 적격', value: funnel.eligible, color: C.gold },
  ]
  const maxFunnel = Math.max(1, ...funnelSteps.map(s => s.value))
  const maxRevSeg = Math.max(1, ...revenue.segments.map(s => s.count))
  const maxHeat = Math.max(1, ...segments.heatmap.flat())
  const revColors = [C.cyan, C.blue, C.green, C.orange, C.gold]

  const STATUS_CLR: Record<string, string> = {
    waiting: C.orange, '대기중': C.orange, reviewing: C.blue,
    answered: C.green, '답변완료': C.green, closed: UP.caption,
  }
  const STATUS_LBL: Record<string, string> = {
    waiting: '대기', '대기중': '대기', reviewing: '검토',
    answered: '답변', '답변완료': '답변', closed: '종결',
  }

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 1440, margin: '0 auto' }}>

      {/* ═══ HEADER ═══════════════════════════════════════ */}
      <PageHead
        icon="🎯"
        title="Target Intelligence"
        subtitle="사용자 인사이트 · 수익 분석 · 세그먼트 분류"
        actions={<button onClick={load} style={{ ...btnSecondary }}>↻ 새로고침</button>}
      />

      {/* ═══ HERO METRICS ═════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {[
          { l: '전체 유저', v: fmtN(ov.total_users), s: `활성 ${fmtN(ov.active_users)}`, c: C.blue, i: '👥' },
          { l: '전환율', v: `${ov.conversion_rate}%`, s: `${ov.total_reports}건 계산`, c: C.green, i: '📊' },
          { l: '적격률', v: `${ov.eligible_rate}%`, s: '퇴직금 수급 가능', c: C.gold, i: '✅' },
          { l: '평균 퇴직금', v: fmtW(ov.avg_severance), s: '적격자 기준', c: C.purple, i: '💰' },
          { l: '마케팅 동의', v: `${ov.marketing_rate}%`, s: `${Math.round(ov.total_users * ov.marketing_rate / 100)}명`, c: C.pink, i: '📩' },
          { l: '온보딩 완료', v: `${ov.onboarding_rate}%`, s: '가입 프로세스', c: C.cyan, i: '🎯' },
        ].map(m => (
          <div key={m.l} style={{
            background: `linear-gradient(145deg, ${m.c}14 0%, ${m.c}05 100%)`,
            border: `1px solid ${m.c}22`, borderRadius: 14,
            padding: 'clamp(10px, 2vw, 16px)', position: 'relative', overflow: 'hidden',
          }}>
            <div className="text-a28" style={{ position: 'absolute', top: -6, right: -4, opacity: 0.06 }}>{m.i}</div>
            <div className="text-a10" style={{ color: UP.caption, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>{m.l}</div>
            <div style={{ fontSize: 'clamp(0.95rem, 2.5vw, 1.25rem)', fontWeight: 800, color: UP.navy, lineHeight: 1.1 }}>{m.v}</div>
            <div className="text-a10" style={{ color: `${m.c}bb`, marginTop: 3, fontWeight: 600 }}>{m.s}</div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${m.c}, transparent)` }} />
          </div>
        ))}
      </div>

      {/* ═══ ACQUISITION FUNNEL ═══════════════════════════ */}
      <div style={{ ...CARD, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 14 }}>
          <span className="text-a13" style={{ fontWeight: 700, color: UP.body }}>Acquisition Funnel</span>
          <span className="text-a10" style={{ color: UP.caption }}>방문 → 가입 → 계산 → 적격</span>
        </div>
        {funnelSteps.map((step, i) => {
          const pct = step.value / maxFunnel * 100
          const prev = i > 0 ? funnelSteps[i - 1].value : null
          const conv = prev && prev > 0 ? (step.value / prev * 100).toFixed(1) : null
          return (
            <div key={step.label} style={{ marginBottom: i < funnelSteps.length - 1 ? 10 : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span className="text-a12" style={{ color: UP.sub, fontWeight: 600 }}>{step.label}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span className="text-a15" style={{ fontWeight: 800, color: UP.navy }}>{step.value.toLocaleString()}</span>
                  {conv && (
                    <span className="text-a10" style={{ fontWeight: 700, color: step.color,
                      background: `${step.color}15`, padding: '1px 7px', borderRadius: 6,
                    }}>{conv}%</span>
                  )}
                </div>
              </div>
              <div style={{ height: 18, background: UP.sunken, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.max(pct, step.value > 0 ? 1 : 0)}%`, height: '100%',
                  background: `linear-gradient(90deg, ${step.color}, ${step.color}55)`,
                  borderRadius: 6, transition: 'width 1s ease-out',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* ═══ REVENUE + COMPANY (2-col) ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">

        {/* Revenue Intelligence */}
        <div style={CARD}>
          <div className="text-a13" style={{ fontWeight: 700, color: UP.body, marginBottom: 2 }}>Revenue Intelligence</div>
          <div className="text-a10" style={{ color: UP.caption, marginBottom: 16 }}>퇴직금 규모별 분석</div>

          <div style={{ display: 'flex', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <div className="text-a10" style={{ color: UP.sub, fontWeight: 600, marginBottom: 2 }}>총 적격 퇴직금</div>
              <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 900, color: C.gold }}>{fmtW(revenue.total_eligible_severance)}</div>
            </div>
            <div>
              <div className="text-a10" style={{ color: UP.sub, fontWeight: 600, marginBottom: 2 }}>고가치 유저 (300만+)</div>
              <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 900, color: C.purple }}>{revenue.high_value_count}명</div>
            </div>
            <div>
              <div className="text-a10" style={{ color: UP.sub, fontWeight: 600, marginBottom: 2 }}>평균 퇴직금</div>
              <div style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 900, color: C.green }}>{fmtW(revenue.avg_severance)}</div>
            </div>
          </div>

          {revenue.segments.map((seg, i) => (
            <div key={seg.label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span className="text-a11" style={{ color: UP.sub, fontWeight: 600 }}>{seg.label}</span>
                <span className="text-a11" style={{ color: UP.body, fontWeight: 700 }}>{seg.count}건 &middot; {fmtW(seg.total)}</span>
              </div>
              <div style={{ height: 8, background: UP.sunken, borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${seg.count / maxRevSeg * 100}%`, height: '100%',
                  background: `linear-gradient(90deg, ${revColors[i]}, ${revColors[i]}77)`,
                  borderRadius: 4, transition: 'width .8s', minWidth: seg.count > 0 ? 4 : 0,
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Company Landscape */}
        <div style={CARD}>
          <div className="text-a13" style={{ fontWeight: 700, color: UP.body, marginBottom: 2 }}>Company Landscape</div>
          <div className="text-a10" style={{ color: UP.caption, marginBottom: 14 }}>사업장별 이용 분포 &middot; 총 {companies.length}개사</div>
          {companies.length > 0 ? (<>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={companies.slice(0, 8)} dataKey="count" nameKey="name"
                  cx="50%" cy="50%" outerRadius="78%" innerRadius="48%"
                  paddingAngle={2} strokeWidth={0}>
                  {companies.slice(0, 8).map((_, i) => <Cell key={i} fill={PIE[i]} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v: number, name: string) => [`${v}건`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 10 }}>
              {companies.slice(0, 10).map((c, i) => {
                const maxC = companies[0]?.count || 1
                return (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span className="text-a10" style={{ color: UP.caption, width: 14, textAlign: 'right' }}>{i + 1}</span>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: PIE[i % PIE.length], flexShrink: 0 }} />
                    <span className="text-a11" style={{ flex: 1, color: UP.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <div style={{ width: 60, height: 4, background: UP.sunken, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                      <div style={{ width: `${c.count / maxC * 100}%`, height: '100%', background: PIE[i % PIE.length], borderRadius: 2 }} />
                    </div>
                    <span className="text-a10" style={{ fontWeight: 700, color: PIE[i % PIE.length], width: 32, textAlign: 'right' }}>{c.count}</span>
                    <span className="text-a10" style={{ color: UP.caption, width: 32, textAlign: 'right' }}>{c.pct}%</span>
                  </div>
                )
              })}
            </div>
          </>) : <Empty />}
        </div>
      </div>

      {/* ═══ SEGMENT ANALYSIS (2-col) ════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <div style={CARD}>
          <div className="text-a13" style={{ fontWeight: 700, color: UP.body, marginBottom: 12 }}>근무기간별 분포</div>
          {segments.by_duration.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={segments.by_duration} layout="vertical" margin={{ top: 0, right: 16, left: 56, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={UP.hairSoft} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: UP.caption }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: UP.sub }} width={52} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [`${v}명`, '인원']} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {segments.by_duration.map((_, i) => <Cell key={i} fill={[C.purple, C.blue, C.green, C.orange][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
        <div style={CARD}>
          <div className="text-a13" style={{ fontWeight: 700, color: UP.body, marginBottom: 12 }}>급여수준별 분포</div>
          {segments.by_wage.some(d => d.count > 0) ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={segments.by_wage} layout="vertical" margin={{ top: 0, right: 16, left: 62, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={UP.hairSoft} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: UP.caption }} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: UP.sub }} width={58} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [`${v}명`, '인원']} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {segments.by_wage.map((_, i) => <Cell key={i} fill={[C.red, C.orange, C.green, C.blue][i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </div>
      </div>

      {/* ═══ CROSS-SEGMENT HEATMAP ═══════════════════════ */}
      <div style={{ ...CARD, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
          <span className="text-a13" style={{ fontWeight: 700, color: UP.body }}>Cross-Segment Matrix</span>
          <span className="text-a10" style={{ color: UP.caption }}>근무기간 x 급여수준</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `76px repeat(${segments.wage_labels.length}, 1fr)`,
            gap: 3, minWidth: 340,
          }}>
            {/* Header */}
            <div />
            {segments.wage_labels.map(l => (
              <div key={l} className="text-a10" style={{ textAlign: 'center', color: UP.caption, padding: '6px 2px', fontWeight: 600 }}>{l}</div>
            ))}
            {/* Rows */}
            {segments.duration_labels.flatMap((rl, ri) => [
              <div key={`rl-${ri}`} className="text-a10" style={{ color: UP.sub, display: 'flex', alignItems: 'center', fontWeight: 600 }}>{rl}</div>,
              ...(segments.heatmap[ri] ?? []).map((val, ci) => {
                const intensity = val / maxHeat
                return (
                  <div key={`c-${ri}-${ci}`} className="text-a13" style={{
                    background: val === 0 ? UP.sunken : `rgba(49,130,246,${0.08 + intensity * 0.6})`,
                    borderRadius: 10, padding: '12px 4px', textAlign: 'center', fontWeight: 700,
                    color: intensity > 0.35 ? '#fff' : UP.sub,
                    border: val === 0 ? `1px solid ${UP.hairSoft}` : `1px solid rgba(49,130,246,${0.12 + intensity * 0.25})`,
                    transition: 'all .3s',
                  }}>
                    {val || <span style={{ opacity: 0.3 }}>-</span>}
                  </div>
                )
              }),
            ])}
          </div>
        </div>
      </div>

      {/* ═══ DEMOGRAPHICS + SMART TAGS (2-col) ═══════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">

        {/* Demographics — demo가 null이면 빈 카드 표시 */}
        <div style={CARD}>
          <div className="text-a13" style={{ fontWeight: 700, color: UP.body, marginBottom: 16 }}>User Demographics</div>
          {demo ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {/* Auth Provider */}
                <div>
                  <div className="text-a10" style={{ color: UP.sub, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>인증 수단</div>
                  {demo.by_provider.length > 0 ? (<>
                    <ResponsiveContainer width="100%" height={110}>
                      <PieChart>
                        <Pie data={demo.by_provider.map(p => ({ name: p.label, value: p.count }))}
                          dataKey="value" nameKey="name" cx="50%" cy="50%"
                          outerRadius="80%" innerRadius="50%" paddingAngle={3} strokeWidth={0}>
                          {demo.by_provider.map((_, i) => <Cell key={i} fill={[C.gold, C.red, C.blue, C.purple][i % 4]} />)}
                        </Pie>
                        <Tooltip contentStyle={TT} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {demo.by_provider.map((p, i) => (
                        <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: [C.gold, C.red, C.blue, C.purple][i % 4] }} />
                          <span className="text-a10" style={{ color: UP.sub, flex: 1 }}>{p.label}</span>
                          <span className="text-a10" style={{ fontWeight: 700, color: UP.body }}>{p.count}</span>
                        </div>
                      ))}
                    </div>
                  </>) : <Empty />}
                </div>
                {/* Marketing Consent */}
                <div>
                  <div className="text-a10" style={{ color: UP.sub, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>마케팅 동의</div>
                  {(() => {
                    const mk = demo.marketing
                    const mdata = [
                      { name: 'SMS', value: mk.sms },
                      { name: '이메일', value: mk.email },
                      { name: '전화', value: mk.phone },
                      { name: '미동의', value: mk.none },
                    ]
                    return (<>
                      <ResponsiveContainer width="100%" height={110}>
                        <PieChart>
                          <Pie data={mdata} dataKey="value" nameKey="name" cx="50%" cy="50%"
                            outerRadius="80%" innerRadius="50%" paddingAngle={3} strokeWidth={0}>
                            {mdata.map((_, i) => <Cell key={i} fill={[C.blue, C.green, C.purple, UP.hair][i]} />)}
                          </Pie>
                          <Tooltip contentStyle={TT} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {mdata.map((d, i) => (
                          <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: [C.blue, C.green, C.purple, UP.hair][i] }} />
                            <span className="text-a10" style={{ color: UP.sub, flex: 1 }}>{d.name}</span>
                            <span className="text-a10" style={{ fontWeight: 700, color: UP.body }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </>)
                  })()}
                </div>
              </div>

              {/* Onboarding Bar */}
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${UP.hair}` }}>
                <div className="text-a11" style={{ color: UP.sub, fontWeight: 600, marginBottom: 6 }}>온보딩 현황</div>
                <div style={{ display: 'flex', gap: 2, height: 8, borderRadius: 99, overflow: 'hidden', marginBottom: 5 }}>
                  <div style={{ flex: Math.max(demo.onboarding_completed, 0.01), background: C.green, transition: 'flex .3s' }} />
                  <div style={{ flex: Math.max(demo.onboarding_pending, 0.01), background: UP.hairSoft, transition: 'flex .3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className="text-a10" style={{ color: C.green, fontWeight: 700 }}>완료 {demo.onboarding_completed}</span>
                  <span className="text-a10" style={{ color: UP.caption, fontWeight: 700 }}>미완료 {demo.onboarding_pending}</span>
                </div>
              </div>
            </>
          ) : <Empty />}
        </div>

        {/* Smart Tags */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
            <span className="text-a13" style={{ fontWeight: 700, color: UP.body }}>Smart User Tags</span>
            <span className="text-a10" style={{ color: UP.caption }}>데이터 기반 자동 분류</span>
          </div>
          {tags.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {tags.map(t => {
                const clr = TAG_CLR[t.tag] || C.purple
                return (
                  <div key={t.tag} style={{
                    background: `${clr}10`, border: `1px solid ${clr}28`,
                    borderRadius: 12, padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    transition: 'all .2s',
                  }}>
                    <span className="text-a12" style={{ color: clr, fontWeight: 700 }}>#{t.tag}</span>
                    <span className="text-a11" style={{ fontWeight: 800,
                      background: `${clr}1a`, color: clr,
                      borderRadius: 8, padding: '2px 9px',
                    }}>{t.count}</span>
                  </div>
                )
              })}
            </div>
          ) : <Empty />}

          {/* Service Usage — serviceUsage null 방어 */}
          {serviceUsage && (
            <div style={{ marginTop: 20, paddingTop: 14, borderTop: `1px solid ${UP.hair}` }}>
              <div className="text-a11" style={{ color: UP.sub, fontWeight: 600, marginBottom: 10 }}>서비스 이용 비율</div>
              {(() => {
                const other = Math.max(serviceUsage.total - serviceUsage.severance - serviceUsage.unemployment, 0)
                const items = [
                  { l: '퇴직금', v: serviceUsage.severance, c: C.blue },
                  { l: '실업급여', v: serviceUsage.unemployment, c: C.green },
                  { l: '기타', v: other, c: UP.caption },
                ]
                const mx = Math.max(1, ...items.map(i => i.v))
                return items.map(item => (
                  <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span className="text-a11" style={{ color: UP.sub, width: 50, flexShrink: 0 }}>{item.l}</span>
                    <div style={{ flex: 1, height: 6, background: UP.sunken, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${item.v / mx * 100}%`, height: '100%', background: item.c, borderRadius: 3, minWidth: item.v > 0 ? 3 : 0 }} />
                    </div>
                    <span className="text-a11" style={{ fontWeight: 700, color: item.c, width: 40, textAlign: 'right' }}>{item.v.toLocaleString()}</span>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ═══ GROWTH TIMELINE ═════════════════════════════ */}
      {growth.length > 1 && (
        <div style={{ ...CARD, marginBottom: 12 }}>
          <div className="text-a13" style={{ fontWeight: 700, color: UP.body, marginBottom: 14 }}>Monthly Growth</div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={growth} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="tgt-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.blue} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.blue} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={UP.hairSoft} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: UP.caption }} />
              <YAxis tick={{ fontSize: 10, fill: UP.caption }} />
              <Tooltip contentStyle={TT} formatter={(v: number) => [`${v}명`, '가입자']} />
              <Area type="monotone" dataKey="count" name="가입자" stroke={C.blue} fill="url(#tgt-grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ═══ INQUIRY INTELLIGENCE — inq null 방어 ════════ */}
      {inq && inq.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Category breakdown */}
          <div style={CARD}>
            <div className="text-a13" style={{ fontWeight: 700, color: UP.body, marginBottom: 14 }}>문의 카테고리 분석</div>
            {inq.by_category.length > 0 ? (
              inq.by_category.slice(0, 6).map((cat, i) => {
                const mx = inq.by_category[0]?.count || 1
                return (
                  <div key={cat.label} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span className="text-a11" style={{ color: UP.sub, fontWeight: 600 }}>{cat.label}</span>
                      <span className="text-a11" style={{ fontWeight: 700, color: PIE[i % PIE.length] }}>{cat.count}건</span>
                    </div>
                    <div style={{ height: 5, background: UP.sunken, borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${cat.count / mx * 100}%`, height: '100%', background: PIE[i % PIE.length], borderRadius: 3 }} />
                    </div>
                  </div>
                )
              })
            ) : <Empty />}
          </div>
          {/* Response metrics */}
          <div style={CARD}>
            <div className="text-a13" style={{ fontWeight: 700, color: UP.body, marginBottom: 14 }}>문의 응답 분석</div>
            <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 16 }}>
              <div style={{ textAlign: 'center', padding: 14, background: UP.sunken, borderRadius: 12 }}>
                <div className="text-a24" style={{ fontWeight: 900, color: C.blue }}>{inq.total}</div>
                <div className="text-a10" style={{ color: UP.caption, marginTop: 2 }}>전체 문의</div>
              </div>
              <div style={{ textAlign: 'center', padding: 14, background: UP.sunken, borderRadius: 12 }}>
                <div className="text-a24" style={{ fontWeight: 900, color: inq.avg_response_hours > 24 ? C.orange : C.green }}>
                  {inq.avg_response_hours > 0 ? `${inq.avg_response_hours}h` : '-'}
                </div>
                <div className="text-a10" style={{ color: UP.caption, marginTop: 2 }}>평균 응답시간</div>
              </div>
            </div>
            <div className="text-a11" style={{ color: UP.sub, fontWeight: 600, marginBottom: 8 }}>상태별 분포</div>
            {inq.by_status.map(s => {
              const clr = STATUS_CLR[s.label] || C.purple
              return (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: clr }} />
                  <span className="text-a11" style={{ color: UP.sub, width: 36 }}>{STATUS_LBL[s.label] || s.label}</span>
                  <div style={{ flex: 1, height: 5, background: UP.sunken, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${inq.total > 0 ? (s.count / inq.total * 100) : 0}%`, height: '100%', background: clr, borderRadius: 3 }} />
                  </div>
                  <span className="text-a11" style={{ fontWeight: 700, color: clr, width: 24, textAlign: 'right' }}>{s.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
