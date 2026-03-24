// AuditMenu.tsx — 관리자 오딧 로그 (감사 로그) 메뉴
// ─────────────────────────────────────────────────────────────
// Supabase `admin_audit_logs` 테이블에서 모든 관리자 행동 기록을 조회합니다.
//
// 테이블 컬럼:
//   id, admin_email, action, target_table, target_id,
//   detail(jsonb), created_at
//
// 기능:
//   - 감사 로그 목록 조회 (페이지네이션: 50건씩)
//   - 필터: 날짜 범위, 관리자 이메일, 액션 종류
//   - 상세(detail jsonb) 클릭 시 펼쳐 보기
//
// SQL 테이블 구조:
//   → supabase/migrations/004_admin_audit_logs.sql 파일 참조

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

// ── 감사 로그 타입 ──
interface AuditLogRow {
  id: string
  admin_email: string
  action: string
  target_table: string | null
  target_id: string | null
  detail: Record<string, unknown> | null // jsonb
  created_at: string
}

// ── 페이지당 표시 건수 ──
const PAGE_SIZE = 50

export default function AuditMenu() {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  // ── 필터 상태 ──
  const [emailFilter, setEmailFilter] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // ── 페이지네이션 ──
  const [page, setPage] = useState(1)

  // ── 상세 펼침 상태 (로그 id → 펼침 여부) ──
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // ── 감사 로그 불러오기 ──
  const fetchLogs = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    try {
      let query = supabase
        .from('admin_audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      // 이메일 필터 (포함 검색)
      if (emailFilter.trim()) {
        query = query.ilike('admin_email', `%${emailFilter.trim()}%`)
      }
      // 액션 필터 (정확히 일치)
      if (actionFilter.trim()) {
        query = query.eq('action', actionFilter.trim())
      }
      // 날짜 범위 필터
      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`)
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`)
      }

      // 페이지네이션: range(from, to) 사용
      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      query = query.range(from, to)

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

  // ── 필터 적용 시 페이지 초기화 ──
  function applyFilter() {
    setPage(1)
    fetchLogs()
  }

  // ── 날짜 포맷 (YYYY.MM.DD HH:mm) ──
  function formatDateTime(iso: string) {
    const d = new Date(iso)
    const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return `${date} ${time}`
  }

  // ── 액션별 색상 ──
  function actionColor(action: string) {
    if (action.includes('delete') || action.includes('삭제')) return '#f04052'
    if (action.includes('create') || action.includes('생성')) return '#22c55e'
    if (action.includes('update') || action.includes('수정')) return '#f59e0b'
    return '#3182f6'
  }

  // ── 상세 펼침 토글 ──
  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  // ── 총 페이지 수 ──
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>

      {/* ── 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            관리자 감사 로그
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            admin_audit_logs 테이블 · 모든 관리자 행동 기록 (총 {total.toLocaleString()}건)
          </p>
        </div>
        <button onClick={fetchLogs} style={{ ...outlineBtn, marginLeft: 'auto' }}>↻ 새로고침</button>
      </div>

      {/* ── 필터 섹션 ── */}
      <div style={{
        display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16,
        padding: '14px', borderRadius: 12,
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
      }}>
        {/* 이메일 검색 */}
        <input
          type="text"
          placeholder="관리자 이메일 검색..."
          value={emailFilter}
          onChange={e => setEmailFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilter()}
          style={{ ...filterInput, flex: '1 1 180px' }}
        />
        {/* 액션 검색 */}
        <input
          type="text"
          placeholder="액션명 (예: notice.create)"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilter()}
          style={{ ...filterInput, flex: '1 1 180px' }}
        />
        {/* 시작 날짜 */}
        <input
          type="date"
          value={startDate}
          onChange={e => { setStartDate(e.target.value); setPage(1) }}
          style={{ ...filterInput, flex: '0 1 140px' }}
        />
        {/* 종료 날짜 */}
        <input
          type="date"
          value={endDate}
          onChange={e => { setEndDate(e.target.value); setPage(1) }}
          style={{ ...filterInput, flex: '0 1 140px' }}
        />
        {/* 적용 버튼 */}
        <button onClick={applyFilter} style={primaryBtn}>필터 적용</button>
        {/* 초기화 버튼 */}
        <button
          onClick={() => {
            setEmailFilter(''); setActionFilter('')
            setStartDate(''); setEndDate('')
            setPage(1)
          }}
          style={outlineBtn}
        >
          초기화
        </button>
      </div>

      {/* ── 로그 목록 ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>
            로딩 중...
          </p>
        ) : logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>
            조회된 로그가 없습니다.
          </p>
        ) : (
          <>
            {/* PC 테이블 헤더 */}
            <div
              className="hidden md:grid"
              style={{
                gridTemplateColumns: '160px 1fr 120px 80px 60px',
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: '0.72rem', fontWeight: 700,
                color: 'rgba(255,255,255,0.3)',
                textTransform: 'uppercase', letterSpacing: '0.05em',
              }}
            >
              <span>날짜/시간</span>
              <span>이메일</span>
              <span>액션</span>
              <span>대상 테이블</span>
              <span>상세</span>
            </div>

            {logs.map(log => (
              <div key={log.id}>
                {/* PC 행 */}
                <div
                  className="hidden md:grid"
                  style={{
                    gridTemplateColumns: '160px 1fr 120px 80px 60px',
                    padding: '10px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    alignItems: 'center',
                    fontSize: '0.82rem',
                  }}
                >
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {formatDateTime(log.created_at)}
                  </span>
                  <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.admin_email}
                  </span>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    color: actionColor(log.action),
                    background: `${actionColor(log.action)}18`,
                    padding: '3px 8px', borderRadius: 999,
                    display: 'inline-block',
                  }}>
                    {log.action}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
                    {log.target_table ?? '-'}
                  </span>
                  {/* 상세 펼침 버튼 */}
                  {log.detail ? (
                    <button
                      onClick={() => toggleExpand(log.id)}
                      style={{ ...outlineBtn, padding: '3px 8px', fontSize: '0.72rem' }}
                    >
                      {expanded[log.id] ? '접기' : '보기'}
                    </button>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem' }}>-</span>
                  )}
                </div>

                {/* PC 상세 펼침 영역 */}
                {expanded[log.id] && log.detail && (
                  <div
                    className="hidden md:block"
                    style={{
                      padding: '8px 16px 12px',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: 'rgba(49,130,246,0.05)',
                    }}
                  >
                    <pre style={{
                      fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)',
                      fontFamily: 'monospace', whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all', margin: 0,
                    }}>
                      {JSON.stringify(log.detail, null, 2)}
                    </pre>
                  </div>
                )}

                {/* 모바일 카드 */}
                <div
                  className="md:hidden"
                  style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700,
                      color: actionColor(log.action),
                      background: `${actionColor(log.action)}18`,
                      padding: '2px 7px', borderRadius: 999,
                    }}>
                      {log.action}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                      {formatDateTime(log.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#fff', marginBottom: 2, wordBreak: 'break-all' }}>
                    {log.admin_email}
                  </div>
                  {log.target_table && (
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
                      테이블: {log.target_table} {log.target_id ? `· ID: ${log.target_id}` : ''}
                    </div>
                  )}
                  {log.detail && (
                    <button
                      onClick={() => toggleExpand(log.id)}
                      style={{ ...outlineBtn, padding: '3px 8px', fontSize: '0.72rem', marginTop: 6 }}
                    >
                      상세 {expanded[log.id] ? '접기 ▲' : '보기 ▼'}
                    </button>
                  )}
                  {expanded[log.id] && log.detail && (
                    <pre style={{
                      marginTop: 8, fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      background: 'rgba(49,130,246,0.05)',
                      borderRadius: 8, padding: '8px',
                    }}>
                      {JSON.stringify(log.detail, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── 페이지네이션 ── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{ ...outlineBtn, opacity: page === 1 ? 0.4 : 1 }}
          >
            ← 이전
          </button>
          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.82rem', padding: '7px 12px' }}>
            {page} / {totalPages} 페이지
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{ ...outlineBtn, opacity: page === totalPages ? 0.4 : 1 }}
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  )
}

// ── 공통 스타일 ──
const outlineBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600,
}
const primaryBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8,
  border: 'none', background: '#3182f6', color: '#fff',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
}
const filterInput: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.06)', color: '#fff',
  fontSize: '0.82rem', outline: 'none',
}
