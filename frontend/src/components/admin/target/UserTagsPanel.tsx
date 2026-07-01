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
      background: '#f1f5f9',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
      padding: 'clamp(12px,3vw,20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
        <p className="text-a13" style={{ fontWeight: 700, color: '#475569' }}>
          자동 태그 분포
        </p>
        <span className="text-a11" style={{ color: '#64748b' }}>
          태그 보유 유저 {usersWithTags}명
        </span>
      </div>
      {tags.length === 0 && (
        <p className="text-a13" style={{ color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
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
            <span className="text-a13" style={{ color: TAG_COLORS[t.tag] ?? '#6c5ce7', fontWeight: 700 }}>
              {t.tag}
            </span>
            <span className="text-a12" style={{
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
