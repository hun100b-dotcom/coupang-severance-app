// FeedbackMenu: 어드민 [소통] — 계산기 결과화면 피드백/문의 조회
//   4개 계산기(퇴직금·실업급여·주휴·연차) 결과 하단 폼(calc_feedback) 수집분을 본다.
import { useEffect, useState } from 'react'
import { getAdminFeedback, type CalcFeedbackRow } from '../../../lib/api'
import PageHeader from '../shared/PageHeader'
import { UP, numeric, cardBox } from '../shared/adminTheme'
import { AdminLoading } from '../shared/AdminState'

// calc_type → 한글 라벨
const CALC_LABEL: Record<string, string> = {
  severance: '퇴직금', unemployment: '실업급여', weekly: '주휴수당', annual: '연차수당',
}
const FILTERS: { key: string; label: string }[] = [
  { key: '', label: '전체' },
  { key: 'severance', label: '퇴직금' },
  { key: 'unemployment', label: '실업급여' },
  { key: 'weekly', label: '주휴수당' },
  { key: 'annual', label: '연차수당' },
]

export default function FeedbackMenu() {
  const [rows, setRows] = useState<CalcFeedbackRow[]>([])
  const [summary, setSummary] = useState({ helpful_yes: 0, helpful_no: 0, has_error: 0 })
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await getAdminFeedback(filter, 300)
      setRows(res.feedback ?? [])
      setSummary(res.summary ?? { helpful_yes: 0, helpful_no: 0, has_error: 0 })
      setTotal(res.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '피드백 로드 실패')
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <AdminLoading label="피드백을 불러오는 중이에요…" />

  if (error) return (
    <div style={{ padding: 20 }}>
      <div style={{ background: UP.dangerBg, border: `1px solid ${UP.dangerLine}`, borderRadius: 12, padding: 24, color: UP.danger }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>피드백 로드 실패</div>
        <div className="text-a13" style={{ color: UP.sub, marginBottom: 16 }}>{error}</div>
        <button onClick={load} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: UP.brand, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>재시도</button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 28px)' }}>
      <PageHeader
        icon="📝" title="계산기 피드백"
        subtitle={`4개 계산기 결과화면 수집 · 총 ${total.toLocaleString()}건`}
        actions={
          <>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} style={{
                  padding: '5px 12px', borderRadius: 8,
                  border: `1px solid ${filter === f.key ? UP.brand : UP.hair}`,
                  background: filter === f.key ? UP.brandBg : UP.surface,
                  color: filter === f.key ? UP.strong : UP.sub,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>{f.label}</button>
              ))}
            </div>
            <button onClick={load} style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${UP.hair}`, background: UP.surface, color: UP.sub, cursor: 'pointer' }}>↻</button>
          </>
        }
      />

      {/* 요약 카드 3개 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: '👍 도움됨(예)', value: summary.helpful_yes, color: UP.green },
          { label: '👎 도움안됨(아니오)', value: summary.helpful_no, color: UP.sub },
          { label: '⚠️ 오류 신고', value: summary.has_error, color: UP.danger },
        ].map(k => (
          <div key={k.label} style={{ ...cardBox, padding: 'clamp(12px,2vw,16px)' }}>
            <div className="text-a10" style={{ color: UP.sub, fontWeight: 700, marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: k.color, ...numeric }}>{k.value.toLocaleString()}</div>
          </div>
        ))}
      </div>

      {/* 목록 */}
      <div style={{ ...cardBox, padding: 'clamp(14px,3vw,20px)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="text-a12" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: UP.sunken, borderBottom: `1px solid ${UP.hair}` }}>
                {['시각', '계산기', '도움', '오류', '의견/문의', '이메일'].map(h => (
                  <th key={h} className="text-a10" style={{ padding: '8px 10px', textAlign: 'left', color: UP.sub, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 === 0 ? UP.surface : UP.sunken, borderBottom: `1px solid ${UP.hairSoft}`, verticalAlign: 'top' }}>
                  <td style={{ padding: '8px 10px', color: UP.caption, whiteSpace: 'nowrap', ...numeric }}>{(r.created_at ?? '').replace('T', ' ').slice(0, 16)}</td>
                  <td style={{ padding: '8px 10px', color: UP.body, fontWeight: 600, whiteSpace: 'nowrap' }}>{CALC_LABEL[r.calc_type] ?? r.calc_type}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    {r.helpful === true ? <span style={{ color: UP.green, fontWeight: 700 }}>👍 예</span>
                      : r.helpful === false ? <span style={{ color: UP.sub }}>👎 아니오</span>
                      : <span style={{ color: UP.caption }}>-</span>}
                  </td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    {r.has_error
                      ? <span style={{ color: UP.danger, fontWeight: 700 }}>⚠️ 있음</span>
                      : <span style={{ color: UP.caption }}>-</span>}
                    {r.has_error && r.error_detail && (
                      <div className="text-a10" style={{ color: UP.sub, marginTop: 2, maxWidth: 200, whiteSpace: 'normal' }}>{r.error_detail}</div>
                    )}
                  </td>
                  <td style={{ padding: '8px 10px', color: UP.body, minWidth: 180, maxWidth: 360, whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.message || <span style={{ color: UP.caption }}>-</span>}</td>
                  <td style={{ padding: '8px 10px', color: UP.sub, whiteSpace: 'nowrap' }}>{r.email || <span style={{ color: UP.caption }}>-</span>}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '28px 10px', textAlign: 'center', color: UP.sub }}>아직 등록된 피드백이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
