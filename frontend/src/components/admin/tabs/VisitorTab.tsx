// VisitorTab: 어드민 대시보드 [방문자 분석] 탭
// ⚠️ 2026-07-06 정확도 개편:
//   (기존) 브라우저 세션으로 visitor_logs 를 직접 조회 + `.limit(1000)` → 방문이 1000건을
//          넘으면 총페이지뷰·순방문자·오늘방문·로그인방문이 전부 1000 부근에서 멈춰 '허수'.
//          '오늘'도 UTC 기준이라 한국시간과 최대 9시간 어긋남.
//   (개편) 백엔드 /admin/visitor-stats (service-role, count=exact + KST)로 진실값을 받는다.
//          경로는 '홈(/home)' 형식(명칭+경로), 각 KPI 카드엔 집계기준 설명 팝업(ⓘ) 추가.

import React, { useEffect, useState } from 'react'
import { getVisitorStats, lookupMaskedProfiles, type VisitorStatsResponse } from '../../../lib/api'
import { formatRoutePath } from '../../../lib/routeLabels'
import { exportXlsx } from '../../../lib/exportXlsx'
import PageHeader from '../shared/PageHeader'
import { UP, numeric, CHART_SERIES, cardBox } from '../shared/adminTheme'
import { AdminLoading } from '../shared/AdminState'

interface UserProfile { id: string; full_name: string | null; email: string | null }

// ── ⓘ 설명 팝업 (클릭 토글 — 모바일에서 hover 불가하므로 탭으로 열고 닫음) ──
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', marginLeft: 5, verticalAlign: 'middle' }}>
      <button
        type="button"
        aria-label="집계 기준 설명"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        onBlur={() => setOpen(false)}
        style={{
          width: 15, height: 15, borderRadius: '50%', border: `1px solid ${UP.hair}`,
          background: UP.surface, color: UP.sub, fontSize: '0.6rem', fontWeight: 800,
          lineHeight: 1, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >i</button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute', top: 20, left: 0, zIndex: 30, width: 240,
            background: '#fff', border: `1px solid ${UP.hair}`, borderRadius: 10,
            boxShadow: '0 8px 24px rgba(20,30,50,0.14)', padding: '10px 12px',
            fontSize: '0.72rem', lineHeight: 1.55, color: UP.body, fontWeight: 500,
            textTransform: 'none', letterSpacing: 0, whiteSpace: 'normal',
          }}
        >{text}</span>
      )}
    </span>
  )
}

