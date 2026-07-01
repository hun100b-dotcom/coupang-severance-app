import type { AdminInquiry } from '../../../types/admin'
import { UP, badge } from '../shared/adminTheme'

interface Props {
  inquiries: AdminInquiry[]
  // 선택 집합은 String 으로 정규화된 id 를 담는다 (부모와 동일 규칙)
  selected: Set<string>
  onToggle: (id: string | number) => void
  onToggleAll: () => void
  onSelect: (inq: AdminInquiry) => void
  activeId?: string | number
}

// 상태 → 배지 톤 매핑 (사용자앱 ui<Badge> 톤과 정합)
//   대기→amber, 검토→brand, 답변완료→green, 종결→neutral
const STATUS_TONE: Record<string, 'brand' | 'green' | 'neutral' | 'amber'> = {
  waiting:   'amber',
  reviewing: 'brand',
  answered:  'green',
  closed:    'neutral',
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
  const allSelected = inquiries.length > 0 && inquiries.every(i => selected.has(String(i.id)))

  return (
    <div style={{ overflow: 'auto' }}>
      <table className="text-a13" style={{ width: '100%', borderCollapse: 'collapse', }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${UP.hairSoft}` }}>
            <th style={{ padding: 0, textAlign: 'left', width: 44 }}>
              {/* 전체선택: 본문 셀과 동일하게 label 로 44x44 히트영역 확보 */}
              <label style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 44, minHeight: 44, cursor: 'pointer', boxSizing: 'border-box',
              }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  style={{ cursor: 'pointer', width: 16, height: 16 }}
                />
              </label>
            </th>
            <th style={{ padding: '10px 8px', textAlign: 'left', color: UP.sub, fontWeight: 600 }}>상태</th>
            <th style={{ padding: '10px 8px', textAlign: 'left', color: UP.sub, fontWeight: 600 }}>카테고리</th>
            <th style={{ padding: '10px 8px', textAlign: 'left', color: UP.sub, fontWeight: 600 }}>내용</th>
            <th style={{ padding: '10px 8px', textAlign: 'left', color: UP.sub, fontWeight: 600, whiteSpace: 'nowrap' }}>접수일시</th>
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
                  borderBottom: `1px solid ${UP.hairSoft}`,
                  background: isActive ? UP.brandBg : 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                }}
              >
                {/*
                  버그 수정: 과거에는 <td>의 onClick 과 <input>의 onChange 가
                  '둘 다' onToggle 을 호출해서, 체크박스를 정확히 누르면 2번 토글되어
                  (= 제자리) 아무 변화가 없었다. 그래서 체크박스 옆 빈칸(우측)을
                  눌러야만 1번 토글되는 것처럼 보였다.
                  → 이제 <label> 하나가 유일한 토글 경로다. label 을 누르면 내부
                    input 으로 단 1번만 전달되고, onClick 에서는 stopPropagation 으로
                    행(row) 선택만 막는다(토글하지 않는다). 44x44 터치 타깃 확보.
                */}
                <td style={{ padding: 0 }}>
                  <label
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: 44,
                      minHeight: 44,
                      cursor: 'pointer',
                      boxSizing: 'border-box',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(String(inq.id))}
                      onChange={() => onToggle(inq.id)}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </label>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{
                    ...badge(STATUS_TONE[inq.status] ?? 'neutral'),
                    whiteSpace: 'nowrap',
                  }}>
                    {STATUS_LABEL[inq.status] ?? inq.status}
                  </span>
                </td>
                <td style={{ padding: '10px 8px', color: UP.sub, whiteSpace: 'nowrap' }}>
                  {inq.category}
                </td>
                <td style={{
                  padding: '10px 8px',
                  color: UP.navy,
                  maxWidth: 300,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {inq.title ?? inq.content.slice(0, 60)}
                </td>
                <td style={{ padding: '10px 8px', color: UP.sub, whiteSpace: 'nowrap' }}>
                  {fmt(inq.created_at)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {inquiries.length === 0 && (
        <p className="text-a13" style={{ textAlign: 'center', color: UP.sub, padding: '32px 0', }}>
          문의가 없습니다.
        </p>
      )}
    </div>
  )
}
