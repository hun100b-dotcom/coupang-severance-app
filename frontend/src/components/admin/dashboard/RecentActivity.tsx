// 최근 문의 활동 — 업비트 톤 (상태/카테고리 색 토큰화)
import type { AdminInquiry } from '../../../types/admin'
import { UP } from '../shared/adminTheme'

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

// 상태 색상 — 토큰 기반 (텍스트 AA 고려)
const STATUS_META: Record<string, { color: string; bg: string; border: string; label: string }> = {
  waiting:   { color: UP.amber,  bg: UP.amberBg,  border: UP.amberLine,  label: '대기중' },
  reviewing: { color: UP.strong, bg: UP.brandBg,  border: UP.brandLine,  label: '검토중' },
  answered:  { color: UP.green,  bg: UP.greenBg,  border: UP.greenLine,  label: '답변완료' },
  closed:    { color: UP.sub,    bg: UP.sunken,   border: UP.hair,       label: '종결' },
}

// 카테고리 색상 — 무지개 대신 브랜드/그린/앰버/네이비 계열로 절제
const CATEGORY_COLOR: Record<string, string> = {
  '기타': UP.sub,
  '오류/버그': UP.danger,
  '서류발급': UP.strong,
  '계산오류': UP.amber,
  '사용방법': UP.brand,
}

export default function RecentActivity({ inquiries }: Props) {
  return (
    <div style={{
      background: UP.surface,
      border: `1px solid ${UP.hair}`,
      borderRadius: 12,
      padding: 'clamp(14px,3vw,22px)',
      boxShadow: '0 1px 2px rgba(16,24,40,0.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: UP.navy, margin: 0 }}>최근 문의 활동</p>
          <p style={{ fontSize: '0.7rem', color: UP.caption, marginTop: 2 }}>최근 8건</p>
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
          <p style={{ fontSize: '0.82rem', color: UP.sub }}>문의 없음</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {inquiries.slice(0, 8).map(inq => {
            const status = STATUS_META[inq.status] ?? STATUS_META.waiting
            const catColor = CATEGORY_COLOR[inq.category] ?? UP.sub
            return (
              <div key={inq.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                background: UP.sunken,
                border: `1px solid ${UP.hairSoft}`,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = UP.brandBg }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = UP.sunken }}
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
                    color: UP.body,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    margin: 0,
                  }}>
                    {inq.title ?? inq.content.slice(0, 50)}
                  </p>
                </div>

                <span style={{ fontSize: '0.68rem', color: UP.caption, flexShrink: 0, whiteSpace: 'nowrap' }}>
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
