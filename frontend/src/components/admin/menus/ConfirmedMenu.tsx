// 어드민 — 채용현황 대시보드 (Step 2 개편)
// 사업장별 지원 현황(지원/검토중/확정/반려/취소)을 KPI 카드 + 스택 바 차트로 표시
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

// ── 사업장별 집계 타입 ──
interface CompanyStat {
  company: string
  applied: number    // 지원완료
  reviewing: number  // 검토중
  confirmed: number  // 출근확정
  completed: number  // 출근완료
  rejected: number   // 반려
  cancelled: number  // 취소
  total: number      // 전체 합산
}

// 집계용 행 타입 (Supabase JOIN 결과)
interface AppRow {
  id: string
  status: string
  job_postings: { company_name: string } | null
}

// 빈 집계 초기값
const EMPTY: Omit<CompanyStat, 'company'> = {
  applied: 0, reviewing: 0, confirmed: 0, completed: 0, rejected: 0, cancelled: 0, total: 0,
}

// 상태별 색상 + 레이블 설정
const STATUS_CONFIG = [
  { key: 'applied'   as const, label: '지원완료', color: '#3182f6', bg: 'rgba(49,130,246,0.15)' },
  { key: 'reviewing' as const, label: '검토중',   color: '#ffb400', bg: 'rgba(255,180,0,0.15)' },
  { key: 'confirmed' as const, label: '출근확정', color: '#3fc878', bg: 'rgba(49,200,100,0.15)' },
  { key: 'completed' as const, label: '출근완료', color: 'rgba(255,255,255,0.55)', bg: 'rgba(255,255,255,0.08)' },
  { key: 'rejected'  as const, label: '반려',     color: '#f04452', bg: 'rgba(240,68,82,0.15)' },
  { key: 'cancelled' as const, label: '취소',     color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.06)' },
]

type StatusKey = typeof STATUS_CONFIG[number]['key']

