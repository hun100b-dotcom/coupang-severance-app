import type { AdminInquiry } from '../../../types/admin'

interface Props {
  inquiries: AdminInquiry[]
  selected: Set<string>
  onToggle: (id: string) => void
  onToggleAll: () => void
  onSelect: (inq: AdminInquiry) => void
  activeId?: string
}

const STATUS_COLOR: Record<string, string> = {
  waiting:   '#f08c00',
  reviewing: '#3182f6',
  answered:  '#00a876',
  closed:    'rgba(255,255,255,0.3)',
}
const STATUS_LABEL: Record<string, string> = {
  waiting:   '대기중',
  reviewing: '검토중',
  answered:  '답변완료',
  closed:    '종결',
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

export default function InquiryTable({ inquiries, selected, onToggle, onToggleAll, onSelect, activeId }: Props) {
  const allSelected = inquiries.length > 0 && inquiries.every(i => selected.has(i.id))

  return (
    <div style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <th style={{ padding: '10px 12px', textAlign: 'left', width: 36 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th style={{ padding: '10px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>상태</th>
            <th style={{ padding: '10px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>카테고리</th>
            <th style={{ padding: '10px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>내용</th>
            <th style={{ padding: '10px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, whiteSpace: 'nowrap' }}>접수일시</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map(inq => {
            const isActive = inq.id === activeId
            return (
              <tr
                key={inq.id}
                onClick={() => onSelect(inq)}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  background: isActive ? 'rgba(49,130,246,0.1)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
              >
                <td style={{ padding: '10px 12px' }} onClick={e => { e.stopPropagation(); onToggle(inq.id) }}>
                  <input
                    type="checkbox"
                    checked={selected.has(inq.id)}
                    onChange={() => onToggle(inq.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: STATUS_COLOR[inq.status] ?? 'rgba(255,255,255,0.4)',
                    background: `${STATUS_COLOR[inq.status]}18`,
                    padding: '2px 8px',
                    borderRadius: 999,
                    whiteSpace: 'nowrap',
                  }}>
                    {STATUS_LABEL[inq.status] ?? inq.status}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                  {inq.category}
                </td>
                <td style={{
                  padding: '10px 8px',
                  color: 'rgba(255,255,255,0.8)',
                  maxWidth: 300,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {inq.title ?? inq.content.slice(0, 60)}
                </td>
                <td style={{ padding: '10px 8px', color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
                  {fmt(inq.created_at)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {inquiries.length === 0 && (
        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>
          문의가 없습니다.
        </p>
      )}
    </div>
  )
}