export default function VisitorTab() {
  const [data, setData] = useState<VisitorStatsResponse | null>(null)
  const [profileMap, setProfileMap] = useState<Record<string, UserProfile>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState(30)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getVisitorStats(range)
      setData(res)
      // 최근 50건의 회원 방문자 신원은 백엔드에서 '마스킹된' 이름/이메일만 받아온다(평문 미노출).
      const userIds = [...new Set(res.recent.filter(r => r.user_id).map(r => r.user_id as string))]
      if (userIds.length > 0) {
        try { setProfileMap(await lookupMaskedProfiles(userIds)) }
        catch (e) { console.warn('[VisitorTab] 마스킹 프로필 조회 실패:', e); setProfileMap({}) }
      } else { setProfileMap({}) }
      setLastUpdated(new Date())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '데이터 로드 실패')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [range]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = () => {
    if (!data) return
    exportXlsx(data.recent.map(r => ({
      방문시각: (r.created_at ?? '').replace('T', ' ').slice(0, 19),
      페이지: formatRoutePath(r.page_path),
      유입경로: r.channel,
      로그인여부: r.user_id ? '로그인' : '비로그인',
      사용자이름: r.user_id ? (profileMap[r.user_id]?.full_name ?? '-') : '-',
      이메일: r.user_id ? (profileMap[r.user_id]?.email ?? '-') : '-',
    })), `visitor_stats_${range}일_${new Date().toISOString().slice(0, 10)}`)
  }

  if (loading) return <AdminLoading label="방문자 데이터를 불러오는 중이에요…" />

  if (error || !data) return (
    <div style={{ padding: 20 }}>
      <div style={{ background: UP.dangerBg, border: `1px solid ${UP.dangerLine}`, borderRadius: 12, padding: 24, color: UP.danger }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>방문자 데이터 로드 실패</div>
        <div className="text-a13" style={{ color: UP.sub, marginBottom: 16 }}>{error ?? '데이터를 불러오지 못했습니다.'}</div>
        <button onClick={load} style={btnPrimary}>재시도</button>
      </div>
    </div>
  )

  const maxPageCount = data.top_pages[0]?.count || 1
  const maxRefCount = data.referrers[0]?.count || 1

  // KPI 4개 — 각 값은 백엔드 정확 집계. sub 에 보조 수치, ⓘ 에 집계기준 설명.
  const kpis = [
    {
      label: '총 페이지뷰', value: data.total_pageviews, color: UP.brand, icon: '👁️',
      sub: `최근 ${data.range_days}일`,
      tip: '선택한 기간에 앱의 페이지가 열린 총 횟수예요(전체 정확 집계 — 예전 1,000건 상한을 없앴습니다). 같은 사람이 여러 페이지를 보면 각각 1회로 셉니다.',
    },
    {
      label: '순 방문자', value: data.unique_visitors, color: UP.green, icon: '👤',
      sub: '중복 제거·세션 기준',
      tip: '중복을 뺀 실제 방문자 수예요. 브라우저 탭 단위 세션 ID로 셉니다. 같은 사람이 여러 페이지를 봐도 1명(단, 다른 기기·탭이면 따로 셀 수 있어요).',
    },
    {
      label: '오늘 방문', value: data.today_pageviews, color: UP.amber, icon: '📅',
      sub: '한국시간(KST) 기준',
      tip: '오늘(한국시간 자정부터 지금까지) 발생한 페이지뷰 수예요. 예전엔 세계표준시(UTC) 기준이라 최대 9시간 어긋났는데, 이제 한국시간 기준으로 정확합니다.',
    },
    {
      label: '로그인 방문', value: data.logged_in_pageviews, color: UP.strong, icon: '🔐',
      sub: `실인원 ${data.logged_in_unique.toLocaleString()}명`,
      tip: '로그인한 회원이 페이지를 연 횟수(방문 횟수)예요. 아래 "실인원"은 중복을 뺀 실제 회원 수(명)입니다.',
    },
  ]

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 28px)' }}>
      <PageHeader
        icon="👁️" title="방문자 분석"
        subtitle={`visitor_logs 전수 집계 · ${data.total_pageviews.toLocaleString()} 페이지뷰${lastUpdated ? ` · ${lastUpdated.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 갱신` : ''}`}
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

      {/* 표시상한 도달 안내(정직성): 총량은 정확하나 순방문자/회원수는 표시상한 기준 */}
      {data.truncated && (
        <div className="text-a12" style={{
          background: UP.brandBg, border: `1px solid ${UP.brandLine}`, borderRadius: 10,
          padding: '9px 12px', color: UP.strong, marginBottom: 12, fontWeight: 600,
        }}>
          ℹ️ 방문 기록이 매우 많아 순 방문자·인기 페이지 등 상세 집계는 최근 {data.fetched.toLocaleString()}건 기준으로 표시됩니다.
          (총 페이지뷰·오늘 방문은 전체 정확 집계)
        </div>
      )}

      {/* KPI 4개 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {kpis.map(k => (
          <div key={k.label} style={{ ...CARD, padding: 'clamp(14px, 2vw, 18px)' }}>
            <div className="text-a10" style={{ color: UP.sub, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center' }}>
              <span>{k.icon} {k.label}</span>
              <InfoTip text={k.tip} />
            </div>
            <div style={{ fontSize: 'clamp(1.15rem, 3vw, 1.6rem)', fontWeight: 800, color: k.color, ...numeric }}>{k.value.toLocaleString()}</div>
            {k.sub && <div className="text-a10" style={{ color: UP.caption, marginTop: 3 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      {/* 인기 페이지 + 유입 경로 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
        <div style={CARD_PAD}>
          <p className="text-a13" style={{ fontWeight: 700, color: UP.navy, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
            <span>🔥 인기 페이지 TOP 10</span>
            <InfoTip text="선택 기간에 가장 많이 열린 페이지 순위예요. '명칭(/경로)' 형식으로, 앱 어느 화면인지 바로 알 수 있게 표기합니다." />
          </p>
          <p className="text-a10" style={{ color: UP.caption, marginBottom: 12 }}>명칭(/경로) · 페이지뷰 기준</p>
          {data.top_pages.length === 0
            ? <p className="text-a13" style={{ color: UP.sub, textAlign: 'center', padding: '20px 0' }}>데이터 없음</p>
            : data.top_pages.map((p, i) => (
              <div key={p.path} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                <span className="text-a10" style={{ color: UP.caption, width: 16, textAlign: 'right', ...numeric }}>{i + 1}</span>
                <span className="text-a12" style={{ flex: 1, minWidth: 0, color: UP.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.path}>{formatRoutePath(p.path)}</span>
                <div style={{ width: 60, height: 4, background: UP.hairSoft, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                  <div style={{ width: `${p.count / maxPageCount * 100}%`, height: '100%', background: UP.brand, borderRadius: 2 }} />
                </div>
                <span className="text-a11" style={{ fontWeight: 700, color: UP.strong, width: 44, textAlign: 'right', ...numeric }}>{p.count.toLocaleString()}</span>
              </div>
            ))
          }
        </div>

        <div style={CARD_PAD}>
          <p className="text-a13" style={{ fontWeight: 700, color: UP.navy, marginBottom: 4, display: 'flex', alignItems: 'center' }}>
            <span>🔗 유입 경로</span>
            <InfoTip text="방문자가 우리 앱에 오기 직전 어디에 있었는지(referrer)로 분류해요. '직접 방문'은 주소창 직접 입력·북마크·앱, '앱 내 이동'은 앱 안에서 페이지 이동입니다. (광고 UTM 세부 캠페인 집계는 추후 확장 예정)" />
          </p>
          <p className="text-a10" style={{ color: UP.caption, marginBottom: 12 }}>검색·SNS·직접·외부 채널 분류</p>
          {data.referrers.length === 0
            ? <p className="text-a13" style={{ color: UP.sub, textAlign: 'center', padding: '20px 0' }}>데이터 없음</p>
            : data.referrers.slice(0, 8).map((r, i) => {
              const c = CHART_SERIES[i % CHART_SERIES.length]
              return (
                <div key={r.channel} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }} />
                  <span className="text-a12" style={{ flex: 1, minWidth: 0, color: UP.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.channel}</span>
                  <div style={{ width: 60, height: 4, background: UP.hairSoft, borderRadius: 2, overflow: 'hidden', flexShrink: 0 }}>
                    <div style={{ width: `${r.count / maxRefCount * 100}%`, height: '100%', background: c, borderRadius: 2 }} />
                  </div>
                  <span className="text-a11" style={{ fontWeight: 700, color: c, width: 44, textAlign: 'right', ...numeric }}>{r.count.toLocaleString()}</span>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* 최근 방문 기록 테이블 (최근 50건) */}
      <div style={CARD_PAD}>
        <p className="text-a13" style={{ fontWeight: 700, color: UP.navy, marginBottom: 14 }}>최근 방문 기록 <span className="text-a10" style={{ color: UP.caption, fontWeight: 500 }}>(최근 50건)</span></p>
        <div style={{ overflowX: 'auto' }}>
          <table className="text-a12" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: UP.sunken, borderBottom: `1px solid ${UP.hair}` }}>
                {['방문시각', '페이지', '방문자', '유입경로', '상태'].map(h => (
                  <th key={h} className="text-a10" style={{ padding: '8px 10px', textAlign: 'left', color: UP.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.recent.map((l, i) => {
                const prof = l.user_id ? profileMap[l.user_id] : null
                return (
                  <tr key={`${l.session_id}-${i}`}
                    style={{ background: i % 2 === 0 ? UP.surface : UP.sunken, borderBottom: `1px solid ${UP.hairSoft}` }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = UP.brandBg }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? UP.surface : UP.sunken }}
                  >
                    <td style={{ padding: '7px 10px', color: UP.caption, whiteSpace: 'nowrap', ...numeric }}>{(l.created_at ?? '').replace('T', ' ').slice(0, 16)}</td>
                    <td style={{ padding: '7px 10px', color: UP.body, fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.page_path}>{formatRoutePath(l.page_path)}</td>
                    <td style={{ padding: '7px 10px' }}>
                      {prof ? (
                        <div>
                          <div className="text-a12" style={{ fontWeight: 600, color: UP.strong }}>{prof.full_name ?? '이름없음'}</div>
                          <div className="text-a10" style={{ color: UP.caption, marginTop: 1 }}>{prof.email ?? '-'}</div>
                        </div>
                      ) : l.user_id ? (
                        <div>
                          <div className="text-a11" style={{ fontWeight: 600, color: UP.sub }}>회원 (프로필 없음)</div>
                          <div className="text-a10" style={{ color: UP.caption, fontFamily: 'monospace', marginTop: 1 }}>{l.user_id.slice(0, 8)}…</div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-a11" style={{ color: UP.sub }}>비회원</div>
                          <div className="text-a10" style={{ color: UP.caption, fontFamily: 'monospace', marginTop: 1 }}>({l.session_id.slice(0, 8)}…)</div>
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '7px 10px', color: UP.sub }}>{l.channel}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <span className="text-a10" style={{ padding: '2px 7px', borderRadius: 6, fontWeight: 700,
                        background: l.user_id ? UP.brandBg : UP.sunken,
                        color: l.user_id ? UP.strong : UP.caption,
                        border: `1px solid ${l.user_id ? UP.brandLine : UP.hair}`,
                      }}>
                        {l.user_id ? '로그인' : '비로그인'}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {data.recent.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '24px 10px', textAlign: 'center', color: UP.sub }}>방문 기록이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// (P3-b) 공용 cardBox 참조 — radius 16 통일.
const CARD: React.CSSProperties = cardBox
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
