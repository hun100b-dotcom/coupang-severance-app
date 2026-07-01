import type { TagItem } from '../../../types/admin'
import { UP } from '../shared/adminTheme'

interface Props {
  tags: TagItem[]
  usersWithTags: number
}

// (P5) 시맨틱 태그색 → 규정 팔레트 토큰(적격=그린/위험=레드/근속=브랜드/관심=앰버)
const TAG_COLORS: Record<string, string> = {
  '퇴직금_적격자':    UP.greenChart,
  '퇴직금_분쟁위험':  UP.dangerChart,
  '장기근속자':       UP.brand,
  '퇴직금분쟁_관심자': UP.amberChart,
}
// 미정의 태그 폴백 — 무지개(purple) 대신 중립 회색
const TAG_FALLBACK = UP.sub

export default function UserTagsPanel({ tags, usersWithTags }: Props) {
  return (
    <div style={{
      background: UP.sunken,
      border: `1px solid ${UP.hair}`,
      borderRadius: 16,
      padding: 'clamp(12px,3vw,20px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
        <p className="text-a13" style={{ fontWeight: 700, color: UP.sub }}>
          자동 태그 분포
        </p>
        <span className="text-a11" style={{ color: UP.sub }}>
          태그 보유 유저 {usersWithTags}명
        </span>
      </div>
      {tags.length === 0 && (
        <p className="text-a13" style={{ color: UP.caption, textAlign: 'center', padding: '16px 0' }}>
          태그 데이터 없음
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {tags.map(t => {
          const color = TAG_COLORS[t.tag] ?? TAG_FALLBACK  // 태그별 시맨틱색(미정의는 중립 회색)
          return (
          <div key={t.tag} style={{
            background: `${color}18`,
            border: `1px solid ${color}40`,
            borderRadius: 10,
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span className="text-a13" style={{ color, fontWeight: 700 }}>
              {t.tag}
            </span>
            <span className="text-a12" style={{
              background: `${color}30`,
              color,
              borderRadius: 999,
              padding: '1px 7px',
              fontWeight: 800,
            }}>
              {t.user_count}
            </span>
          </div>
          )
        })}
      </div>
    </div>
  )
}
