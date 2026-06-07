// KPI 스트립 — 큰 숫자 4개 가로 배열 (캐치퀀트봇 패턴)
import AdminCard from './AdminCard'

export interface KpiItem {
  label: string
  value: string | number
  sub?: string
  color?: 'blue' | 'emerald' | 'rose' | 'slate' | 'amber'
  icon?: string
  trend?: number  // 양수=증가(emerald), 음수=감소(rose)
}

// 색상 토큰 매핑
const COLOR_MAP: Record<string, { value: string; bg: string; badge: string }> = {
  blue:    { value: '#3182f6', bg: '#eff6ff', badge: '#dbeafe' },
  emerald: { value: '#059669', bg: '#f0fdf4', badge: '#d1fae5' },
  rose:    { value: '#e11d48', bg: '#fff1f2', badge: '#ffe4e6' },
  slate:   { value: '#475569', bg: '#f8fafc', badge: '#f1f5f9' },
  amber:   { value: '#d97706', bg: '#fffbeb', badge: '#fef3c7' },
}

interface Props {
  items: KpiItem[]
}

export default function KpiStrip({ items }: Props) {
  return (
    <div style={{
      display: 'grid',
      // 반응형: 모바일 2열, 태블릿 이상 4열
      gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      gap: 12,
    }}>
      {items.map((item, i) => {
        const c = COLOR_MAP[item.color ?? 'blue']
        return (
          <AdminCard key={i} padding="16px 20px">
            {/* 라벨 — 소문자 uppercase 트래킹 */}
            <p style={{
              fontSize: '0.625rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#64748b',
              marginBottom: 8,
            }}>
              {item.icon && <span style={{ marginRight: 4 }}>{item.icon}</span>}
              {item.label}
            </p>

            {/* 큰 숫자 */}
            <p style={{
              fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
              fontWeight: 800,
              color: c.value,
              lineHeight: 1.1,
              marginBottom: 6,
            }}>
              {item.value}
            </p>

            {/* 트렌드 배지 + 부제목 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {item.trend !== undefined && item.trend !== 0 && (
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color: item.trend > 0 ? '#059669' : '#e11d48',
                  background: item.trend > 0 ? '#d1fae5' : '#ffe4e6',
                  padding: '2px 6px',
                  borderRadius: 6,
                }}>
                  {item.trend > 0 ? '↑' : '↓'} {Math.abs(item.trend)}%
                </span>
              )}
              {item.sub && (
                <p style={{
                  fontSize: '0.65rem',
                  color: '#94a3b8',
                  whiteSpace: 'nowrap',
                }}>
                  {item.sub}
                </p>
              )}
            </div>
          </AdminCard>
        )
      })}
    </div>
  )
}
