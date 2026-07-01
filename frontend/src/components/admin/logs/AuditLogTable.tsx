import type { AuditLog } from '../../../types/admin'
import { exportCsv } from '../../../utils/exportCsv'
import { UP } from '../shared/adminTheme'
import { exportXlsx } from '../../../utils/exportXlsx'

interface Props {
  logs: AuditLog[]
  total: number
  page: number
  onPageChange: (p: number) => void
}

const ACTION_COLOR: Record<string, string> = {
  'inquiry.answer':   UP.green,
  'inquiry.status':   UP.brand,
  'settings.update':  UP.amber,
  'ip.block':         UP.danger,
  'ip.unblock':       UP.caption,
  'template.create':  UP.strong,
  'template.delete':  UP.danger,
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
        <span className="text-a13" style={{ color: UP.sub, flex: 1 }}>
          전체 {total}건
        </span>
        <button onClick={handleExportCsv} style={exportBtn}>CSV 다운로드</button>
        <button onClick={handleExportXlsx} style={exportBtn}>XLSX 다운로드</button>
      </div>

      <div style={{ overflow: 'auto' }}>
        <table className="text-a13" style={{ width: '100%', borderCollapse: 'collapse', }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${UP.hairSoft}` }}>
              {['시간', '관리자', '행동', '대상', 'IP'].map(h => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: UP.sub, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} style={{ borderBottom: `1px solid ${UP.hairSoft}` }}>
                <td style={{ padding: '8px 10px', color: UP.sub, whiteSpace: 'nowrap' }}>{fmt(log.created_at)}</td>
                <td style={{ padding: '8px 10px', color: UP.body, whiteSpace: 'nowrap' }}>{log.admin_email.split('@')[0]}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span className="text-a11" style={{
                    fontWeight: 700,
                    color: ACTION_COLOR[log.action] ?? UP.sub,
                    background: `${ACTION_COLOR[log.action] ?? UP.sub}18`,
                    padding: '2px 8px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                  }}>
                    {log.action}
                  </span>
                </td>
                <td style={{ padding: '8px 10px', color: UP.sub, whiteSpace: 'nowrap' }}>
                  {log.target_type} {log.target_id ? `#${log.target_id.slice(0, 8)}` : ''}
                </td>
                <td style={{ padding: '8px 10px', color: UP.caption, whiteSpace: 'nowrap' }}>
                  {log.ip_address ?? '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <p className="text-a13" style={{ textAlign: 'center', color: UP.sub, padding: '32px 0', }}>
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
              className="text-a12" style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                background: p === page ? UP.brand : UP.hairSoft,
                color: p === page ? '#fff' : UP.sub,
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
  padding: '5px 12px', borderRadius: 7, border: `1px solid ${UP.hair}`,
  background: UP.sunken, color: UP.body,
  fontSize: '0.75rem', cursor: 'pointer',
}
