// 어드민 — 채용현황 대시보드 전면 개편
// 기능: 2단계 필터(사업장→센터), KPI 대시보드, 일별 지원/확정 차트(Recharts), 교대/업무별 분포
import { useEffect, useState, useCallback } from 'react'
import { UP, RADIUS, btnSecondary } from '../shared/adminTheme'
import {
  ComposedChart, Bar, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../../../lib/supabase'

// ── 지원 데이터 로우 타입 ──
interface AppRow {
  id: string
  status: string
  applied_at: string
  work_date: string | null       // 확정 시 입력되는 출근 예정일
  preferred_shift: string | null // morning|afternoon|night|any
  applied_task: string | null    // 지원 업무 텍스트
  job_postings: {
    company_name: string
    center_name: string
  } | null
}

// 일별 차트 포인트 타입
interface DailyPoint {
  date: string      // "M/D" 형식
  applied: number   // 일별 지원자 수
  confirmed: number // 일별 확정자 수 (work_date 기준)
}

// 교대/업무 분포 아이템 타입
interface DistItem {
  label: string
  count: number
  pct: number
}

// 교대 한국어 레이블 매핑
const SHIFT_LABEL: Record<string, string> = {
  morning: '오전', afternoon: '오후', night: '야간', any: '무관',
}

// 공통 셀렉트 스타일 (어두운 배경)
const filterSelectStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 10,
  border: `1px solid ${UP.hair}`,
  background: '#fff', color: UP.navy,
  fontSize: '0.85rem', cursor: 'pointer', outline: 'none',
  flex: 1, minWidth: 160,
}

