// AuditMenu.tsx — 관리자 감사 로그 (audit_logs 테이블)
import { useState, useEffect, useCallback } from 'react'
import { UP, RADIUS, btnPrimary, btnSecondary, btnGhost } from '../shared/adminTheme'
import { PageHead } from '../ds/DSKit'
import { getAuditLogs } from '../../../lib/api'
import { exportCsv } from '../../../utils/exportCsv'

/**
 * before/after 두 JSON 객체를 비교해서 변경된 키를 찾아 하이라이트
 * - 추가된 키: 초록색
 * - 삭제된 키: 빨간색
 * - 변경된 키: 노란색
 * - 그대로인 키: 흰색(기본)
 */
function DiffView({
  before,
  after,
}: {
  before: Record<string, unknown> | null
  after:  Record<string, unknown> | null
}) {
  // before, after 모두 없으면 렌더링 안 함
  if (!before && !after) return null

  const beforeObj = before ?? {}
  const afterObj  = after  ?? {}

  // 양쪽 합산 키 목록
  const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]))

  // 각 키의 변경 상태 결정
  function getStatus(key: string): 'added' | 'removed' | 'changed' | 'same' {
    const inBefore = key in beforeObj
    const inAfter  = key in afterObj
    if (!inBefore) return 'added'
    if (!inAfter)  return 'removed'
    if (JSON.stringify(beforeObj[key]) !== JSON.stringify(afterObj[key])) return 'changed'
    return 'same'
  }

  // 상태별 색상
  const STATUS_COLOR: Record<string, string> = {
    added:   UP.green,
    removed: UP.danger,
    changed: UP.amber,
    same:    UP.sub,
  }
  const STATUS_LABEL: Record<string, string> = {
    added:   '+ 추가',
    removed: '- 삭제',
    changed: '~ 변경',
    same:    '',
  }

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {/* BEFORE 패널 */}
      {before && (
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="text-a11" style={{ color: UP.danger, fontWeight: 700, marginBottom: 4 }}>BEFORE</div>
          <div style={{
            background: 'rgba(239,68,68,0.05)',
            borderRadius: 8, padding: '8px 10px',
          }}>
            {allKeys.map(key => {
              const status = getStatus(key)
              const val = beforeObj[key]
              if (status === 'added') return null // before에 없는 키는 before 패널에서 표시 안 함
              return (
                <div key={key} style={{ marginBottom: 3, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span className="text-a11" style={{ color: STATUS_COLOR[status], fontWeight: 600, minWidth: 40, flexShrink: 0 }}>
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="text-a11" style={{ color: STATUS_COLOR[status], fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    <strong style={{ color: STATUS_COLOR[status] }}>{key}:</strong>{' '}
                    {JSON.stringify(val)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* AFTER 패널 */}
      {after && (
        <div style={{ flex: 1, minWidth: 200 }}>
          <div className="text-a11" style={{ color: UP.green, fontWeight: 700, marginBottom: 4 }}>AFTER</div>
          <div style={{
            background: 'rgba(34,197,94,0.05)',
            borderRadius: 8, padding: '8px 10px',
          }}>
            {allKeys.map(key => {
              const status = getStatus(key)
              const val = afterObj[key]
              if (status === 'removed') return null // after에 없는 키는 after 패널에서 표시 안 함
              return (
                <div key={key} style={{ marginBottom: 3, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span className="text-a11" style={{ color: STATUS_COLOR[status], fontWeight: 600, minWidth: 40, flexShrink: 0 }}>
                    {STATUS_LABEL[status]}
                  </span>
                  <span className="text-a11" style={{ color: STATUS_COLOR[status], fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    <strong style={{ color: STATUS_COLOR[status] }}>{key}:</strong>{' '}
                    {JSON.stringify(val)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface AuditLogRow {
  id: string
  admin_email: string
  action: string
  target_type: string | null
  target_id: string | null
  before_val: Record<string, unknown> | null
  after_val: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

const PAGE_SIZE = 50

const ACTION_COLOR: Record<string, string> = {
  'inquiry.answer':   UP.green,
  'inquiry.status':   UP.brand,
  'settings.update':  UP.amber,
  'ip.block':         UP.danger,
  'ip.unblock':       UP.sub,
  'template.create':  UP.strong,
  'template.delete':  UP.strong,
  'admin.login':      UP.brand,
  'admin.view_dashboard': UP.brand,
  'admin.view_target':    UP.green,
  'admin.view_inquiries': UP.amber,
  'admin.view_members':   UP.strong,
  'admin.view_settings':  UP.amber,
  'admin.view_logs':      UP.caption,
  'unmask_members':   UP.danger,
  'answer_inquiry':   UP.green,
  'create_notice':    UP.green,
  'update_notice':    UP.amber,
  'delete_notice':    UP.danger,
  'create_account':   UP.green,
  'update_account':   UP.amber,
  'delete_account':   UP.danger,
}

function actionLabel(action: string) {
  const map: Record<string, string> = {
    'inquiry.answer': '문의 답변',
    'inquiry.status': '문의 상태변경',
    'settings.update': '설정 변경',
    'ip.block': 'IP 차단',
    'ip.unblock': 'IP 해제',
    'template.create': '템플릿 생성',
    'template.delete': '템플릿 삭제',
    'admin.login': '관리자 접속',
    'admin.view_dashboard': '대시보드 조회',
    'admin.view_target': '타겟 분석',
    'admin.view_inquiries': '문의 관리',
    'admin.view_members': '회원 관리',
    'admin.view_settings': '설정 조회',
    'admin.view_logs': '로그 조회',
    'unmask_members': '마스킹 해제',
    'answer_inquiry': '문의 답변',
    'create_notice': '공지 생성',
    'update_notice': '공지 수정',
    'delete_notice': '공지 삭제',
    'create_account': '계정 생성',
    'update_account': '계정 수정',
    'delete_account': '계정 삭제',
  }
  return map[action] ?? action
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return fmtDateTime(iso)
}

export default function AuditMenu() {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [emailFilter, setEmailFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  // 감사로그 조회는 백엔드 GET /admin/logs(경로 B, service-role)로 통일.
  // audit_logs RLS 상태와 무관하게 항상 조회되고, 실패 시 에러를 표시한다.
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getAuditLogs({
        page,
        limit: PAGE_SIZE,
        action: actionFilter.trim(),
        email: emailFilter.trim(),
        start: startDate,
        end: endDate,
      })
      setLogs(res.logs ?? [])
      setTotal(res.total ?? 0)
    } catch (err: unknown) {
      // 과거에는 console.error 만 찍어 빈 화면이 "로그 없음"과 구분 안 됐다 → 이제 표시
      setError(err instanceof Error ? err.message : '감사 로그를 불러오지 못했습니다.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [emailFilter, actionFilter, startDate, endDate, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // CSV 내보내기 (현재 페이지 기준 — 최대 PAGE_SIZE건)
  const handleExport = () => {
    if (logs.length === 0) { alert('내보낼 로그가 없습니다.'); return }
    exportCsv(logs.map(l => ({
      시간:     l.created_at,
      관리자:   l.admin_email,
      액션:     actionLabel(l.action),
      대상유형: l.target_type ?? '',
      대상ID:   l.target_id ?? '',
      IP:       l.ip_address ?? '',
      변경전:   l.before_val ? JSON.stringify(l.before_val) : '',
      변경후:   l.after_val ? JSON.stringify(l.after_val) : '',
    })), `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 1440, margin: '0 auto' }}>
      {/* 헤더 */}
      <PageHead
        icon="🔍"
        title="감사 로그"
        subtitle={`관리자 행동 감사 기록 · 총 ${total.toLocaleString()}건`}
        actions={
          <>
            <button onClick={handleExport} style={btnSecondary}>📥 CSV</button>
            <button onClick={fetchLogs} style={btnSecondary}>↻ 새로고침</button>
          </>
        }
      />

      {/* 에러 표시 (조회 실패 — 빈 화면이 "로그 없음"으로 오인되지 않도록) */}
      {error && (
        <div className="text-a13" style={{
          background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          color: UP.danger, fontWeight: 600,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* 필터 */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
        padding: '14px', borderRadius: 12,
        background: '#fff', border: `1px solid ${UP.hair}`,
      }}>
        <input
          type="text" placeholder="관리자 이메일 검색..."
          value={emailFilter} onChange={e => setEmailFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && fetchLogs()}
          style={{ ...filterInput, flex: '1 1 180px' }}
        />
        <select
          value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}
          style={{ ...filterInput, flex: '0 1 160px' }}
        >
          <option value="">전체 액션</option>
          <option value="inquiry.answer">문의 답변</option>
          <option value="inquiry.status">문의 상태변경</option>
          <option value="settings.update">설정 변경</option>
          <option value="admin.login">관리자 접속</option>
          <option value="admin.view_dashboard">대시보드 조회</option>
          <option value="unmask_members">마스킹 해제</option>
          <option value="ip.block">IP 차단</option>
        </select>
        <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setPage(1) }} style={{ ...filterInput, flex: '0 1 140px' }} />
        <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setPage(1) }} style={{ ...filterInput, flex: '0 1 140px' }} />
        <button onClick={() => { setPage(1); fetchLogs() }} style={btnPrimary}>검색</button>
        <button onClick={() => { setEmailFilter(''); setActionFilter(''); setStartDate(''); setEndDate(''); setPage(1) }} style={btnSecondary}>초기화</button>
      </div>

      {/* 로그 목록 */}
      <div style={{
        background: '#fff', border: `1px solid ${UP.hair}`,
        borderRadius: RADIUS.card, overflow: 'hidden',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: UP.sub, padding: '32px 0' }}>로딩 중...</p>
        ) : logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: UP.sub, padding: '32px 0' }}>조회된 로그가 없습니다.</p>
        ) : (
          <>
            {/* PC 테이블 헤더 */}
            <div className="hidden md:grid text-a11" style={{
              gridTemplateColumns: '140px 1fr 130px 100px 100px 50px',
              padding: '10px 16px', borderBottom: `1px solid ${UP.hairSoft}`, fontWeight: 700, color: UP.caption,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span>시간</span><span>관리자</span><span>액션</span><span>대상</span><span>IP</span><span>상세</span>
            </div>

            {logs.map(log => {
              const color = ACTION_COLOR[log.action] ?? UP.brand
              const hasDetail = log.before_val || log.after_val
              return (
                <div key={log.id}>
                  {/* PC 행 */}
                  <div className="hidden md:grid text-a13" style={{
                    gridTemplateColumns: '140px 1fr 130px 100px 100px 50px',
                    padding: '10px 16px', borderBottom: `1px solid ${UP.hairSoft}`,
                    alignItems: 'center',
                  }}>
                    <span className="text-a12" style={{ color: UP.sub, fontFamily: 'monospace', }}
                      title={fmtDateTime(log.created_at)}>
                      {fmtRelative(log.created_at)}
                    </span>
                    <span style={{ color: UP.navy, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.admin_email}
                    </span>
                    <span className="text-a11" style={{ fontWeight: 700, color,
                      background: `${color}18`, padding: '3px 8px', borderRadius: 999,
                      display: 'inline-block', width: 'fit-content',
                    }}>
                      {actionLabel(log.action)}
                    </span>
                    <span className="text-a12" style={{ color: UP.sub, }}>
                      {log.target_type ?? '-'}
                      {log.target_id ? ` #${log.target_id.length > 8 ? log.target_id.slice(0, 8) : log.target_id}` : ''}
                    </span>
                    <span className="text-a12" style={{ color: UP.caption, fontFamily: 'monospace' }}>
                      {log.ip_address ?? '-'}
                    </span>
                    {hasDetail ? (
                      <button onClick={() => setExpanded(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                        className="text-a11" style={{ ...btnGhost, padding: '2px 6px', }}>
                        {expanded[log.id] ? '▲' : '▼'}
                      </button>
                    ) : (
                      <span className="text-a11" style={{ color: UP.caption, }}>-</span>
                    )}
                  </div>

                  {/* PC 상세 — before/after diff 하이라이트 */}
                  {expanded[log.id] && hasDetail && (
                    <div className="hidden md:block" style={{
                      padding: '8px 16px 12px',
                      borderBottom: `1px solid ${UP.hairSoft}`,
                      background: 'rgba(49,130,246,0.04)',
                    }}>
                      <DiffView before={log.before_val} after={log.after_val} />
                    </div>
                  )}

                  {/* 모바일 카드 */}
                  <div className="md:hidden" style={{ padding: '12px 16px', borderBottom: `1px solid ${UP.hairSoft}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span className="text-a11" style={{ fontWeight: 700, color, background: `${color}18`, padding: '2px 7px', borderRadius: 999 }}>
                        {actionLabel(log.action)}
                      </span>
                      <span className="text-a11" style={{ color: UP.sub }}>{fmtRelative(log.created_at)}</span>
                    </div>
                    <div className="text-a13" style={{ color: UP.navy, marginBottom: 2, wordBreak: 'break-all' }}>{log.admin_email}</div>
                    {log.target_type && (
                      <div className="text-a11" style={{ color: UP.sub }}>
                        대상: {log.target_type} {log.target_id ? `· #${log.target_id.slice(0, 8)}` : ''}
                      </div>
                    )}
                    {hasDetail && (
                      <button onClick={() => setExpanded(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                        className="text-a11" style={{ ...btnGhost, padding: '3px 8px', marginTop: 6 }}>
                        상세 {expanded[log.id] ? '접기' : '보기'}
                      </button>
                    )}
                    {/* 모바일 diff 보기 */}
                    {expanded[log.id] && hasDetail && (
                      <div style={{ marginTop: 8 }}>
                        <DiffView before={log.before_val} after={log.after_val} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ ...btnGhost, opacity: page === 1 ? 0.4 : 1 }}>← 이전</button>
          <span className="text-a13" style={{ color: UP.sub, padding: '7px 12px' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ ...btnGhost, opacity: page === totalPages ? 0.4 : 1 }}>다음 →</button>
        </div>
      )}
    </div>
  )
}

const filterInput: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: `1px solid ${UP.hair}`,
  background: '#fff', color: UP.navy, fontSize: '0.82rem', outline: 'none',
}
