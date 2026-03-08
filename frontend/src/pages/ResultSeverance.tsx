import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import GlassCard from '../components/GlassCard'
import { PrimaryButton, SecondaryButton } from '../components/Button'
import {
  SeverancePreciseResult, SeveranceSimpleResult, EmploymentReport, BlockItem,
} from '../lib/api'
import { fmt } from '../lib/constants'

interface Props {
  result: SeverancePreciseResult | SeveranceSimpleResult
  resultType: 'precise' | 'simple'
  company: string
  onReset: () => void
}

function isPrecise(r: SeverancePreciseResult | SeveranceSimpleResult): r is SeverancePreciseResult {
  return 'eligible' in r
}

// ── 아코디언 헤더 ──────────────────────────────────────────
function AccordionHeader({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <div
      className={`report-accordion-header ${open ? 'open' : ''}`}
      onClick={onClick}
      role="button"
      aria-expanded={open}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '1.2rem' }}>📋</span>
        <div>
          <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--toss-text)', letterSpacing: '-0.01em' }}>
            상세 분석 리포트
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--toss-text-3)', marginTop: 2 }}>
            근로 기간 · 평균임금 산정 · 수급 자격 · 노무사 코멘트
          </p>
        </div>
      </div>
      <span className={`report-accordion-chevron ${open ? 'open' : ''}`}>▼</span>
    </div>
  )
}