export default function ConfirmedMenu() {
  // 전체 지원 데이터 (필터 전)
  const [allData, setAllData] = useState<AppRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 활성 공고 수 (보조 KPI pill용)
  const [activePostings, setActivePostings] = useState(0)

  // 공고 목록 (2단계 필터 드롭다운 생성용)
  const [postings, setPostings] = useState<{ company_name: string; center_name: string; status: string }[]>([])

  // 2단계 필터 상태
  const [companyFilter, setCompanyFilter] = useState('all') // 1단계: 사업장
  const [centerFilter,  setCenterFilter]  = useState('all') // 2단계: 센터

  // ── 공고 목록 + 활성 공고 수 로드 ──
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data } = await supabase
        .from('job_postings')
        .select('company_name, center_name, status')
        .neq('status', 'deleted')
      if (!data) return
      const list = data as { company_name: string; center_name: string; status: string }[]
      setPostings(list)
      // status가 'active'인 공고만 활성 공고로 집계
      setActivePostings(list.filter(p => p.status === 'active').length)
    })()
  }, [])

  // DISTINCT 사업장 목록 (필터 드롭다운)
  const companies = [...new Set(postings.map(p => p.company_name).filter(Boolean))]

  // 선택된 사업장에 속한 센터 목록 (사업장 미선택 시 전체 센터)
  const centers = companyFilter === 'all'
    ? [...new Set(postings.map(p => p.center_name).filter(Boolean))]
    : [...new Set(
        postings.filter(p => p.company_name === companyFilter).map(p => p.center_name).filter(Boolean)
      )]

  // ── 전체 지원 데이터 로드 ──
  const fetchData = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('id, status, applied_at, work_date, preferred_shift, applied_task, job_postings(company_name, center_name)')
        .order('applied_at', { ascending: true })
      if (error) throw error
      setAllData((data as unknown as AppRow[]) ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── 필터 적용 ──
  const filtered = allData.filter(row => {
    if (companyFilter !== 'all' && row.job_postings?.company_name !== companyFilter) return false
    if (centerFilter  !== 'all' && row.job_postings?.center_name  !== centerFilter)  return false
    return true
  })

  // ── KPI 집계 ──
  const total     = filtered.length
  const confirmed = filtered.filter(r => r.status === 'confirmed' || r.status === 'completed').length
  const rejected  = filtered.filter(r => r.status === 'rejected').length
  const cancelled = filtered.filter(r => r.status === 'cancelled').length

  // 확정률 = (확정+완료) / 전체
  const confirmRate = total > 0 ? (confirmed / total * 100).toFixed(1) : '0'
  // 취소율 = 취소 ÷ 확정 × 100
  const cancelRate  = confirmed > 0 ? (cancelled / confirmed * 100).toFixed(1) : '0'

  // 채용소요일 = AVG(work_date - applied_at) — 확정/완료이면서 work_date 있는 건만
  const confirmedWithDates = filtered.filter(
    r => (r.status === 'confirmed' || r.status === 'completed') && r.work_date
  )
  const avgHireDay = confirmedWithDates.length > 0
    ? Math.round(
        confirmedWithDates.reduce((sum, r) => {
          const diff = (new Date(r.work_date!).getTime() - new Date(r.applied_at).getTime()) / 86400000
          return sum + Math.max(0, diff)
        }, 0) / confirmedWithDates.length
      )
    : 0

  // 충원율 = 확정 / 전체 지원 (필터 기준)
  const fillRate = total > 0 ? (confirmed / total * 100).toFixed(1) : '0'

  // ── 일별 차트 데이터 생성 (최근 30일) ──
  const dailyMap: Record<string, DailyPoint> = {}
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const isoKey = d.toISOString().slice(0, 10)
    dailyMap[isoKey] = { date: `${d.getMonth() + 1}/${d.getDate()}`, applied: 0, confirmed: 0 }
  }
  filtered.forEach(row => {
    // 지원일 기준 집계
    const applyKey = row.applied_at?.slice(0, 10)
    if (applyKey && dailyMap[applyKey]) dailyMap[applyKey].applied++
    // 확정자는 work_date 기준 집계
    if (row.work_date && dailyMap[row.work_date]) dailyMap[row.work_date].confirmed++
  })
  const dailyData: DailyPoint[] = Object.values(dailyMap)

  // ── 교대별 분포 집계 ──
  const shiftMap: Record<string, number> = {}
  filtered.forEach(r => {
    const s = r.preferred_shift ?? 'any'
    shiftMap[s] = (shiftMap[s] ?? 0) + 1
  })
  const shiftDist: DistItem[] = Object.entries(shiftMap)
    .map(([key, count]) => ({
      label: SHIFT_LABEL[key] ?? key,
      count,
      pct: total > 0 ? Math.round(count / total * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)

  // ── 업무별 분포 집계 (상위 8개) ──
  const taskMap: Record<string, number> = {}
  filtered.forEach(r => {
    if (!r.applied_task) return
    taskMap[r.applied_task] = (taskMap[r.applied_task] ?? 0) + 1
  })
  const taskDist: DistItem[] = Object.entries(taskMap)
    .map(([label, count]) => ({
      label,
      count,
      pct: total > 0 ? Math.round(count / total * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // ── 공통 카드 스타일 ──
  const baseCard: React.CSSProperties = {
    background: '#fff',
    border: `1px solid ${UP.hair}`,
    borderRadius: RADIUS.card, padding: '18px 16px',
  }

  return (
    <div style={{ padding: 'clamp(16px,4vw,32px)', position: 'relative' }}>

      {/* ── 헤더 ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 20, gap: 12, flexWrap: 'wrap',
      }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px', color: UP.navy }}>
            📈 채용현황
          </h2>
          <p style={{ fontSize: '0.8rem', color: UP.sub, margin: 0 }}>
            지원 현황을 사업장·센터별로 분석합니다. 총 {total}명
          </p>
        </div>
        <button onClick={fetchData} style={{ ...btnSecondary }}>
          🔄 새로고침
        </button>
      </div>

      {/* ── 2단계 필터: 사업장 → 센터 ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {/* 1단계: 사업장 선택 */}
        <select
          value={companyFilter}
          onChange={e => { setCompanyFilter(e.target.value); setCenterFilter('all') }}
          style={filterSelectStyle}
        >
          <option value="all" style={{ background: '#fff' }}>전체 사업장</option>
          {companies.map(c => (
            <option key={c} value={c} style={{ background: '#fff' }}>{c}</option>
          ))}
        </select>

        {/* 2단계: 센터 선택 (사업장 선택 시에만 활성화) */}
        <select
          value={centerFilter}
          onChange={e => setCenterFilter(e.target.value)}
          disabled={companyFilter === 'all'}
          style={{ ...filterSelectStyle, opacity: companyFilter === 'all' ? 0.5 : 1 }}
        >
          <option value="all" style={{ background: '#fff' }}>센터 전체</option>
          {centers.map(c => (
            <option key={c} value={c} style={{ background: '#fff' }}>{c}</option>
          ))}
        </select>
      </div>

      {/* ── 에러 ── */}
      {error && (
        <div style={{
          background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          color: UP.danger, fontSize: '0.82rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠️ {error}</span>
          <button onClick={fetchData}
            style={{ background: 'none', border: 'none', color: UP.danger, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
            다시 시도 ↻
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: UP.sub, fontSize: '0.85rem' }}>불러오는 중...</p>
      ) : (
        <>
          {/* ── 2×2 메인 KPI 카드 ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
            marginBottom: 12,
          }}>
            {[
              { label: '전체 지원', value: total,     color: UP.brand, icon: '📋' },
              { label: '출근 확정', value: confirmed, color: UP.green, icon: '✅' },
              { label: '지원 거절', value: rejected,  color: UP.danger, icon: '❌' },
              { label: '취소',      value: cancelled, color: 'rgba(180,180,180,0.8)', icon: '↩️' },
            ].map(card => (
              <div key={card.label} style={{
                background: `${card.color}10`,
                border: `1px solid ${card.color}33`,
                borderRadius: 16, padding: '20px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{card.icon}</div>
                <div style={{ fontSize: '2rem', fontWeight: 900, color: card.color, lineHeight: 1 }}>
                  {card.value}
                </div>
                <div style={{ fontSize: '0.72rem', color: UP.sub, marginTop: 6, fontWeight: 600 }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>

          {/* ── 보조 KPI pill 행 ── */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
            {[
              { label: '확정률',    value: `${confirmRate}%` },
              { label: '취소율',    value: `${cancelRate}%` },
              { label: '채용소요일', value: `${avgHireDay}일` },
              { label: '충원율',    value: `${fillRate}%` },
              { label: '활성공고',  value: `${activePostings}개` },
            ].map(pill => (
              <div key={pill.label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 999,
                background: UP.sunken,
                border: `1px solid ${UP.hair}`,
              }}>
                <span style={{ fontSize: '0.72rem', color: UP.sub }}>{pill.label}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: UP.navy }}>{pill.value}</span>
              </div>
            ))}
          </div>

          {/* ── 일별 지원 vs 확정 차트 (Recharts ComposedChart) ── */}
          <div style={{ ...baseCard, marginBottom: 20 }}>
            <div style={{
              fontSize: '0.72rem', fontWeight: 700,
              color: UP.sub,
              marginBottom: 14, letterSpacing: '0.06em',
              textTransform: 'uppercase' as const,
            }}>
              일별 지원 vs 확정 (최근 30일)
            </div>

            {/* 범례 */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: UP.brand }} />
                <span style={{ fontSize: '0.72rem', color: UP.sub }}>일별 지원자</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 16, height: 2, background: UP.green, borderRadius: 1 }} />
                <span style={{ fontSize: '0.72rem', color: UP.sub }}>일별 확정자</span>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={UP.hairSoft} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: UP.sub, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fill: UP.sub, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: `1px solid ${UP.hair}`,
                    borderRadius: 10,
                    color: UP.navy,
                    fontSize: '0.78rem',
                  }}
                  formatter={(value: number, name: string) => {
                    // 달성률 = 확정 / 지원 표시 (툴팁)
                    if (name === 'applied') return [`${value}명`, '지원자']
                    return [`${value}명`, '확정자']
                  }}
                  labelStyle={{ color: UP.sub, marginBottom: 4 }}
                />
                {/* Bar: 일별 지원자 수 (파랑) */}
                <Bar dataKey="applied" fill={UP.brand} radius={[3, 3, 0, 0]} maxBarSize={20} />
                {/* Line: 일별 확정자 수 (초록) */}
                <Line
                  type="monotone"
                  dataKey="confirmed"
                  stroke={UP.green}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: UP.green }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* ── 교대별/업무별 분포 (2열 섹션) ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}>
            {/* 좌: 교대별 분포 (오전/오후/야간/무관) */}
            <div style={baseCard}>
              <div style={{
                fontSize: '0.72rem', fontWeight: 700,
                color: UP.sub,
                marginBottom: 14, letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
              }}>
                교대별 분포
              </div>

              {shiftDist.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: UP.caption, margin: 0 }}>데이터 없음</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {shiftDist.map(item => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.78rem', color: UP.body }}>{item.label}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: UP.navy }}>
                          {item.count}명 ({item.pct}%)
                        </span>
                      </div>
                      {/* 프로그레스 바 */}
                      <div style={{ height: 6, background: UP.hairSoft, borderRadius: 999 }}>
                        <div style={{
                          height: '100%',
                          width: `${item.pct}%`,
                          background: UP.brand,
                          borderRadius: 999,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 우: 업무별 분포 (상위 8개, applied_task 자유텍스트 기준) */}
            <div style={baseCard}>
              <div style={{
                fontSize: '0.72rem', fontWeight: 700,
                color: UP.sub,
                marginBottom: 14, letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
              }}>
                업무별 분포 (상위 8개)
              </div>

              {taskDist.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: UP.caption, margin: 0 }}>데이터 없음</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {taskDist.map(item => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 8 }}>
                        {/* 긴 업무명은 말줄임 처리 */}
                        <span style={{
                          fontSize: '0.78rem', color: UP.body,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: '60%',
                        }}>{item.label}</span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: UP.navy, flexShrink: 0 }}>
                          {item.count}명 ({item.pct}%)
                        </span>
                      </div>
                      {/* 프로그레스 바 */}
                      <div style={{ height: 6, background: UP.hairSoft, borderRadius: 999 }}>
                        <div style={{
                          height: '100%',
                          width: `${item.pct}%`,
                          background: UP.green,
                          borderRadius: 999,
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 데이터 없음 */}
          {total === 0 && (
            <p style={{ color: UP.caption, fontSize: '0.85rem', textAlign: 'center', padding: '48px 0' }}>
              데이터가 없습니다.
            </p>
          )}
        </>
      )}
    </div>
  )
}
