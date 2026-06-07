import type { AuditLog } from '../../../types/admin'
import { exportCsv } from '../../../utils/exportCsv'
import { exportXlsx } from '../../../utils/exportXlsx'

interface Props {
  logs: AuditLog[]
  total: number
  page: number
  onPageChange: (p: number) => void
}

const ACTION_COLOR: Record<string, string> = {
  'inquiry.answer':   '#00c48c',
  'inquiry.status':   '#3182f6',
  'settings.update':  '#f08c00',
  'ip.block':         '#cc2233',
  'ip.unblock':       '#94a3b8',
  'template.create':  '#6c5ce7',
  'template.delete':  '#fd79a8',
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function AuditLogTable({ logs, total, page, onPageChange }: Props) {
  const LIMIT = 50
  const totalPages = Math.ceil(total / LIMIT)

  const handleExportCsv = () => {
    exportCsv(logs.map(l => ({
      시간: l.created_at,
      관리자: l.admin_email,
      행동: l.action,
      대상유형: l.target_type ?? '',
      대상ID: l.target_id ?? '',
      IP: l.ip_address ?? '',
    })), `audit_logs_${new Date().toISOString().slice(0,10)}.csv`)
  }

  const handleExportXlsx = () => {
    exportXlsx(logs.map(l => ({
      시간: l.created_at,
      관리자: l.admin_email,
      행동: l.action,
      대상유형: l.target_type ?? '',
      대상ID: l.target_id ?? '',
      IP: l.ip_address ?? '',
    })), '감사로그', `audit_logs_${new Date().toISOString().slice(0,10)}.xlsx`)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: '0.82rem', color: '#64748b', flex: 1 }}>
          전체 {total}건
        </span>
        <button onClick={handleExportCsv} style={exportBtn}>CSV 다운로드</button>
        <button onClick={handleExportXlsx} style={exportBtn}>XLSX 다운로드</button>
      </div>

      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              {['시간', '관리자', '행동', '대상', 'IP'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>{fmt(log.created_at)}</td>
                <td style={{ padding: '8px 10px', color: '#475569', whiteSpace: 'nowrap' }}>{log.admin_email.split('@')[0]}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: ACTION_COLOR[log.action] ?? '#64748b',
                    background: `${ACTION_COLOR[log.action] ?? '#64748b'}18`,
                    padding: '2px 8px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '8px 10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {log.target_type} {log.target_id ? `#${log.target_id.slice(0, 8)}` : ''}
                </td>
                <td style={{ padding: '8px 10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                  {log.ip_address ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '32px 0', fontSize: '0.85rem' }}>
            로그가 없습니다.
          </p>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                background: p === page ? '#3182f6' : '#f1f5f9',
                color: p === page ? '#fff' : '#64748b',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const exportBtn: React.CSSProperties = {
  padding: '5px 12px', borderRadius: 7, border: '1px solid #e2e8f0',
  background: '#f8fafc', color: '#475569',
  fontSize: '0.75rem', cursor: 'pointer',
}
