import { useEffect, useState } from 'react'
import { getTargetCompanies, getTargetSegments } from '../../../lib/api'
import type { CompanyTarget, TargetSegments } from '../../../types/admin'
import CompanyPieChart from '../target/CompanyPieChart'
import WorkDurationSegment from '../target/WorkDurationSegment'
import WageSegment from '../target/WageSegment'
import UserTagsPanel from '../target/UserTagsPanel'

export default function TargetMenu() {
  const [companies, setCompanies] = useState<CompanyTarget[]>([])
  const [segments, setSegments] = useState<TargetSegments | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, s] = await Promise.all([getTargetCompanies(), getTargetSegments()])
      setCompanies(c.companies ?? [])
      setSegments(s)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>분석 데이터 로딩 중...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{ background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)', borderRadius: 12, padding: '24px', color: '#ff6b6b' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ 타겟 분석 로드 실패</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>{error}</div>
          <button onClick={load} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3182f6', color: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700 }}>재시도</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>Target Analysis</h2>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>사용자 페르소나 · 세그먼트 분석</p>
      </div>

      {/* 회사별 파이차트 + 테이블 — 모바일 1열, 데스크탑 2열 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <CompanyPieChart companies={companies} />

        {/* 상위 회사 리스트 */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '20px',
        }}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>
            사업장 Top 10
          </p>
          {companies.slice(0, 10).map((c, i) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', width: 16 }}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span style={{ fontSize: '0.78rem', color: '#3182f6', fontWeight: 700 }}>{c.count}건</span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', width: 36, textAlign: 'right' }}>{c.pct.toFixed(1)}%</span>
            </div>
          ))}
          {companies.length === 0 && (
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>데이터 없음</p>
          )}
        </div>
      </div>

      {/* 세그먼트 차트 — 모바일 1열, 데스크탑 2열 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <WorkDurationSegment data={segments?.by_duration ?? []} />
        <WageSegment data={segments?.by_wage ?? []} />
      </div>

      {/* 태그 패널 — 태그 API가 준비되면 연결, 현재는 빈 상태 표시 */}
      <UserTagsPanel tags={[]} usersWithTags={0} />
    </div>
  )
}
