// 최근 문의 활동 — 라이트 모드 전환
import type { AdminInquiry } from '../../../types/admin'

interface Props {
  inquiries: AdminInquiry[]
}

function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  return `${Math.floor(days / 30)}개월 전`
}

// 라이트 모드 상태 색상
const STATUS_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  waiting:   { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: '대기중' },
  reviewing: { color: '#3182f6', bg: '#eff6ff', border: '#bfdbfe', label: '검토중' },
  answered:  { color: '#059669', bg: '#f0fdf4', border: '#bbf7d0', label: '답변완료' },
  closed:    { color: '#475569', bg: '#f8fafc', border: '#e2e8f0', label: '종결' },
}

const CATEGORY_COLOR: Record<string, string> = {
  '기타': '#64748b',
  '오류/버그': '#e11d48',
  '서류발급': '#7c3aed',
  '계산오류': '#d97706',
  '사용방법': '#0891b2',
}

export default function RecentActivity({ inquiries }: Props) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e2e8f0',
      borderRadius: 16,
      padding: 'clamp(14px,3vw,22px)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>최근 문의 활동</p>
          <p style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>최근 8건</p>
        </div>
        {inquiries.length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {['waiting', 'answered'].map(s => {
              const count = inquiries.filter(i => i.status === s).length
              const meta = STATUS_META[s]
              return count > 0 ? (
                <span key={s} style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: meta.color,
                  background: meta.bg,
                  border: `1px solid ${meta.border}`,
                  padding: '2px 8px',
                  borderRadius: 99,
                }}>
                  {meta.label} {count}
                </span>
              ) : null
            })}
          </div>
        )}
      </div>

      {inquiries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: 6 }}>📭</p>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>문의 없음</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {inquiries.slice(0, 8).map(inq => {
            const status = STATUS_META[inq.status] ?? STATUS_META.waiting
            const catColor = CATEGORY_COLOR[inq.category] ?? '#64748b'
            return (
              <div key={inq.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                background: '#f8fafc',
                border: '1px solid #f1f5f9',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#eff6ff' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#f8fafc' }}
              >
                {/* 상태 인디케이터 바 */}
                <div style={{
                  width: 3, height: 32,
                  borderRadius: 99,
                  background: status.color,
                  flexShrink: 0,
                }} />

                {/* 콘텐츠 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700,
                      color: catColor,
                      background: `${catColor}14`,
                      padding: '1px 5px',
                      borderRadius: 4,
                    }}>
                      {inq.category}
                    </span>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700,
                      color: status.color,
                      background: status.bg,
                      border: `1px solid ${status.border}`,
                      padding: '1px 5px',
                      borderRadius: 4,
                    }}>
                      {status.label}
                    </span>
                  </div>
                  <p style={{
                    fontSize: '0.82rem',
                    color: '#334155',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}>
                    {inq.title ?? inq.content.slice(0, 50)}
                  </p>
                </div>

                <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {fmtRelative(inq.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
