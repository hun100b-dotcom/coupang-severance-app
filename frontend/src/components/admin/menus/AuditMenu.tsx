// AuditMenu.tsx — 관리자 감사 로그 (audit_logs 테이블)
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

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
  'inquiry.answer':   '#00c48c',
  'inquiry.status':   '#3182f6',
  'settings.update':  '#f59e0b',
  'ip.block':         '#ef4444',
  'ip.unblock':       '#6b7280',
  'template.create':  '#8b5cf6',
  'template.delete':  '#ec4899',
  'admin.login':      '#06b6d4',
  'admin.view_dashboard': '#60a5fa',
  'admin.view_target':    '#34d399',
  'admin.view_inquiries': '#fbbf24',
  'admin.view_members':   '#a78bfa',
  'admin.view_settings':  '#f97316',
  'admin.view_logs':      '#94a3b8',
  'unmask_members':   '#ef4444',
  'answer_inquiry':   '#00c48c',
  'create_notice':    '#22c55e',
  'update_notice':    '#f59e0b',
  'delete_notice':    '#ef4444',
  'create_account':   '#22c55e',
  'update_account':   '#f59e0b',
  'delete_account':   '#ef4444',
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

  const fetchLogs = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (emailFilter.trim()) query = query.ilike('admin_email', `%${emailFilter.trim()}%`)
      if (actionFilter.trim()) query = query.eq('action', actionFilter.trim())
      if (startDate) query = query.gte('created_at', `${startDate}T00:00:00`)
      if (endDate) query = query.lte('created_at', `${endDate}T23:59:59`)

      const from = (page - 1) * PAGE_SIZE
      query = query.range(from, from + PAGE_SIZE - 1)

      const { data, error, count } = await query
      if (error) throw error
      setLogs(data ?? [])
      setTotal(count ?? 0)
    } catch (err) {
      console.error('감사 로그 불러오기 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [emailFilter, actionFilter, startDate, endDate, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            Audit Logs
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            관리자 행동 감사 기록 (총 {total.toLocaleString()}건)
          </p>
        </div>
        <button onClick={fetchLogs} style={{ ...outlineBtn, marginLeft: 'auto' }}>↻ 새로고침</button>
      </div>

      {/* 필터 */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
        padding: '14px', borderRadius: 12,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
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
        <button onClick={() => { setPage(1); fetchLogs() }} style={primaryBtn}>검색</button>
        <button onClick={() => { setEmailFilter(''); setActionFilter(''); setStartDate(''); setEndDate(''); setPage(1) }} style={outlineBtn}>초기화</button>
      </div>

      {/* 로그 목록 */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0' }}>로딩 중...</p>
        ) : logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0' }}>조회된 로그가 없습니다.</p>
        ) : (
          <>
            {/* PC 테이블 헤더 */}
            <div className="hidden md:grid" style={{
              gridTemplateColumns: '140px 1fr 130px 100px 100px 50px',
              padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span>시간</span><span>관리자</span><span>액션</span><span>대상</span><span>IP</span><span>상세</span>
            </div>

            {logs.map(log => {
              const color = ACTION_COLOR[log.action] ?? '#60a5fa'
              const hasDetail = log.before_val || log.after_val
              return (
                <div key={log.id}>
                  {/* PC 행 */}
                  <div className="hidden md:grid" style={{
                    gridTemplateColumns: '140px 1fr 130px 100px 100px 50px',
                    padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    alignItems: 'center', fontSize: '0.82rem',
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '0.73rem' }}
                      title={fmtDateTime(log.created_at)}>
                      {fmtRelative(log.created_at)}
                    </span>
                    <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.admin_email}
                    </span>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, color,
                      background: `${color}18`, padding: '3px 8px', borderRadius: 999,
                      display: 'inline-block', width: 'fit-content',
                    }}>
                      {actionLabel(log.action)}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.73rem' }}>
                      {log.target_type ?? '-'}
                      {log.target_id ? ` #${log.target_id.length > 8 ? log.target_id.slice(0, 8) : log.target_id}` : ''}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.73rem', fontFamily: 'monospace' }}>
                      {log.ip_address ?? '-'}
                    </span>
                    {hasDetail ? (
                      <button onClick={() => setExpanded(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                        style={{ ...outlineBtn, padding: '2px 6px', fontSize: '0.68rem' }}>
                        {expanded[log.id] ? '▲' : '▼'}
                      </button>
                    ) : (
                      <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.72rem' }}>-</span>
                    )}
                  </div>

                  {/* PC 상세 */}
                  {expanded[log.id] && hasDetail && (
                    <div className="hidden md:flex" style={{
                      padding: '8px 16px 12px', gap: 16,
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: 'rgba(49,130,246,0.04)',
                    }}>
                      {log.before_val && (
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700 }}>BEFORE</span>
                          <pre style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: '4px 0 0' }}>
                            {JSON.stringify(log.before_val, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.after_val && (
                        <div style={{ flex: 1 }}>
                          <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: 700 }}>AFTER</span>
                          <pre style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: '4px 0 0' }}>
                            {JSON.stringify(log.after_val, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 모바일 카드 */}
                  <div className="md:hidden" style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color, background: `${color}18`, padding: '2px 7px', borderRadius: 999 }}>
                        {actionLabel(log.action)}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>{fmtRelative(log.created_at)}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#fff', marginBottom: 2, wordBreak: 'break-all' }}>{log.admin_email}</div>
                    {log.target_type && (
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                        대상: {log.target_type} {log.target_id ? `· #${log.target_id.slice(0, 8)}` : ''}
                      </div>
                    )}
                    {hasDetail && (
                      <button onClick={() => setExpanded(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                        style={{ ...outlineBtn, padding: '3px 8px', fontSize: '0.72rem', marginTop: 6 }}>
                        상세 {expanded[log.id] ? '접기' : '보기'}
                      </button>
                    )}
                    {expanded[log.id] && hasDetail && (
                      <pre style={{
                        marginTop: 8, fontSize: '0.68rem', color: 'rgba(255,255,255,0.5)',
                        fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                        background: 'rgba(49,130,246,0.05)', borderRadius: 8, padding: 8,
                      }}>
                        {JSON.stringify({ before: log.before_val, after: log.after_val }, null, 2)}
                      </pre>
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
            style={{ ...outlineBtn, opacity: page === 1 ? 0.4 : 1 }}>← 이전</button>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', padding: '7px 12px' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ ...outlineBtn, opacity: page === totalPages ? 0.4 : 1 }}>다음 →</button>
        </div>
      )}
    </div>
  )
}

const outlineBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600,
}
const primaryBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8, border: 'none',
  background: '#3182f6', color: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
}
const filterInput: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.82rem', outline: 'none',
}