export default function ConfirmedMenu() {
  const [stats, setStats] = useState<CompanyStat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 사업장 필터 ('all' = 전체 합산)
  const [companyFilter, setCompanyFilter] = useState<string>('all')

  // 전체 지원 현황 집계
  const fetchStats = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)
    try {
      // job_applications 전체 + 사업장명 JOIN
      const { data, error } = await supabase
        .from('job_applications')
        .select('id, status, job_postings(company_name)')
      if (error) throw error

      // 사업장별 상태 집계 (Supabase JOIN 반환 타입이 배열/객체 혼용 → unknown 경유 캐스트)
      const map: Record<string, CompanyStat> = {}
      ;(data as unknown as AppRow[] ?? []).forEach(row => {
        const company = row.job_postings?.company_name ?? '기타'
        if (!map[company]) map[company] = { company, ...EMPTY }
        map[company].total++
        // 유효한 상태만 카운트
        switch (row.status as StatusKey) {
          case 'applied':   map[company].applied++;   break
          case 'reviewing': map[company].reviewing++; break
          case 'confirmed': map[company].confirmed++; break
          case 'completed': map[company].completed++; break
          case 'rejected':  map[company].rejected++;  break
          case 'cancelled': map[company].cancelled++; break
        }
      })

      // 전체 합계 기준 내림차순 정렬
      setStats(Object.values(map).sort((a, b) => b.total - a.total))
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

  // 선택된 사업장 집계 (전체 선택 시 모두 합산)
  const aggregated: CompanyStat = companyFilter === 'all'
    ? stats.reduce(
        (acc, s) => ({
          company:   '전체',
          applied:   acc.applied   + s.applied,
          reviewing: acc.reviewing + s.reviewing,
          confirmed: acc.confirmed + s.confirmed,
          completed: acc.completed + s.completed,
          rejected:  acc.rejected  + s.rejected,
          cancelled: acc.cancelled + s.cancelled,
          total:     acc.total     + s.total,
        }),
        { company: '전체', ...EMPTY }
      )
    : (stats.find(s => s.company === companyFilter) ?? { company: companyFilter, ...EMPTY })

  // 화면에 표시할 사업장 목록 (전체 또는 선택된 것만)
  const displayStats = companyFilter === 'all'
    ? stats
    : stats.filter(s => s.company === companyFilter)

  return (
    <div style={{ padding: 'clamp(16px,4vw,32px)', position: 'relative' }}>

      {/* ── 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: '0 0 4px', color: '#fff' }}>
            📈 채용현황
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            사업장별 지원 현황을 실시간으로 확인합니다.
          </p>
        </div>
        <button
          onClick={fetchStats}
          style={{
            padding: '7px 16px', borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.15)',
            background: 'rgba(49,130,246,0.1)', color: '#3182f6',
            fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          🔄 새로고침
        </button>
      </div>

      {/* ── 사업장 필터 ── */}
      <div style={{ marginBottom: 24 }}>
        <select
          value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: '#1a1a2e', color: '#fff',
            fontSize: '0.85rem', cursor: 'pointer', outline: 'none',
            minWidth: 200,
          }}
        >
          <option value="all" style={{ background: '#1a1a2e' }}>전체 사업장</option>
          {stats.map(s => (
            <option key={s.company} value={s.company} style={{ background: '#1a1a2e' }}>
              {s.company}
            </option>
          ))}
        </select>
      </div>

      {/* ── 에러 ── */}
      {error && (
        <div style={{
          background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          color: '#ff6b6b', fontSize: '0.82rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>⚠️ {error}</span>
          <button onClick={fetchStats}
            style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700 }}>
            다시 시도 ↻
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>불러오는 중...</p>
      ) : (
        <>
          {/* ── KPI 카드 행 ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: 10,
            marginBottom: 32,
          }}>
            {/* 전체 지원자 카드 */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 14, padding: '18px 14px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.9rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                {aggregated.total}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', marginTop: 7, fontWeight: 700, letterSpacing: '0.03em' }}>
                전체 지원자
              </div>
            </div>

            {/* 상태별 KPI 카드 (6개) */}
            {STATUS_CONFIG.map(cfg => (
              <div key={cfg.key} style={{
                background: cfg.bg,
                border: `1px solid ${cfg.color}44`,
                borderRadius: 14, padding: '18px 14px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.9rem', fontWeight: 900, color: cfg.color, lineHeight: 1 }}>
                  {aggregated[cfg.key]}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.45)', marginTop: 7, fontWeight: 700, letterSpacing: '0.03em' }}>
                  {cfg.label}
                </div>
              </div>
            ))}
          </div>

          {/* ── 사업장별 바 차트 ── */}
          {displayStats.length > 0 && (
            <div>
              <div style={{
                fontSize: '0.72rem', fontWeight: 700,
                color: 'rgba(255,255,255,0.35)',
                marginBottom: 14,
                letterSpacing: '0.06em',
                textTransform: 'uppercase' as const,
              }}>
                사업장별 현황
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {displayStats.map(stat => {
                  // 확정률 = (출근확정 + 출근완료) / 전체 * 100
                  const confirmedRate = stat.total > 0
                    ? Math.round((stat.confirmed + stat.completed) / stat.total * 100)
                    : 0

                  return (
                    <div
                      key={stat.company}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        borderRadius: 14, padding: '18px 20px',
                      }}
                    >
                      {/* 상단: 사업장명 + 요약 */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>
                          {stat.company}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                          총{' '}
                          <strong style={{ color: '#fff' }}>{stat.total}</strong>
                          명 · 확정률{' '}
                          <strong style={{ color: '#3fc878' }}>{confirmedRate}%</strong>
                        </div>
                      </div>

                      {/* 스택 바 차트 (비율 기반 가로 막대) */}
                      {stat.total > 0 && (
                        <div style={{
                          display: 'flex',
                          height: 12,
                          borderRadius: 999,
                          overflow: 'hidden',
                          marginBottom: 12,
                          background: 'rgba(255,255,255,0.04)',
                          gap: 1,
                        }}>
                          {STATUS_CONFIG.map(cfg => {
                            const count = stat[cfg.key]
                            if (count === 0) return null
                            const pct = (count / stat.total * 100).toFixed(1)
                            return (
                              <div
                                key={cfg.key}
                                title={`${cfg.label}: ${count}명 (${pct}%)`}
                                style={{
                                  width: `${pct}%`,
                                  background: cfg.color,
                                  minWidth: 4,
                                  transition: 'width 0.5s ease',
                                }}
                              />
                            )
                          })}
                        </div>
                      )}

                      {/* 범례 + 숫자 */}
                      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                        {STATUS_CONFIG.map(cfg => {
                          const count = stat[cfg.key]
                          if (count === 0) return null
                          return (
                            <div key={cfg.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ width: 8, height: 8, borderRadius: 2, background: cfg.color, flexShrink: 0 }} />
                              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
                                {cfg.label}
                              </span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: cfg.color }}>
                                {count}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 데이터 없음 */}
          {displayStats.length === 0 && (
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.85rem', textAlign: 'center', padding: '48px 0' }}>
              데이터가 없습니다.
            </p>
          )}
        </>
      )}
    </div>
  )
}
