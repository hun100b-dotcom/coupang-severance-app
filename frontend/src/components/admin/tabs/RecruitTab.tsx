// RecruitTab: 어드민 대시보드 [채용 현황] 탭 — 업비트 톤 (색 토큰화, 데이터/로직 불변)
// job_postings + job_applications 기반 채용 현황 분석

import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { exportXlsx } from '../../../lib/exportXlsx'
import PageHeader from '../shared/PageHeader'
import { UP, numeric } from '../shared/adminTheme'
import { AdminLoading } from '../shared/AdminState' // 공통 로딩 상태(인라인 스피너+@keyframes 대체)

interface JobPosting {
  id: string
  company_name: string
  center_name: string
  section: string | null
  is_urgent: boolean
  status: string
  view_count: number | null
  created_at: string
}

interface AppStats { total: number; confirmed: number; rejected: number; pending: number }

// 섹션 분포 색 — 토큰 기반 (오늘긴급/내일긴급/상시)
const SECTION_COLORS = [UP.amber, UP.strong, UP.brand]

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
      const [postingsRes, appsRes] = await Promise.all([
        supabase.from('job_postings')
          .select('id, company_name, center_name, section, is_urgent, status, view_count, created_at')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('job_applications').select('id, status'),
      ])
      if (postingsRes.error) throw postingsRes.error
      if (appsRes.error) throw appsRes.error
      setPostings(postingsRes.data ?? [])
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
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const activePostings = postings.filter(p => p.status === 'active')
  const urgentPostings = postings.filter(p => p.is_urgent && p.status === 'active')
  const sectionCounts = {
    '오늘긴급': postings.filter(p => p.section === 'today-urgent').length,
    '내일긴급': postings.filter(p => p.section === 'tomorrow-urgent').length,
    '상시':     postings.filter(p => p.section === 'always' || !p.section).length,
  }

  const handleDownload = () => {
    exportXlsx(postings.map(p => ({
      등록일: p.created_at.slice(0, 10), 회사명: p.company_name, 센터명: p.center_name,
      섹션: p.section === 'today-urgent' ? '오늘긴급' : p.section === 'tomorrow-urgent' ? '내일긴급' : '상시',
      긴급여부: p.is_urgent ? '긴급' : '일반', 상태: p.status, 조회수: p.view_count ?? 0,
    })), `recruit_${new Date().toISOString().slice(0, 10)}`)
  }

  if (loading) return <AdminLoading label="채용 데이터를 불러오는 중이에요…" />

  if (error) return (
    <div style={{ padding: 20 }}>
      <div style={{ background: UP.dangerBg, border: `1px solid ${UP.dangerLine}`, borderRadius: 12, padding: 24, color: UP.danger }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>데이터 로드 실패</div>
        <div style={{ fontSize: '0.82rem', color: UP.sub, marginBottom: 16 }}>{error}</div>
        <button onClick={load} style={btnPrimary}>재시도</button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 28px)' }}>
      <PageHeader
        icon="💼" title="채용 현황"
        subtitle={`공고 ${postings.length}건 · 지원자 ${appStats.total}명${lastUpdated ? ` · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신` : ''}`}
        actions={
          <>
            <button onClick={load} style={iconBtn}>↻</button>
            <button onClick={handleDownload} style={excelBtn}>⬇ 엑셀</button>
          </>
        }
      />

      {/* 공고 KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: '전체 공고', value: postings.length, color: UP.brand, icon: '📋' },
          { label: '활성 공고', value: activePostings.length, color: UP.green, icon: '✅' },
          { label: '긴급 공고', value: urgentPostings.length, color: UP.amber, icon: '🔥' },
          { label: '삭제된 공고', value: postings.filter(p => p.status === 'deleted').length, color: UP.sub, icon: '🗑️' },
        ].map(k => (
          <div key={k.label} style={{ ...CARD, padding: 'clamp(14px, 2vw, 18px)' }}>
            <div style={{ fontSize: '0.625rem', color: UP.sub, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 'clamp(1.15rem, 3vw, 1.5rem)', fontWeight: 800, color: k.color, ...numeric }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* 지원자 KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: '전체 지원', value: appStats.total, color: UP.brand, icon: '👥' },
          { label: '확정', value: appStats.confirmed, color: UP.green, icon: '✔️' },
          { label: '거절', value: appStats.rejected, color: UP.danger, icon: '✘' },
          { label: '대기', value: appStats.pending, color: UP.amber, icon: '⏳' },
        ].map(k => (
          <div key={k.label} style={{ ...CARD, padding: 'clamp(14px, 2vw, 18px)' }}>
            <div style={{ fontSize: '0.625rem', color: UP.sub, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 'clamp(1.15rem, 3vw, 1.5rem)', fontWeight: 800, color: k.color, ...numeric }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* 섹션별 분포 */}
      <div style={{ ...CARD_PAD, marginBottom: 12 }}>
        <p style={{ fontSize: '0.84rem', fontWeight: 700, color: UP.navy, marginBottom: 14 }}>섹션별 공고 분포</p>
        <div style={{ display: 'flex', gap: 3, height: 10, borderRadius: 99, overflow: 'hidden', marginBottom: 12 }}>
          {Object.entries(sectionCounts).map(([key, count], i) => (
            <div key={key} style={{ flex: count, background: SECTION_COLORS[i], minWidth: count > 0 ? 4 : 0, transition: 'flex 0.3s' }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {Object.entries(sectionCounts).map(([key, count], i) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: SECTION_COLORS[i] }} />
              <span style={{ fontSize: '0.73rem', color: UP.sub }}>{key}</span>
              <span style={{ fontSize: '0.73rem', fontWeight: 700, color: SECTION_COLORS[i], ...numeric }}>{count}건</span>
            </div>
          ))}
        </div>
      </div>

      {/* 최근 공고 테이블 */}
      <div style={CARD_PAD}>
        <p style={{ fontSize: '0.84rem', fontWeight: 700, color: UP.navy, marginBottom: 14 }}>최근 공고 목록</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: UP.sunken, borderBottom: `1px solid ${UP.hair}` }}>
                {['등록일', '회사명', '센터명', '섹션', '상태', '조회수'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: UP.sub, fontWeight: 700, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {postings.slice(0, 30).map((p, i) => (
                <tr key={p.id}
                  style={{ background: i % 2 === 0 ? UP.surface : UP.sunken, borderBottom: `1px solid ${UP.hairSoft}` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = UP.brandBg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? UP.surface : UP.sunken }}
                >
                  <td style={{ padding: '7px 10px', color: UP.caption, whiteSpace: 'nowrap', ...numeric }}>{p.created_at.slice(0, 10)}</td>
                  <td style={{ padding: '7px 10px', color: UP.body, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.is_urgent && <span style={{ fontSize: '0.6rem', background: UP.amberBg, color: UP.amber, padding: '1px 4px', borderRadius: 4, marginRight: 4, border: `1px solid ${UP.amberLine}` }}>긴급</span>}
                    {p.company_name}
                  </td>
                  <td style={{ padding: '7px 10px', color: UP.sub, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.center_name}</td>
                  <td style={{ padding: '7px 10px', color: UP.body }}>{p.section === 'today-urgent' ? '오늘긴급' : p.section === 'tomorrow-urgent' ? '내일긴급' : '상시'}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{
                      fontSize: '0.625rem', padding: '2px 7px', borderRadius: 6, fontWeight: 700,
                      background: p.status === 'active' ? UP.greenBg : UP.sunken,
                      color: p.status === 'active' ? UP.green : UP.caption,
                      border: `1px solid ${p.status === 'active' ? UP.greenLine : UP.hair}`,
                    }}>
                      {p.status === 'active' ? '활성' : p.status === 'draft' ? '임시저장' : p.status === 'expired' ? '만료' : '비활성'}
                    </span>
                  </td>
                  <td style={{ padding: '7px 10px', color: UP.strong, fontWeight: 700, ...numeric }}>{p.view_count ?? 0}</td>
                </tr>
              ))}
              {postings.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '24px 10px', textAlign: 'center', color: UP.sub }}>공고 데이터가 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const CARD: React.CSSProperties = {
  background: UP.surface,
  border: `1px solid ${UP.hair}`,
  borderRadius: 12,
  boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
}

const CARD_PAD: React.CSSProperties = { ...CARD, padding: 'clamp(14px, 3vw, 20px)' }

const iconBtn: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 8, border: `1px solid ${UP.hair}`,
  background: UP.surface, color: UP.sub, fontSize: '0.82rem', cursor: 'pointer',
}

const excelBtn: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 8, border: `1px solid ${UP.greenLine}`,
  background: UP.greenBg, color: UP.green, fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none',
  background: UP.brand, color: '#fff',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
}
