// 어드민 — 채용 Summary 대시보드 (Phase D-2)
// 사업장별 공고현황, 전환율, 충원율, 일별 트렌드 차트, 채용소요일
import { useEffect, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts'
import { supabase } from '../../../lib/supabase'

// ── 공고 요약 타입 ──
interface JobSummary {
  id: string
  company_name: string
  center_name: string
  status: string
  headcount: number
  section: string
  created_at: string
  expires_at: string | null
  view_count?: number
}

// ── 지원 데이터 타입 ──
interface AppRow {
  id: string
  job_posting_id: string
  status: string
  applied_at: string
  work_confirmed_at: string | null
  job_postings?: { company_name: string; center_name: string; headcount: number } | null
}

export default function RecruitSummaryMenu() {
  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [apps, setApps] = useState<AppRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 필터
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [companies, setCompanies] = useState<string[]>([])

  // 로드
  const fetchData = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    try {
      // 공고 목록 (삭제 제외)
      const { data: jobData, error: jobErr } = await supabase
        .from('job_postings')
        .select('id, company_name, center_name, status, headcount, section, created_at, expires_at, view_count')
        .neq('status', 'deleted')
        .order('created_at', { ascending: false })
      if (jobErr) throw jobErr

      // 지원 데이터
      const { data: appData, error: appErr } = await supabase
        .from('job_applications')
        .select('id, job_posting_id, status, applied_at, work_confirmed_at, job_postings(company_name, center_name, headcount)')
        .order('applied_at', { ascending: false })
      if (appErr) throw appErr

      const jobList = (jobData ?? []) as JobSummary[]
      setJobs(jobList)
      setApps((appData ?? []) as unknown as AppRow[])

      // 사업장 목록
      const uniqueCompanies = [...new Set(jobList.map(j => j.company_name).filter(Boolean))]
      setCompanies(uniqueCompanies)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // ── 사업장 필터 적용 ──
  const filteredJobs = companyFilter === 'all'
    ? jobs
    : jobs.filter(j => j.company_name === companyFilter)

  const filteredApps = companyFilter === 'all'
    ? apps
    : apps.filter(a => a.job_postings?.company_name === companyFilter)

  // ── 전체 KPI 집계 ──
  const kpi = (() => {
    const total     = filteredApps.length
    const confirmed = filteredApps.filter(a => a.status === 'confirmed' || a.status === 'completed').length
    const rejected  = filteredApps.filter(a => a.status === 'rejected').length
    const reviewing = filteredApps.filter(a => a.status === 'reviewing').length
    const activeJobs = filteredJobs.filter(j => j.status === 'active').length
    const closedJobs = filteredJobs.filter(j => j.status !== 'active').length

    // 전환율 = (확정 / 전체 지원) * 100
    const conversionRate = total > 0 ? Math.round(confirmed / total * 100) : 0

    // 총 모집 목표 (활성 공고 headcount 합산)
    const totalHeadcount = filteredJobs
      .filter(j => j.status === 'active')
      .reduce((sum, j) => sum + (j.headcount ?? 0), 0)

    // 충원율 = (확정 / 총 모집 목표) * 100
    const fillRate = totalHeadcount > 0 ? Math.round(confirmed / totalHeadcount * 100) : 0

    // 채용 소요일 (applied_at → work_confirmed_at 평균)
    const days = filteredApps
      .filter(a => a.work_confirmed_at && a.applied_at)
      .map(a => {
        const diff = new Date(a.work_confirmed_at!).getTime() - new Date(a.applied_at).getTime()
        return Math.round(diff / (1000 * 60 * 60 * 24))
      })
      .filter(d => d >= 0 && d < 365)  // 비정상 값 제외
    const avgDays = days.length > 0 ? Math.round(days.reduce((s, d) => s + d, 0) / days.length) : null

    return { total, confirmed, rejected, reviewing, activeJobs, closedJobs, conversionRate, fillRate, avgDays, totalHeadcount }
  })()

  // ── 사업장별 집계 ──
  const companyStats = (() => {
    const map: Record<string, {
      company: string
      activeJobs: number
      closedJobs: number
      headcount: number
      applied: number
      confirmed: number
      rejected: number
    }> = {}

    jobs.forEach(j => {
      const key = j.company_name
      if (!map[key]) map[key] = { company: key, activeJobs: 0, closedJobs: 0, headcount: 0, applied: 0, confirmed: 0, rejected: 0 }
      if (j.status === 'active') {
        map[key].activeJobs++
        map[key].headcount += j.headcount ?? 0
      } else {
        map[key].closedJobs++
      }
    })

    apps.forEach(a => {
      const key = a.job_postings?.company_name ?? '기타'
      if (!map[key]) map[key] = { company: key, activeJobs: 0, closedJobs: 0, headcount: 0, applied: 0, confirmed: 0, rejected: 0 }
      map[key].applied++
      if (a.status === 'confirmed' || a.status === 'completed') map[key].confirmed++
      else if (a.status === 'rejected') map[key].rejected++
    })

    return Object.values(map)
  })()

  // ── 일별 트렌드 (최근 14일) ──
  const dailyTrend = (() => {
    const days = 14
    const result: { date: string; 지원: number; 확정: number; 거절: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      const next = new Date(d); next.setDate(d.getDate() + 1)
      const dayApps = filteredApps.filter(a => {
        const t = new Date(a.applied_at)
        return t >= d && t < next
      })
      result.push({
        date:  `${d.getMonth() + 1}/${d.getDate()}`,
        지원:   dayApps.length,
        확정:   dayApps.filter(a => a.status === 'confirmed' || a.status === 'completed').length,
        거절:   dayApps.filter(a => a.status === 'rejected').length,
      })
    }
    return result
  })()

  // ── 사업장별 바 차트 데이터 ──
  const companyBarData = companyStats.map(s => ({
    name: s.company.length > 8 ? s.company.slice(0, 8) + '…' : s.company,
    지원: s.applied,
    확정: s.confirmed,
    목표: s.headcount,
  }))

  // CSV 내보내기
  const handleExportCsv = () => {
    const BOM = '\uFEFF'
    const header = ['사업장', '활성공고', '마감공고', '모집목표', '전체지원', '확정', '거절', '전환율(%)']
    const rows = companyStats.map(s => {
      const rate = s.applied > 0 ? Math.round(s.confirmed / s.applied * 100) : 0
      return [s.company, s.activeJobs, s.closedJobs, s.headcount, s.applied, s.confirmed, s.rejected, rate]
    })
    const csv = BOM + [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `채용Summary_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const thStyle: React.CSSProperties = {
    padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.4)', fontWeight: 600,
    fontSize: '0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em',
  }
  const cellStyle: React.CSSProperties = {
    padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', verticalAlign: 'middle',
  }

  return (
    <div style={{ padding: 'clamp(16px,4vw,32px)', position: 'relative' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px' }}>📈 채용 Summary</h2>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            채용 전반 현황 및 전환율 분석
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* 사업장 필터 */}
          <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.12)',
              background: '#1a1a2e', color: '#fff', /* 불투명 배경: option 텍스트 가시성 확보 */
              fontSize: '0.82rem', cursor: 'pointer', outline: 'none',
            }}>
            <option value="all" style={{ background: '#1a1a2e', color: '#fff' }}>전체 사업장</option>
            {companies.map(c => <option key={c} value={c} style={{ background: '#1a1a2e', color: '#fff' }}>{c}</option>)}
          </select>
          <button onClick={fetchData}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            }}>
            ↻ 새로고침
          </button>
          <button onClick={handleExportCsv}
            style={{
              padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(49,200,100,0.1)', color: '#3fc878',
              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
            }}>
            📥 CSV
          </button>
        </div>
      </div>

      {/* 에러 */}
      {error && (
        <div style={{
          background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          color: '#ff6b6b', fontSize: '0.82rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>불러오는 중...</p>
      ) : (
        <>
          {/* ── KPI 카드 ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
            {[
              { label: '전체 지원',  value: kpi.total,       color: '#3182f6' },
              { label: '검토중',     value: kpi.reviewing,   color: '#ffb400' },
              { label: '출근확정',   value: kpi.confirmed,   color: '#3fc878' },
              { label: '지원거절',   value: kpi.rejected,    color: '#f04452' },
              { label: '활성 공고',  value: kpi.activeJobs,  color: '#a78bfa' },
              { label: '전환율',     value: `${kpi.conversionRate}%`, color: '#3fc878', isStr: true },
              { label: '충원율',     value: `${kpi.fillRate}%`,       color: kpi.fillRate >= 80 ? '#3fc878' : '#ffb400', isStr: true },
              { label: '채용소요일', value: kpi.avgDays !== null ? `${kpi.avgDays}일` : '-', color: '#60a5fa', isStr: true },
            ].map(k => (
              <div key={k.label} style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '16px 14px',
              }}>
                <div style={{ fontSize: '1.9rem', fontWeight: 900, color: k.color, lineHeight: 1 }}>
                  {k.value}
                </div>
                <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>{k.label}</div>
              </div>
            ))}
          </div>

          {/* ── 일별 트렌드 차트 ── */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 14, padding: '20px 16px', marginBottom: 24,
          }}>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 16px' }}>
              📈 일별 지원 트렌드 (최근 14일)
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={dailyTrend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}
                />
                <Line type="monotone" dataKey="지원" stroke="#3182f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="확정" stroke="#3fc878" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="거절" stroke="#f04452" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, justifyContent: 'center' }}>
              {[{ label: '지원', color: '#3182f6' }, { label: '확정', color: '#3fc878' }, { label: '거절', color: '#f04452' }].map(l => (
                <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                  <span style={{ width: 12, height: 3, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>

          {/* ── 사업장별 막대 차트 ── */}
          {companyBarData.length > 0 && (
            <div style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 14, padding: '20px 16px', marginBottom: 24,
            }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', margin: '0 0 16px' }}>
                🏢 사업장별 지원 현황
              </p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={companyBarData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }} />
                  <Bar dataKey="지원" fill="#3182f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="확정" fill="#3fc878" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="목표" fill="rgba(255,255,255,0.12)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── 사업장별 상세 테이블 ── */}
          <div style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 14, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <th style={thStyle}>사업장</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>활성공고</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>마감공고</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>모집목표</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>전체지원</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>확정</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>거절</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>전환율</th>
                    <th style={{ ...thStyle, textAlign: 'center', width: 80 }}>충원율</th>
                  </tr>
                </thead>
                <tbody>
                  {companyStats.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ ...cellStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                        데이터가 없습니다.
                      </td>
                    </tr>
                  )}
                  {companyStats.map(stat => {
                    const convRate  = stat.applied > 0 ? Math.round(stat.confirmed / stat.applied * 100) : 0
                    const fillRate  = stat.headcount > 0 ? Math.round(stat.confirmed / stat.headcount * 100) : 0
                    return (
                      <tr key={stat.company}>
                        <td style={{ ...cellStyle, fontWeight: 700 }}>{stat.company}</td>
                        <td style={{ ...cellStyle, textAlign: 'center', color: '#a78bfa' }}>{stat.activeJobs}</td>
                        <td style={{ ...cellStyle, textAlign: 'center', color: 'rgba(255,255,255,0.35)' }}>{stat.closedJobs}</td>
                        <td style={{ ...cellStyle, textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{stat.headcount}</td>
                        <td style={{ ...cellStyle, textAlign: 'center', color: '#3182f6' }}>{stat.applied}</td>
                        <td style={{ ...cellStyle, textAlign: 'center', color: '#3fc878' }}>{stat.confirmed}</td>
                        <td style={{ ...cellStyle, textAlign: 'center', color: '#f04452' }}>{stat.rejected}</td>
                        <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 700, color: convRate >= 50 ? '#3fc878' : '#ffb400' }}>
                          {convRate}%
                        </td>
                        <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 700, color: fillRate >= 80 ? '#3fc878' : fillRate >= 50 ? '#ffb400' : '#f04452' }}>
                          {fillRate}%
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
