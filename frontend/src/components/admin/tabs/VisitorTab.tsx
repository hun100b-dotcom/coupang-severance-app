// ============================================================
// VisitorTab: 어드민 대시보드 [방문자 분석] 탭
// visitor_logs 테이블에서 데이터를 조회해 아래 항목을 표시합니다.
// - 날짜 범위 필터 (7일/30일/90일)
// - KPI: 총 방문 수, 순 방문자(세션), 오늘 방문
// - 인기 페이지 TOP 10
// - 유입 경로(referrer) 분포
// - 최근 방문 기록 테이블
// - 엑셀 다운로드 버튼
// ============================================================

import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { exportXlsx } from '../../../lib/exportXlsx'

// visitor_logs 테이블 행 타입 정의
interface VisitorLog {
  id: string
  session_id: string
  page_path: string
  referrer: string | null
  created_at: string
  user_id: string | null
}

// 인기 페이지 집계 타입
interface PageStat {
  page: string
  count: number
}

// 유입 경로 집계 타입
interface ReferrerStat {
  referrer: string
  count: number
}

// ── 날짜 범위 계산 헬퍼 ──────────────────────────────────────
function getFromDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// ── referrer URL을 읽기 쉬운 이름으로 변환 ───────────────────
function formatReferrer(ref: string | null): string {
  if (!ref) return '직접 방문'
  try {
    const url = new URL(ref)
    // Google 검색 유입
    if (url.hostname.includes('google')) return 'Google 검색'
    // Naver 검색 유입
    if (url.hostname.includes('naver')) return 'Naver 검색'
    // Kakao 유입
    if (url.hostname.includes('kakao')) return 'Kakao'
    // 앱 내부 이동 (catch-daily-worker.vercel.app)
    if (url.hostname.includes('catch-daily-worker') || url.hostname === 'localhost') return '앱 내부'
    // 기타: 호스트명만 표시
    return url.hostname
  } catch {
    return '알 수 없음'
  }
}

