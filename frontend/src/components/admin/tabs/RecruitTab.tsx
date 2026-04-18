// ============================================================
// RecruitTab: 어드민 대시보드 [채용 현황] 탭
// job_postings + job_applications 기반으로 채용 현황을 분석합니다.
// - 공고 KPI (전체/활성/긴급/상시)
// - 지원자 KPI (전체/확정/거절/대기)
// - 섹션별 공고 분포 (오늘긴급/내일긴급/상시)
// - 최근 공고 목록 테이블
// - 엑셀 다운로드
// ============================================================

import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { exportXlsx } from '../../../lib/exportXlsx'

// job_postings 테이블 타입
interface JobPosting {
  id: string
  title: string
  company: string
  section: string | null
  is_urgent: boolean
  status: string
  apply_count: number | null
  created_at: string
}

// job_applications 집계 타입
interface AppStats {
  total: number
  confirmed: number
  rejected: number
  pending: number
}

export default function RecruitTab() {
  const [postings, setPostings] = useState<JobPosting[]>([])
  const [appStats, setAppStats] = useState<AppStats>({ total: 0, confirmed: 0, rejected: 0, pending: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!supabase) throw new Error('Supabase 클라이언트 없음')

      // 공고 + 지원자 통계 병렬 조회
      const [postingsRes, appsRes] = await Promise.all([
        supabase
          .from('job_postings')
          .select('id, title, company, section, is_urgent, status, apply_count, created_at')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('job_applications')
          .select('id, status'),
      ])

      if (postingsRes.error) throw postingsRes.error
      if (appsRes.error) throw appsRes.error

      setPostings(postingsRes.data ?? [])

      // 지원자 상태별 집계
      const apps = appsRes.data ?? []
      setAppStats({
        total: apps.length,
        confirmed: apps.filter(a => a.status === 'confirmed').length,
        rejected: apps.filter(a => a.status === 'rejected').length,
        pending: apps.filter(a => !['confirmed', 'rejected'].includes(a.status)).length,
      })

      setLastUpdated(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── 집계 계산 ──────────────────────────────────────────────
  const activePostings = postings.filter(p => p.status === 'active')
  const urgentPostings = postings.filter(p => p.is_urgent && p.status === 'active')
  const sectionCounts = {
    '오늘긴급': postings.filter(p => p.section === 'today_urgent').length,
    '내일긴급': postings.filter(p => p.section === 'tomorrow_urgent').length,
    '상시': postings.filter(p => p.section === 'always' || !p.section).length,
  }

  // 엑셀 다운로드
  const handleDownload = () => {
    const data = postings.map(p => ({
      등록일: p.created_at.slice(0, 10),
      공고명: p.title,
      회사: p.company,
      섹션: p.section ?? '상시',
      긴급여부: p.is_urgent ? '긴급' : '일반',
      상태: p.status,
      지원자수: p.apply_count ?? 0,
    }))
    exportXlsx(data, `recruit_${new Date().toISOString().slice(0, 10)}`)
  }

  // ── 로딩/에러 ──────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: '60px 40px', textAlign: 'center' }}>
      <div style={{
        width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#3182f6', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>채용 데이터 로딩 중...</p>
    </div>
  )

  if (error) return (
    <div style={{ padding: 20 }}>
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 24, color: '#fca5a5' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>데이터 로드 실패</div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>{error}</div>
        <button onClick={load} style={btnPrimary}>재시도</button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* ── 헤더 ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 8, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>채용 현황</h2>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            공고 {postings.length}건 · 지원자 {appStats.total}명
            {lastUpdated && ` · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신`}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <button onClick={load} style={{
            padding: '5px 10px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: 'rgba(255,255,255,0.4)',
            fontSize: '0.82rem', cursor: 'pointer',
          }}>↻</button>
          <button onClick={handleDownload} style={{
            padding: '5px 12px', borderRadius: 8, border: 'none',
            background: 'rgba(34,197,94,0.15)',
            color: '#4ade80', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
          }}>⬇ 엑셀</button>
        </div>
      </div>

      {/* ── 공고 KPI ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: '전체 공고', value: postings.length, color: '#3182f6', icon: '📋' },
          { label: '활성 공고', value: activePostings.length, color: '#00c48c', icon: '✅' },
          { label: '긴급 공고', value: urgentPostings.length, color: '#f08c00', icon: '🔥' },
          { label: '삭제된 공고', value: postings.filter(p => p.status === 'deleted').length, color: '#6b7280', icon: '🗑️' },
        ].map(k => (
          <div key={k.label} style={{
            background: `linear-gradient(145deg, ${k.color}14 0%, ${k.color}05 100%)`,
            border: `1px solid ${k.color}22`, borderRadius: 14, padding: 'clamp(10px, 2vw, 18px)',
          }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: 6 }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 800, color: '#fff' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── 지원자 KPI ────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: '전체 지원', value: appStats.total, color: '#06b6d4', icon: '👥' },
          { label: '확정', value: appStats.confirmed, color: '#22c55e', icon: '✔️' },
          { label: '거절', value: appStats.rejected, color: '#cc2233', icon: '✘' },
          { label: '대기', value: appStats.pending, color: '#eab308', icon: '⏳' },
        ].map(k => (
          <div key={k.label} style={{
            background: `linear-gradient(145deg, ${k.color}14 0%, ${k.color}05 100%)`,
            border: `1px solid ${k.color}22`, borderRadius: 14, padding: 'clamp(10px, 2vw, 18px)',
          }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: 6 }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 800, color: '#fff' }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── 섹션별 공고 분포 ──────────────────────────────── */}
      <div style={{ ...CARD, marginBottom: 12 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>섹션별 공고 분포</p>
        <div style={{ display: 'flex', gap: 3, height: 10, borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
          {Object.entries(sectionCounts).map(([key, count], i) => {
            const colors = ['#f08c00', '#eab308', '#3182f6']
            return (
              <div key={key} style={{
                flex: count, background: colors[i],
                minWidth: count > 0 ? 4 : 0, transition: 'flex 0.3s',
              }} />
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {Object.entries(sectionCounts).map(([key, count], i) => {
            const colors = ['#f08c00', '#eab308', '#3182f6']
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: colors[i] }} />
                <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.55)' }}>{key}</span>
                <span style={{ fontSize: '0.73rem', fontWeight: 700, color: colors[i] }}>{count}건</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 최근 공고 목록 테이블 ─────────────────────────── */}
      <div style={CARD}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>최근 공고 목록</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr>
                {['등록일', '공고명', '회사', '섹션', '상태', '지원자'].map(h => (
                  <th key={h} style={{
                    padding: '8px 10px', textAlign: 'left',
                    color: 'rgba(255,255,255,0.35)', fontWeight: 600,
                    borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {postings.slice(0, 30).map((p, i) => (
                <tr key={p.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>{p.created_at.slice(0, 10)}</td>
                  <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.8)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.is_urgent && <span style={{ fontSize: '0.6rem', background: 'rgba(240,140,0,0.2)', color: '#f08c00', padding: '1px 4px', borderRadius: 4, marginRight: 4 }}>긴급</span>}
                    {p.title}
                  </td>
                  <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.55)' }}>{p.company}</td>
                  <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.45)' }}>
                    {p.section === 'today_urgent' ? '오늘긴급' : p.section === 'tomorrow_urgent' ? '내일긴급' : '상시'}
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{
                      fontSize: '0.62rem', padding: '2px 7px', borderRadius: 6, fontWeight: 700,
                      background: p.status === 'active' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                      color: p.status === 'active' ? '#22c55e' : 'rgba(255,255,255,0.3)',
                    }}>{p.status === 'active' ? '활성' : '비활성'}</span>
                  </td>
                  <td style={{ padding: '7px 10px', color: '#3182f6', fontWeight: 700 }}>{p.apply_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const CARD: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 16, padding: 'clamp(14px, 3vw, 20px)',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: 'linear-gradient(135deg, #3182f6, #2563eb)', color: '#fff',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
}
