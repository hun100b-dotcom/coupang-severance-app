// VisitorTab: 어드민 대시보드 [방문자 분석] 탭 — 업비트 톤 (색 토큰화, 데이터/로직 불변)
// visitor_logs 테이블 기반: 총 방문수, 순 방문자, 인기 페이지 TOP 10, 유입 경로, 최근 기록

import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { lookupMaskedProfiles } from '../../../lib/api'
import { exportXlsx } from '../../../lib/exportXlsx'
import PageHeader from '../shared/PageHeader'
import { UP, numeric, CHART_SERIES } from '../shared/adminTheme'
import { AdminLoading } from '../shared/AdminState' // 공통 로딩 상태(인라인 스피너+@keyframes 대체)

interface VisitorLog {
  id: string
  session_id: string
  page_path: string
  referrer: string | null
  created_at: string
  user_id: string | null
}

interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
}

interface VisitorLogEnriched extends VisitorLog {
  profile?: UserProfile | null
}

interface PageStat { page: string; count: number }
interface ReferrerStat { referrer: string; count: number }

function getFromDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function formatReferrer(ref: string | null): string {
  if (!ref) return '직접 방문'
  try {
    const url = new URL(ref)
    if (url.hostname.includes('google')) return 'Google 검색'
    if (url.hostname.includes('naver')) return 'Naver 검색'
    if (url.hostname.includes('kakao')) return 'Kakao'
    if (url.hostname.includes('catch-daily-worker') || url.hostname === 'localhost') return '앱 내 이동'
    return url.hostname
  } catch { return '알 수 없음' }
}

