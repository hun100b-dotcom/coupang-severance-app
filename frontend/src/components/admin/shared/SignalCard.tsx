// 신호등 카드 — 🟢/🟡/🔴 + 메인 값 + 부제목 (캐치퀀트봇 패턴)
import AdminCard from './AdminCard'

export type SignalStatus = 'green' | 'yellow' | 'red'

const SIGNAL_MAP: Record<SignalStatus, { emoji: string; label: string; bg: string; border: string; text: string }> = {
  green:  { emoji: '🟢', label: '정상',    bg: '#f0fdf4', border: '#bbf7d0', text: '#059669' },
  yellow: { emoji: '🟡', label: '주의',    bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
  red:    { emoji: '🔴', label: '이상',    bg: '#fff1f2', border: '#fecdd3', text: '#e11d48' },
}

interface Props {
  status: SignalStatus
  title: string           // 카드 제목 (예: "오늘 운영 상태")
  mainValue: string       // 큰 숫자 또는 핵심 값 (예: "128명")
  mainLabel?: string      // 메인 값 아래 소제목 (예: "오늘 방문자")
  reason?: string         // 신호등 사유 한 줄 (예: "모든 서비스 정상")
  icon?: string
}

export default function SignalCard({ status, title, mainValue, mainLabel, reason, icon }: Props) {
  const s = SIGNAL_MAP[status]

  return (
    <AdminCard style={{ background: s.bg, borderColor: s.border }}>
      {/* 헤더: 제목 + 신호등 뱃지 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span style={{ fontSize: '1.1rem' }}>{icon}</span>}
          <p style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: '#475569',
          }}>
            {title}
          </p>
        </div>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: '0.65rem', fontWeight: 700,
          color: s.text,
          background: '#fff',
          border: `1px solid ${s.border}`,
          padding: '3px 8px',
          borderRadius: 999,
        }}>
          {s.emoji} {s.label}
        </span>
      </div>

      {/* 메인 큰 숫자 */}
      <p style={{
        fontSize: 'clamp(1.6rem, 4vw, 2.2rem)',
        fontWeight: 800,
        color: s.text,
        lineHeight: 1.1,
        marginBottom: 4,
      }}>
        {mainValue}
      </p>

      {/* 메인 라벨 */}
      {mainLabel && (
        <p style={{
          fontSize: '0.7rem',
          color: '#64748b',
          marginBottom: 8,
        }}>
          {mainLabel}
        </p>
      )}

      {/* 사유 한 줄 */}
      {reason && (
        <p style={{
          fontSize: '0.68rem',
          color: s.text,
          fontWeight: 500,
          padding: '6px 10px',
          background: '#fff',
          borderRadius: 8,
          border: `1px solid ${s.border}`,
        }}>
          {reason}
        </p>
      )}
    </AdminCard>
  )
}
