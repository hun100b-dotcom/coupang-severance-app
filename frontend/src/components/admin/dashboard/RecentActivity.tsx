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
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12,
      padding: 'clamp(12px,3vw,20px)',
    }}>
      <p style={{ fontSize: 'clamp(0.75rem,2.5vw,0.82rem)', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 12 }}>
        최근 문의 활동
      </p>
      {inquiries.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.35)', textAlign: 'center', padding: '16px 0' }}>
          문의 없음
        </p>
      )}
      {inquiries.slice(0, 8).map(inq => (
        <div key={inq.id} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 0',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          {/* 상태 배지 */}
          <span style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            color: STATUS_COLOR[inq.status] ?? 'rgba(255,255,255,0.4)',
            background: `${STATUS_COLOR[inq.status] ?? 'rgba(255,255,255,0.1)'}22`,
            border: `1px solid ${STATUS_COLOR[inq.status] ?? 'rgba(255,255,255,0.15)'}55`,
            borderRadius: 4,
            padding: '1px 5px',
            flexShrink: 0,
            minWidth: 30,
            textAlign: 'center',
          }}>
            {STATUS_LABEL[inq.status] ?? inq.status}
          </span>
          {/* 내용 */}
          <span style={{
            flex: 1,
            fontSize: 'clamp(0.72rem,2.2vw,0.82rem)',
            color: 'rgba(255,255,255,0.75)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', marginRight: 4 }}>[{inq.category}]</span>
            {inq.title ?? inq.content.slice(0, 35)}
          </span>
          {/* 시각 */}
          <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>
            {fmt(inq.created_at)}
          </span>
        </div>
      ))}
    </div>
  )
}
