import { useCallback, useEffect, useState } from 'react'
import { getAuditLogs } from '../../../lib/api'
import type { AuditLog } from '../../../types/admin'
import AuditLogTable from '../logs/AuditLogTable'

const ACTION_OPTIONS = [
  '', 'inquiry.answer', 'inquiry.status', 'settings.update',
  'ip.block', 'ip.unblock', 'template.create', 'template.delete',
]

export default function LogsMenu() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [action, setAction] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getAuditLogs({ page, limit: 50, action, start, end })
      setLogs(res.logs ?? [])
      setTotal(res.total ?? 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [page, action, start, end])

  useEffect(() => { load() }, [load])

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>Audit Logs</h2>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>모든 관리자 행동 기록</p>
        </div>
        <button onClick={load} style={{ marginLeft: 'auto', ...outlineBtn }}>↻</button>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <select
          value={action}
          onChange={e => { setAction(e.target.value); setPage(1) }}
          style={selectStyle}
        >
          {ACTION_OPTIONS.map(a => (
            <option key={a} value={a}>{a || '전체 행동'}</option>
          ))}
        </select>
        <input
          type="date"
          value={start}
          onChange={e => { setStart(e.target.value); setPage(1) }}
          style={selectStyle}
        />
        <input
          type="date"
          value={end}
          onChange={e => { setEnd(e.target.value); setPage(1) }}
          style={selectStyle}
        />
      </div>

      {/* 테이블 */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, padding: '16px', overflow: 'hidden',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>
            로딩 중...
          </p>
        ) : (
          <AuditLogTable logs={logs} total={total} page={page} onPageChange={setPage} />
        )}
      </div>
    </div>
  )
}

const outlineBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
  fontSize: '0.78rem', cursor: 'pointer',
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '6px 10px', fontSize: '0.82rem',
  color: 'rgba(255,255,255,0.7)', outline: 'none', cursor: 'pointer',
}
