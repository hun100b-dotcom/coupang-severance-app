import type { TagItem } from '../../../types/admin'

interface Props {
  tags: TagItem[]
  usersWithTags: number
}

const TAG_COLORS: Record<string, string> = {
  '퇴직금_적격자':    '#00c48c',
  '퇴직금_분쟁위험':  '#cc2233',
  '장기근속자':       '#3182f6',
  '퇴직금분쟁_관심자': '#f08c00',
}

export default function UserTagsPanel({ tags, usersWithTags }: Props) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.14)',
      borderRadius: 12,
      padding: 'clamp(12px,3vw,20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>
          자동 태그 분포
        </p>
        <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
          태그 보유 유저 {usersWithTags}명
        </span>
      </div>
      {tags.length === 0 && (
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '16px 0' }}>
          태그 데이터 없음
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tags.map(t => (
          <div key={t.tag} style={{
            background: `${TAG_COLORS[t.tag] ?? '#6c5ce7'}18`,
            border: `1px solid ${TAG_COLORS[t.tag] ?? '#6c5ce7'}40`,
            borderRadius: 10,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: '0.82rem', color: TAG_COLORS[t.tag] ?? '#6c5ce7', fontWeight: 700 }}>
              {t.tag}
            </span>
            <span style={{
              fontSize: '0.75rem',
              background: `${TAG_COLORS[t.tag] ?? '#6c5ce7'}30`,
              color: TAG_COLORS[t.tag] ?? '#6c5ce7',
              borderRadius: 999,
              padding: '1px 7px',
              fontWeight: 800,
            }}>
              {t.user_count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