export default function VisitorTab() {
  const [logs, setLogs] = useState<VisitorLogEnriched[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState(30)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!supabase) throw new Error('Supabase 클라이언트 없음')
      const { data, error: err } = await supabase
        .from('visitor_logs')
        .select('id, session_id, page_path, referrer, created_at, user_id')
        .gte('created_at', getFromDate(range))
        .order('created_at', { ascending: false })
        .limit(1000)
      if (err) throw err
      const rawLogs = (data ?? []) as VisitorLog[]
      const userIds = [...new Set(rawLogs.filter(l => l.user_id).map(l => l.user_id as string))]
      // 보안(🟡 V5): 과거에는 supabase.from('profiles').select 로 평문 PII 를 받아왔다(Network 노출).
      // 이제 백엔드(service-role)에서 "마스킹된" 이름/이메일만 받아온다 — 평문은 서버를 떠나지 않음.
      let profileMap: Record<string, UserProfile> = {}
      if (userIds.length > 0) {
        try {
          profileMap = await lookupMaskedProfiles(userIds)
        } catch (profileErr) {
          console.warn('[VisitorTab] 마스킹 프로필 조회 실패:', profileErr)
        }
      }
      setLogs(rawLogs.map(l => ({ ...l, profile: l.user_id ? (profileMap[l.user_id] ?? null) : null })))
      setLastUpdated(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCount = logs.filter(l => l.created_at.startsWith(todayStr)).length
  const uniqueSessions = new Set(logs.map(l => l.session_id)).size
  const loggedInCount = logs.filter(l => l.user_id).length

  const pageMap = new Map<string, number>()
  logs.forEach(l => pageMap.set(l.page_path, (pageMap.get(l.page_path) ?? 0) + 1))
  const topPages: PageStat[] = Array.from(pageMap.entries())
    .map(([page, count]) => ({ page, count })).sort((a, b) => b.count - a.count).slice(0, 10)

  const refMap = new Map<string, number>()
  logs.forEach(l => { const k = formatReferrer(l.referrer); refMap.set(k, (refMap.get(k) ?? 0) + 1) })
  const topReferrers: ReferrerStat[] = Array.from(refMap.entries())
    .map(([referrer, count]) => ({ referrer, count })).sort((a, b) => b.count - a.count).slice(0, 8)

  const maxPageCount = topPages[0]?.count || 1
  const maxRefCount = topReferrers[0]?.count || 1

  const handleDownload = () => {
    exportXlsx(logs.map(l => ({
      방문시각: l.created_at.replace('T', ' ').slice(0, 19),
      페이지: l.page_path, 세션ID: l.session_id.slice(0, 8) + '...',
      유입경로: formatReferrer(l.referrer), 로그인여부: l.user_id ? '로그인' : '비로그인',
      사용자이름: l.profile?.full_name ?? '-', 이메일: l.profile?.email ?? '-',
    })), `visitor_logs_${range}일_${todayStr}`)
  }

  if (loading) return <AdminLoading label="방문자 데이터를 불러오는 중이에요…" />

  if (error) return (
    <div style={{ padding: 20 }}>
      <div style={{ background: UP.dangerBg, border: `1px solid ${UP.dangerLine}`, borderRadius: 12, padding: 24, color: UP.danger }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>방문자 데이터 로드 실패</div>
        <div style={{ fontSize: '0.82rem', color: UP.sub, marginBottom: 16 }}>{error}</div>
        <button onClick={load} style={btnPrimary}>재시도</button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 28px)' }}>
      <PageHeader
        icon="👁️" title="방문자 분석"
        subtitle={`visitor_logs 기반 · ${logs.length.toLocaleString()}건${lastUpdated ? ` · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신` : ''}`}
        actions={
          <>
            <div style={{ display: 'flex', gap: 4 }}>
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => setRange(d)} style={rangeBtn(range === d)}>{d}일</button>
              ))}
            </div>
            <button onClick={load} style={iconBtn}>↻</button>
            <button onClick={handleDownload} style={excelBtn}>⬇ 엑셀</button>
          </>
        }
      />

      {/* KPI 4개 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: '총 페이지뷰', value: logs.length.toLocaleString(), color: UP.brand, icon: '👁️', sub: '' },
          { label: '순 방문자', value: uniqueSessions.toLocaleString(), color: UP.green, icon: '👤', sub: '세션 기준' },
          { label: '오늘 방문', value: todayCount.toLocaleString(), color: UP.amber, icon: '📅', sub: '' },
          { label: '로그인 방문', value: loggedInCount.toLocaleString(), color: UP.strong, icon: '🔐', sub: '회원 방문 수' },
        ].map(k => (
          <div key={k.label} style={{ ...CARD, padding: 'clamp(14px, 2vw, 18px)' }}>
            <div style={{ fontSize: '0.625rem', color: UP.sub, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 'clamp(1.15rem, 3vw, 1.6rem)', fontWeight: 800, color: k.color, ...numeric }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: '0.64rem', color: UP.caption, marginTop: 3 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* 인기 페이지 + 유입 경로 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <div style={CARD_PAD}>
          <p style={{ fontSize: '0.84rem', fontWeight: 700, color: UP.navy, marginBottom: 14 }}>🔥 인기 페이지 TOP 10</p>
          {topPages.length === 0
            ? <p style={{ color: UP.sub, fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>데이터 없음</p>
            : topPages.map((p, i) => (
              <div key={p.page} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: '0.62rem', color: UP.caption, width: 16, textAlign: 'right', ...numeric }}>{i + 1}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: '0.75rem', color: UP.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page}</span>
                <div style={{ width: 60, height: 4, background: UP.hairSoft, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ width: `${p.count / maxPageCount * 100}%`, height: '100%', background: UP.brand, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: UP.strong, width: 36, textAlign: 'right', ...numeric }}>{p.count}</span>
              </div>
            ))
          }
        </div>

        <div style={CARD_PAD}>
          <p style={{ fontSize: '0.84rem', fontWeight: 700, color: UP.navy, marginBottom: 14 }}>🔗 유입 경로</p>
          {topReferrers.length === 0
            ? <p style={{ color: UP.sub, fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>데이터 없음</p>
            : topReferrers.map((r, i) => {
              const c = CHART_SERIES[i % CHART_SERIES.length]
              return (
                <div key={r.referrer} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: '0.75rem', color: UP.body }}>{r.referrer}</span>
                  <div style={{ width: 60, height: 4, background: UP.hairSoft, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ width: `${r.count / maxRefCount * 100}%`, height: '100%', background: c, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: c, width: 36, textAlign: 'right', ...numeric }}>{r.count}</span>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* 최근 방문 기록 테이블 */}
      <div style={CARD_PAD}>
        <p style={{ fontSize: '0.84rem', fontWeight: 700, color: UP.navy, marginBottom: 14 }}>최근 방문 기록</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr style={{ background: UP.sunken, borderBottom: `1px solid ${UP.hair}` }}>
                {['방문시각', '페이지', '방문자', '유입경로', '상태'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: UP.sub, fontWeight: 700, fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 50).map((l, i) => (
                <tr key={l.id}
                  style={{ background: i % 2 === 0 ? UP.surface : UP.sunken, borderBottom: `1px solid ${UP.hairSoft}` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = UP.brandBg }}
                  onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? UP.surface : UP.sunken }}
                >
                  <td style={{ padding: '7px 10px', color: UP.caption, whiteSpace: 'nowrap', ...numeric }}>{l.created_at.replace('T', ' ').slice(0, 16)}</td>
                  <td style={{ padding: '7px 10px', color: UP.body, fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.page_path}</td>
                  <td style={{ padding: '7px 10px' }}>
                    {l.profile ? (
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: UP.strong }}>{l.profile.full_name ?? '이름없음'}</div>
                        <div style={{ fontSize: '0.65rem', color: UP.caption, marginTop: 1 }}>{l.profile.email ?? '-'}</div>
                      </div>
                    ) : l.user_id ? (
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 600, color: UP.sub }}>회원 (프로필 없음)</div>
                        <div style={{ fontSize: '0.62rem', color: UP.caption, fontFamily: 'monospace', marginTop: 1 }}>{l.user_id.slice(0, 8)}…</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ fontSize: '0.7rem', color: UP.sub }}>비회원</div>
                        <div style={{ fontSize: '0.62rem', color: UP.caption, fontFamily: 'monospace', marginTop: 1 }}>({l.session_id.slice(0, 8)}…)</div>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '7px 10px', color: UP.sub }}>{formatReferrer(l.referrer)}</td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{
                      fontSize: '0.625rem', padding: '2px 7px', borderRadius: 6, fontWeight: 700,
                      background: l.user_id ? UP.brandBg : UP.sunken,
                      color: l.user_id ? UP.strong : UP.caption,
                      border: `1px solid ${l.user_id ? UP.brandLine : UP.hair}`,
                    }}>
                      {l.user_id ? '로그인' : '비로그인'}
                    </span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px 10px', textAlign: 'center', color: UP.sub }}>방문 기록이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
          {logs.length > 50 && (
            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: UP.caption, marginTop: 12 }}>
              최근 50건 표시 중 (전체 {logs.length.toLocaleString()}건은 엑셀로 다운로드)
            </p>
          )}
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

function rangeBtn(active: boolean): React.CSSProperties {
  return {
    padding: '5px 12px', borderRadius: 8,
    border: `1px solid ${active ? UP.brand : UP.hair}`,
    background: active ? UP.brandBg : UP.surface,
    color: active ? UP.strong : UP.sub,
    fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
  }
}

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
