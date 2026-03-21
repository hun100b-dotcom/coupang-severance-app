import { bulkInquiryStatus } from '../../../lib/api'

interface Props {
  selectedIds: string[]
  onDone: () => void
}

const ACTIONS = [
  { label: '검토중으로', status: 'reviewing', color: '#3182f6' },
  { label: '답변완료로', status: 'answered',  color: '#00a876' },
  { label: '종결로',     status: 'closed',    color: 'rgba(255,255,255,0.4)' },
]

export default function BulkActionBar({ selectedIds, onDone }: Props) {
  if (selectedIds.length === 0) return null

  const handle = async (status: string) => {
    try {
      await bulkInquiryStatus(selectedIds, status)
      onDone()
    } catch {
      // silent
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 16px',
      background: 'rgba(49,130,246,0.1)',
      borderRadius: 10,
      marginBottom: 12,
      border: '1px solid rgba(49,130,246,0.2)',
    }}>
      <span style={{ fontSize: '0.82rem', color: '#3182f6', fontWeight: 700 }}>
        {selectedIds.length}건 선택됨
      </span>
      <span style={{ marginLeft: 8, fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>일괄 변경:</span>
      {ACTIONS.map(a => (
        <button
          key={a.status}
          onClick={() => handle(a.status)}
          style={{
            padding: '5px 12px',
            borderRadius: 999,
            border: 'none',
            background: `${a.color}20`,
            color: a.color,
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
