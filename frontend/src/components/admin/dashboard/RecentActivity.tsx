import type { AdminInquiry } from '../../../types/admin'

interface Props {
  inquiries: AdminInquiry[]
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const STATUS_COLOR: Record<string, string> = {
  waiting:   '#f08c00',
  reviewing: '#3182f6',
  answered:  '#00a876',
  closed:    'rgba(255,255,255,0.3)',
}
const STATUS_LABEL: Record<string, string> = {
  waiting:   '대기',
  reviewing: '검토',
  answered:  '답변',
  closed:    '종결',
}

export default function RecentActivity({ inquiries }: Props) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '20px',
    }}>
      <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', marginBottom: 14 }}>
        최근 문의 활동
      </p>
      {inquiries.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px 0' }}>
          문의 없음
        </p>
      )}
      {inquiries.slice(0, 8).map(inq => (
        <div key={inq.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 0',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: STATUS_COLOR[inq.status] ?? 'rgba(255,255,255,0.4)',
            minWidth: 28,
          }}>
            {STATUS_LABEL[inq.status] ?? inq.status}
          </span>
          <span style={{ flex: 1, fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            [{inq.category}] {inq.title ?? inq.content.slice(0, 40)}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>
            {fmt(inq.created_at)}
          </span>
        </div>
      ))}
    </div>
  )
}