export default function VisitorTab() {
  const [logs, setLogs] = useState<VisitorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState(30)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // 데이터 로드 함수
  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!supabase) throw new Error('Supabase 클라이언트 없음')

      // visitor_logs 최근 기간 데이터 조회 (최대 1,000건)
      const { data, error: err } = await supabase
        .from('visitor_logs')
        .select('id, session_id, page_path, referrer, created_at, user_id')
        .gte('created_at', getFromDate(range))
        .order('created_at', { ascending: false })
        .limit(1000)

      if (err) throw err
      setLogs(data ?? [])
      setLastUpdated(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 집계 계산 ─────────────────────────────────────────────
  // 오늘 방문 수
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayCount = logs.filter(l => l.created_at.startsWith(todayStr)).length

  // 순 방문자 (session_id 중복 제거)
  const uniqueSessions = new Set(logs.map(l => l.session_id)).size

  // 인기 페이지 집계
  const pageMap = new Map<string, number>()
  logs.forEach(l => {
    pageMap.set(l.page_path, (pageMap.get(l.page_path) ?? 0) + 1)
  })
  const topPages: PageStat[] = Array.from(pageMap.entries())
    .map(([page, count]) => ({ page, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  // 유입 경로 집계
  const refMap = new Map<string, number>()
  logs.forEach(l => {
    const key = formatReferrer(l.referrer)
    refMap.set(key, (refMap.get(key) ?? 0) + 1)
  })
  const topReferrers: ReferrerStat[] = Array.from(refMap.entries())
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  const maxPageCount = topPages[0]?.count || 1
  const maxRefCount = topReferrers[0]?.count || 1

  // ── 엑셀 다운로드 ─────────────────────────────────────────
  const handleDownload = () => {
    const data = logs.map(l => ({
      방문시각: l.created_at.replace('T', ' ').slice(0, 19),
      페이지: l.page_path,
      세션ID: l.session_id.slice(0, 8) + '...',
      유입경로: formatReferrer(l.referrer),
      로그인여부: l.user_id ? '로그인' : '비로그인',
    }))
    exportXlsx(data, `visitor_logs_${range}일_${todayStr}`)
  }

  // ── 로딩 상태 ─────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: '60px 40px', textAlign: 'center' }}>
      <div style={{
        width: 32, height: 32, border: '3px solid rgba(255,255,255,0.1)',
        borderTopColor: '#3182f6', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>방문자 데이터 로딩 중...</p>
    </div>
  )

  // ── 에러 상태 ─────────────────────────────────────────────
  if (error) return (
    <div style={{ padding: 20 }}>
      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: 24, color: '#fca5a5' }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>방문자 데이터 로드 실패</div>
        <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>{error}</div>
        <button onClick={load} style={btnPrimary}>재시도</button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* ── 헤더 ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, gap: 8, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff', margin: 0 }}>방문자 분석</h2>
          <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            visitor_logs 기반 · {logs.length.toLocaleString()}건
            {lastUpdated && ` · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신`}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRange(d)} style={{
              padding: '5px 12px', borderRadius: 8, border: 'none',
              background: range === d ? 'linear-gradient(135deg, #3182f6, #2563eb)' : 'rgba(255,255,255,0.06)',
              color: range === d ? '#fff' : 'rgba(255,255,255,0.45)',
              fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
            }}>{d}일</button>
          ))}
          <button onClick={load} style={{
            padding: '5px 10px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'transparent', color: 'rgba(255,255,255,0.4)',
            fontSize: '0.82rem', cursor: 'pointer',
          }}>↻</button>
          {/* 엑셀 다운로드 버튼 */}
          <button onClick={handleDownload} style={{
            padding: '5px 12px', borderRadius: 8, border: 'none',
            background: 'rgba(34,197,94,0.15)',
            color: '#4ade80', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer',
          }}>⬇ 엑셀</button>
        </div>
      </div>

      {/* ── KPI 3개 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: '총 페이지뷰', value: logs.length.toLocaleString(), color: '#3182f6', icon: '👁️' },
          { label: '순 방문자', value: uniqueSessions.toLocaleString(), color: '#00c48c', icon: '👤', sub: '세션 기준' },
          { label: '오늘 방문', value: todayCount.toLocaleString(), color: '#f08c00', icon: '📅' },
        ].map(k => (
          <div key={k.label} style={{
            background: `linear-gradient(145deg, ${k.color}14 0%, ${k.color}05 100%)`,
            border: `1px solid ${k.color}22`, borderRadius: 14, padding: 'clamp(10px, 2vw, 18px)',
          }}>
            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.38)', fontWeight: 700, marginBottom: 6 }}>{k.icon} {k.label}</div>
            <div style={{ fontSize: 'clamp(1.1rem, 3vw, 1.5rem)', fontWeight: 800, color: '#fff' }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: '0.6rem', color: `${k.color}aa`, marginTop: 3 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* ── 인기 페이지 + 유입 경로 (2열) ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        {/* 인기 페이지 TOP 10 */}
        <div style={CARD}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>🔥 인기 페이지 TOP 10</p>
          {topPages.length === 0
            ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>데이터 없음</p>
            : topPages.map((p, i) => (
              <div key={p.page} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.25)', width: 16, textAlign: 'right' }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.page}</span>
                <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${p.count / maxPageCount * 100}%`, height: '100%', background: '#3182f6', borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#3182f6', width: 36, textAlign: 'right' }}>{p.count}</span>
              </div>
            ))
          }
        </div>

        {/* 유입 경로 분포 */}
        <div style={CARD}>
          <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>🔗 유입 경로</p>
          {topReferrers.length === 0
            ? <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>데이터 없음</p>
            : topReferrers.map((r, i) => {
              const colors = ['#3182f6','#00c48c','#f08c00','#8b5cf6','#06b6d4','#ec4899','#eab308','#22c55e']
              const c = colors[i % colors.length]
              return (
                <div key={r.referrer} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.75rem', color: 'rgba(255,255,255,0.65)' }}>{r.referrer}</span>
                  <div style={{ width: 60, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${r.count / maxRefCount * 100}%`, height: '100%', background: c, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: c, width: 36, textAlign: 'right' }}>{r.count}</span>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* ── 최근 방문 기록 테이블 ────────────────────────────── */}
      <div style={CARD}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>최근 방문 기록</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
            <thead>
              <tr>
                {['방문시각', '페이지', '유입경로', '로그인'].map(h => (
                  <th key={h} style={{
                    padding: '8px 10px', textAlign: 'left',
                    color: 'rgba(255,255,255,0.35)', fontWeight: 600,
                    borderBottom: '1px solid rgba(255,255,255,0.07)', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 50).map((l, i) => (
                <tr key={l.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                  <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                    {l.created_at.replace('T', ' ').slice(0, 16)}
                  </td>
                  <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                    {l.page_path}
                  </td>
                  <td style={{ padding: '7px 10px', color: 'rgba(255,255,255,0.45)' }}>
                    {formatReferrer(l.referrer)}
                  </td>
                  <td style={{ padding: '7px 10px' }}>
                    <span style={{
                      fontSize: '0.62rem', padding: '2px 7px', borderRadius: 6, fontWeight: 700,
                      background: l.user_id ? 'rgba(49,130,246,0.15)' : 'rgba(255,255,255,0.06)',
                      color: l.user_id ? '#60a5fa' : 'rgba(255,255,255,0.3)',
                    }}>{l.user_id ? '로그인' : '비로그인'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length > 50 && (
            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: 'rgba(255,255,255,0.25)', marginTop: 12 }}>
              최근 50건 표시 중 (전체 {logs.length.toLocaleString()}건은 엑셀로 다운로드)
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 공통 카드 스타일 ─────────────────────────────────────────
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
