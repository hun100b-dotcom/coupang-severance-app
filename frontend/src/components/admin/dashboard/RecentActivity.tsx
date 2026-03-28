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

const STATUS_META: Record<string, { color: string; bg: string; label: string }> = {
  waiting:   { color: '#f08c00', bg: 'rgba(240,140,0,0.12)',  label: '대기중' },
  reviewing: { color: '#3182f6', bg: 'rgba(49,130,246,0.12)', label: '검토중' },
  answered:  { color: '#22c55e', bg: 'rgba(34,197,94,0.12)',  label: '답변완료' },
  closed:    { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', label: '종결' },
}

const CATEGORY_COLOR: Record<string, string> = {
  '기타': '#94a3b8',
  '오류/버그': '#ef4444',
  '서류발급': '#8b5cf6',
  '계산오류': '#f59e0b',
  '사용방법': '#06b6d4',
}

export default function RecentActivity({ inquiries }: Props) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, padding: 'clamp(14px,3vw,22px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 'clamp(0.78rem,2.5vw,0.88rem)', fontWeight: 700, color: '#fff', margin: 0 }}>
            최근 문의 활동
          </p>
          <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            최근 8건
          </p>
        </div>
        {inquiries.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            {['waiting', 'answered'].map(s => {
              const count = inquiries.filter(i => i.status === s).length
              const meta = STATUS_META[s]
              return count > 0 ? (
                <span key={s} style={{
                  fontSize: '0.68rem', fontWeight: 700, color: meta.color,
                  background: meta.bg, padding: '3px 8px', borderRadius: 99,
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
          <p style={{ fontSize: '1.5rem', marginBottom: 6 }}>&#x1f4ed;</p>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)' }}>문의 없음</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {inquiries.slice(0, 8).map(inq => {
            const status = STATUS_META[inq.status] ?? STATUS_META.waiting
            const catColor = CATEGORY_COLOR[inq.category] ?? '#94a3b8'
            return (
              <div key={inq.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              >
                {/* 상태 인디케이터 */}
                <div style={{
                  width: 4, height: 32, borderRadius: 99,
                  background: status.color, flexShrink: 0,
                }} />

                {/* 콘텐츠 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 700, color: catColor,
                      background: `${catColor}15`, padding: '1px 6px', borderRadius: 4,
                    }}>
                      {inq.category}
                    </span>
                    <span style={{
                      fontSize: '0.62rem', fontWeight: 600, color: status.color,
                      background: status.bg, padding: '1px 5px', borderRadius: 4,
                    }}>
                      {status.label}
                    </span>
                  </div>
                  <p style={{
                    fontSize: 'clamp(0.73rem,2.2vw,0.82rem)', color: 'rgba(255,255,255,0.8)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    margin: 0,
                  }}>
                    {inq.title ?? inq.content.slice(0, 50)}
                  </p>
                </div>

                {/* 시각 */}
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', flexShrink: 0, whiteSpace: 'nowrap' }}>
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