// ── [1] 근로 기간 분석 ─────────────────────────────────────
function Section1Period({ r }: { r: EmploymentReport }) {
  const [gapOpen, setGapOpen] = useState(false)
  const years  = Math.floor(r.total_calendar_days / 365)
  const months = Math.floor((r.total_calendar_days % 365) / 30)

  return (
    <div className="report-section">
      <div className="report-section-title">
        <span className="section-num">1</span>
        근로 기간 분석
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
        {[
          { label: '첫 근무일', value: r.first_work_date },
          { label: '마지막 근무일', value: r.last_work_date },
          { label: '전체 캘린더 기간', value: `${r.total_calendar_days}일 (약 ${years}년 ${months}개월)` },
        ].map(row => (
          <div key={row.label} className="stat-row" style={{ padding: '8px 0' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--toss-text-2)' }}>{row.label}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* 28일 블록 기준 인정 근속기간 공식 */}
      <div className="formula-box" style={{ marginBottom: 14 }}>
        <div>전체 캘린더 기간  {r.total_calendar_days}일</div>
        <div>28일 역산 블록  {r.blocks.length}개 산정</div>
        <div>적격 블록  {r.blocks.filter(b => b.qualifies).length}개 (블록 내 근무일 ≥ 8일)</div>
        <div className="formula-result">
          ▶ 인정 근속기간  {r.qualifying_days}일 (기준: 365일)
        </div>
      </div>

      {/* 근로 단절 구간 (3개월 이상 미근무) */}
      {r.segments.length > 1 && (
        <div style={{ marginBottom: 14, padding: '12px 14px', background: 'rgba(240,68,82,0.06)', borderRadius: 12, border: '1px solid rgba(240,68,82,0.15)' }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cc2233', marginBottom: 8 }}>
            ⚠️ 근로 단절 {r.segments.length - 1}회 감지 (3개월 이상 미근무)
          </p>
          {r.segments.map(s => (
            <div key={s.seg_idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: '0.82rem' }}>
              <span style={{ color: s.eligible ? '#00a876' : '#cc2233', fontWeight: 700 }}>
                {s.eligible ? '✓' : '✗'}
              </span>
              <span style={{ color: 'var(--toss-text-2)' }}>
                구간 {s.seg_idx + 1}: {s.first_date} ~ {s.last_date}
              </span>
              <span style={{ marginLeft: 'auto', fontWeight: 700, color: s.eligible ? '#00a876' : '#cc2233' }}>
                {s.qualifying_days}일
              </span>
            </div>
          ))}
        </div>
      )}

      {/* 공백 기간 상세 (2주 이상 공백, 접기/펼치기) */}
      {r.work_gaps.length > 0 && (
        <div style={{ marginTop: 2 }}>
          <button
            onClick={() => setGapOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.8rem', fontWeight: 700, color: 'var(--toss-text-3)',
              padding: '4px 0', marginBottom: 6,
            }}
          >
            <span style={{ transition: 'transform 0.2s', transform: gapOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            공백 기간 상세 ({r.work_gaps.length}회)
          </button>
          {gapOpen && r.work_gaps.map((g, i) => (
            <div key={i} className="gap-badge">
              <span>🔴</span>
              <span>{g.from_date} ~ {g.to_date}</span>
              <span style={{ opacity: 0.7 }}>({g.gap_weeks}주 / {g.gap_days}일)</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── [2] 평균임금 산정 내역 ─────────────────────────────────
function Section2Wage({ r, avgWage }: {
  r: EmploymentReport
  avgWage: number
}) {
  return (
    <div className="report-section">
      <div className="report-section-title">
        <span className="section-num">2</span>
        평균임금 산정 내역
        <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--toss-text-3)', textTransform: 'none' }}>
          (근로자퇴직급여보장법 제2조)
        </span>
      </div>

      <div style={{ fontSize: '0.82rem', color: 'var(--toss-text-2)', marginBottom: 12 }}>
        퇴직일 이전 3개월간의 임금총액을 총 일수로 나눠 산출합니다.
      </div>

      <div className="formula-box" style={{ marginBottom: 14 }}>
        <div>산정 기간  {r.avg_period_start || '—'} ~ {r.avg_period_end || '—'}</div>
        <div>총 지급액  {fmt(Math.round(r.avg_total_pay_in_period))}</div>
        <div>근무 일수  {r.avg_total_days_in_period}일</div>
        <div className="formula-result">
          ▶ 평균임금  {fmt(Math.round(avgWage))} / 일
        </div>
      </div>

      <div style={{ fontSize: '0.78rem', color: 'var(--toss-text-3)', lineHeight: 1.6 }}>
        ※ 일용직의 경우 시간급이 아닌 일급 기준으로 산정하며,
        PDF 데이터 기준으로 계산된 추정치입니다.
      </div>
    </div>
  )
}

// ── [3] 퇴직금 산정 공식 ───────────────────────────────────
function Section3Formula({ avgWage, workDays, severance }: {
  avgWage: number
  workDays: number
  severance: number
}) {
  const years  = Math.floor(workDays / 365)
  const months = Math.floor((workDays % 365) / 30)

  return (
    <div className="report-section">
      <div className="report-section-title">
        <span className="section-num">3</span>
        퇴직금 산정 공식
        <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--toss-text-3)', textTransform: 'none' }}>
          (근로자퇴직급여보장법 제8조)
        </span>
      </div>

      <div className="formula-box">
        <div>퇴직금 = 평균임금 × 30일 × (근속일수 ÷ 365)</div>
        <div style={{ marginTop: 8, opacity: 0.7, fontSize: '0.78rem' }}>
          = {fmt(Math.round(avgWage))} × 30 × ({workDays}일 ÷ 365)
        </div>
        <div style={{ opacity: 0.7, fontSize: '0.78rem' }}>
          = {fmt(Math.round(avgWage))} × 30 × {(workDays / 365).toFixed(3)}
        </div>
        <div className="formula-result">
          ▶ 예상 퇴직금  {fmt(Math.round(severance))} (세전)
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--toss-text-3)', lineHeight: 1.6 }}>
        ※ 근속기간 {years}년 {months}개월 ({workDays}일) 기준 추정치입니다.
        실제 지급액은 세금(소득세·지방소득세) 공제 후 달라질 수 있습니다.
      </div>
    </div>
  )
}

// ── [4] 수급 자격 판단 (28일 블록 기반) ───────────────────
function BlockCard({ block }: { block: BlockItem }) {
  const color = block.qualifies ? '#00a876' : '#cc2233'
  const bg    = block.qualifies ? 'rgba(0,196,140,0.07)' : 'rgba(240,68,82,0.06)'
  const border = block.qualifies ? 'rgba(0,196,140,0.2)' : 'rgba(240,68,82,0.18)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 12px', borderRadius: 10,
      background: bg, border: `1px solid ${border}`,
      marginBottom: 6,
    }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 800, color, minWidth: 16 }}>
        {block.qualifies ? '✓' : '✗'}
      </span>
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--toss-text-2)' }}>
          {block.start.slice(5)} ~ {block.end.slice(5)}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--toss-text-3)', marginLeft: 8 }}>
          ({block.block_days}일)
        </span>
      </div>
      <div style={{ textAlign: 'right' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>
          {block.work_days}일
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--toss-text-3)', marginLeft: 4 }}>
          ({block.avg_weekly_hours}h/주)
        </span>
      </div>
    </div>
  )
}

function Section4Eligibility({ r, eligible }: { r: EmploymentReport; eligible: boolean }) {
  const [showAllBlocks, setShowAllBlocks] = useState(false)
  const neededDays = Math.max(0, 365 - r.qualifying_days)
  const pctQ = Math.min(100, (r.qualifying_days / 365) * 100)

  const qualifyingBlocks    = r.blocks.filter(b => b.qualifies)
  const nonQualifyingBlocks = r.blocks.filter(b => !b.qualifies)

  // 최근 N블록 표시 (역순 정렬 후 slice)
  const recentBlocks = [...r.blocks].reverse().slice(0, showAllBlocks ? r.blocks.length : 8)

  const badMonths = [...r.monthly_summary]
    .filter(m => m.non_qualifying > 0)
    .sort((a, b) => b.non_qualifying - a.non_qualifying)
    .slice(0, 5)

  return (
    <div className="report-section">
      <div className="report-section-title">
        <span className="section-num">4</span>
        수급 자격 판단
        <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--toss-text-3)', textTransform: 'none' }}>
          (28일 역산 블록 기준)
        </span>
      </div>

      {/* 인정 근속기간 진행 바 */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginBottom: 2 }}>인정 근속기간</p>
            <p style={{ fontSize: '1.8rem', fontWeight: 900, fontFamily: "'Inter', sans-serif", lineHeight: 1, color: eligible ? '#00a876' : 'var(--toss-blue)' }}>
              {r.qualifying_days}
              <span style={{ fontSize: '0.9rem', fontWeight: 600, marginLeft: 4 }}>일</span>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--toss-text-3)' }}>기준 365일</p>
            {!eligible && neededDays > 0 && (
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cc2233' }}>
                {neededDays}일 부족
              </p>
            )}
          </div>
        </div>
        <div style={{ height: 14, borderRadius: 7, background: 'rgba(200,210,230,0.4)', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            width: `${pctQ}%`,
            height: '100%',
            background: eligible
              ? 'linear-gradient(90deg, #00c48c, #00a876)'
              : 'linear-gradient(90deg, #3182f6, #5a9ef8)',
            borderRadius: 7,
            transition: 'width 0.8s cubic-bezier(0.22, 1, 0.36, 1)',
          }} />
          {/* 365일 마커 */}
          <div style={{
            position: 'absolute', top: 0, left: '100%', transform: 'translateX(-2px)',
            width: 2, height: '100%', background: 'rgba(0,0,0,0.15)',
          }} />
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: '0.75rem' }}>
          <span style={{ color: '#00a876' }}>● 적격 블록 {qualifyingBlocks.length}개</span>
          <span style={{ color: '#cc2233' }}>● 미달 블록 {nonQualifyingBlocks.length}개</span>
          <span style={{ color: 'var(--toss-text-3)', marginLeft: 'auto' }}>{pctQ.toFixed(1)}%</span>
        </div>
      </div>

      {/* 요약 뱃지 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'rgba(0,196,140,0.08)', border: '1px solid rgba(0,196,140,0.2)' }}>
          <p className="label-sm" style={{ marginBottom: 3, color: '#00a876' }}>적격 블록</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00a876', fontFamily: "'Inter', sans-serif" }}>
            {qualifyingBlocks.length}
            <span style={{ fontSize: '0.8rem', fontWeight: 600, marginLeft: 2 }}>개</span>
          </p>
          <p style={{ fontSize: '0.72rem', color: '#00a876', opacity: 0.7 }}>= {qualifyingBlocks.reduce((s, b) => s + b.block_days, 0)}일</p>
        </div>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: 12, background: 'rgba(240,68,82,0.06)', border: '1px solid rgba(240,68,82,0.15)' }}>
          <p className="label-sm" style={{ marginBottom: 3, color: '#cc2233' }}>미달 블록</p>
          <p style={{ fontSize: '1.4rem', fontWeight: 900, color: '#cc2233', fontFamily: "'Inter', sans-serif" }}>
            {nonQualifyingBlocks.length}
            <span style={{ fontSize: '0.8rem', fontWeight: 600, marginLeft: 2 }}>개</span>
          </p>
          <p style={{ fontSize: '0.72rem', color: '#cc2233', opacity: 0.7 }}>블록 내 근무일 &#60; 8일</p>
        </div>
      </div>

      {/* 블록 상세 목록 */}
      {r.blocks.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--toss-text-2)', marginBottom: 10 }}>
            28일 블록 현황 (최근순)
          </p>
          <div style={{ fontSize: '0.72rem', color: 'var(--toss-text-3)', marginBottom: 8 }}>
            블록 내 근무일 ≥ 8일 (4주 평균 ≥ 15시간/주) → 적격
          </div>
          {recentBlocks.map((b, i) => (
            <BlockCard key={`${b.start}-${i}`} block={b} />
          ))}
          {r.blocks.length > 8 && (
            <button
              onClick={() => setShowAllBlocks(o => !o)}
              style={{
                width: '100%', padding: '8px', marginTop: 4,
                background: 'none', border: '1px solid rgba(49,130,246,0.2)',
                borderRadius: 10, cursor: 'pointer',
                fontSize: '0.8rem', color: 'var(--toss-blue)', fontWeight: 600,
              }}
            >
              {showAllBlocks ? '▲ 접기' : `▼ 전체 ${r.blocks.length}개 블록 보기`}
            </button>
          )}
        </div>
      )}

      {/* 미달 월 상세 */}
      {badMonths.length > 0 && (
        <div>
          <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cc2233', marginBottom: 10 }}>
            미달 발생 월 (상위 {badMonths.length})
          </p>
          {badMonths.map(m => (
            <div key={m.month} className="month-row">
              <span className="month-label">{m.month}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {Array.from({ length: m.total_weeks }).map((_, i) => (
                  <span
                    key={i}
                    className={`month-pip ${i < m.qualifying_weeks ? 'ok' : 'fail'}`}
                  >
                    {i < m.qualifying_weeks ? '✓' : '✗'}
                  </span>
                ))}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--toss-text-3)', marginLeft: 4 }}>
                {m.total_weeks}주 중 {m.non_qualifying}주 미달
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── [5] 동적 노무사 코멘트 ─────────────────────────────────
function Section5Attorney({ comment }: { comment: string }) {
  return (
    <div className="report-section">
      <div className="report-section-title">
        <span className="section-num">5</span>
        노무사 코멘트
        <span style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--toss-text-3)', textTransform: 'none' }}>
          (데이터 기반 자동 생성)
        </span>
      </div>
      <div className="attorney-box">{comment}</div>
      <p style={{ fontSize: '0.72rem', color: 'var(--toss-text-3)', marginTop: 10, lineHeight: 1.5 }}>
        ※ 이 코멘트는 업로드된 PDF 데이터를 분석하여 자동 생성된 참고 의견입니다.
        법적 효력이 없으며, 정확한 판단은 전문 노무사 상담을 통해 확인하세요.
      </p>
    </div>
  )
}


// ── 메인 결과 화면 ─────────────────────────────────────────
export default function ResultSeverance({ result, resultType, company, onReset }: Props) {
  const navigate = useNavigate()
  const [reportOpen, setReportOpen] = useState(false)

  const precise      = isPrecise(result)
  const severance    = result.severance
  const workDays     = result.work_days
  const avgWage      = result.average_wage
  const eligible     = precise ? result.eligible : true
  const eligMsg      = precise ? result.eligibility_message : null
  const weeklyData   = precise ? result.weekly_data : []
  const payData      = precise ? result.pay_data    : []
  const report       = precise ? result.report      : undefined
  const qualifyDays  = precise ? result.qualifying_days : null

  return (
    <div
      style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px 56px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>

        {/* ── 히어로 카드 ─────────────────────────────── */}
        <GlassCard className="p-8" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--toss-text-3)' }}>{company}</span>
            <span className={eligible ? 'badge-eligible' : 'badge-ineligible'}>
              {eligible ? '✓ 수급 가능' : '✗ 요건 미충족'}
            </span>
          </div>

          <div style={{ marginBottom: 4 }}>
            <p className="label-sm" style={{ marginBottom: 8 }}>예상 퇴직금</p>
            <p className="num-hero">
              <span className={`num-digits ${!eligible ? 'ineligible' : ''}`}>
                {Math.round(severance).toLocaleString('ko-KR')}
              </span>
              <span className={`num-unit ${!eligible ? 'ineligible' : ''}`}>원</span>
            </p>
          </div>

          {eligMsg && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                background: eligible ? 'rgba(0,196,140,0.08)' : 'rgba(240,68,82,0.06)',
                borderRadius: 10,
                fontSize: '0.85rem',
                color: eligible ? '#00a876' : '#cc2233',
                fontWeight: 600,
                lineHeight: 1.5,
              }}
            >
              {eligMsg}
            </div>
          )}
        </GlassCard>

        {/* ── 핵심 지표 ───────────────────────────────── */}
        <GlassCard className="p-6" style={{ marginBottom: 16 }}>
          <h3 className="heading-md" style={{ marginBottom: 14 }}>상세 내역</h3>
          {[
            { label: '평균 일당', value: fmt(Math.round(avgWage)) },
            {
              label: '계속 근로 기간',
              value: `약 ${Math.floor(workDays / 365)}년 ${Math.floor((workDays % 365) / 30)}개월`,
            },
            { label: '총 근무일수', value: `${workDays.toLocaleString()}일` },
            ...(qualifyDays !== null ? [{ label: '인정 근속기간', value: `${qualifyDays}일` }] : []),
            ...(precise && resultType === 'precise'
              ? [{ label: '최근 3개월 총 지급액', value: fmt(Math.round(result.total_pay)) }]
              : []),
          ].map(row => (
            <div key={row.label} className="stat-row">
              <span style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', fontWeight: 500 }}>{row.label}</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--toss-text)' }}>{row.value}</span>
            </div>
          ))}
        </GlassCard>

        {/* ── 주별 근무 차트 ──────────────────────────── */}
        {weeklyData.length > 0 && (
          <GlassCard className="p-6" style={{ marginBottom: 16 }}>
            <h3 className="heading-md" style={{ marginBottom: 4 }}>📅 주별 근무일수</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginBottom: 14 }}>최근 3개월 기준</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={weeklyData} barSize={14}>
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10, fill: 'var(--toss-text-3)' }}
                  tickFormatter={v => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [`${v}일`, '근무일수']}
                  contentStyle={{
                    background: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(200,210,230,0.5)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="days" fill="var(--toss-blue)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        )}

        {/* ── 일별 지급액 차트 ────────────────────────── */}
        {payData.length > 0 && (
          <GlassCard className="p-6" style={{ marginBottom: 16 }}>
            <h3 className="heading-md" style={{ marginBottom: 4 }}>💰 일별 지급액</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)', marginBottom: 14 }}>최근 3개월 기준</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={payData}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--toss-text-3)' }}
                  tickFormatter={v => v.slice(5)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  formatter={(v: number) => [fmt(Math.round(v)), '지급액']}
                  contentStyle={{
                    background: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(200,210,230,0.5)',
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="pay" stroke="var(--toss-blue)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        )}

        {/* ── 상세 분석 리포트 아코디언 ───────────────── */}
        {report && (
          <div style={{ marginBottom: 16 }}>
            <AccordionHeader open={reportOpen} onClick={() => setReportOpen(o => !o)} />
            <div className={`report-accordion-body ${reportOpen ? 'open' : ''}`}>
              <Section1Period r={report} />
              <Section2Wage r={report} avgWage={avgWage} />
              <Section3Formula
                avgWage={avgWage}
                workDays={workDays}
                severance={severance}
              />
              <Section4Eligibility r={report} eligible={eligible} />
              <Section5Attorney comment={report.attorney_comment} />
            </div>
          </div>
        )}

        {/* ── 참고 안내 ────────────────────────────────── */}
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.5)',
            borderRadius: 12,
            marginBottom: 20,
            fontSize: '0.78rem',
            color: 'var(--toss-text-3)',
            lineHeight: 1.6,
            backdropFilter: 'blur(10px)',
          }}
        >
          ℹ️ 이 결과는 참고용이에요. 정확한 퇴직금은 회사 급여 기록과 노무사 상담을 통해 확인해 주세요.
        </div>

        {/* ── 액션 버튼 ────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryButton onClick={onReset}>다시 계산하기</PrimaryButton>
          <SecondaryButton onClick={() => navigate('/')}>← 홈으로</SecondaryButton>
        </div>
      </div>
    </div>
  )
}
