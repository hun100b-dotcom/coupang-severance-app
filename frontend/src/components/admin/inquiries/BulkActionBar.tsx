import { useState } from 'react'
import { UP, badge } from '../shared/adminTheme'

interface Props {
  selectedIds: (string | number)[]
  // 부모가 '낙관적 일괄 변경 + 부분실패 원복 + 전체 롤백'을 수행한다.
  // 반환된 failedCount 로 부분 실패를 표시한다.
  onBulkStatus: (ids: (string | number)[], status: string) => Promise<{ failedCount: number }>
  onDone: () => void
}

// 일괄 변경 버튼 — 사용자앱 배지 톤과 정합(검토=amber, 답변완료=green, 종결=neutral)
const ACTIONS: { label: string; status: string; tone: 'amber' | 'green' | 'neutral' }[] = [
  { label: '검토중으로', status: 'reviewing', tone: 'amber'   },
  { label: '답변완료로', status: 'answered',  tone: 'green'   },
  { label: '종결로',     status: 'closed',    tone: 'neutral' },
]

export default function BulkActionBar({ selectedIds, onBulkStatus, onDone }: Props) {
  // 훅 규칙: 모든 훅은 조건부 return 보다 위에서 호출해야 한다
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (selectedIds.length === 0) return null

  const handle = async (status: string) => {
    setErr(''); setBusy(true)
    // 클릭 즉시 부모가 목록을 낙관적으로 바꿔 화면이 바로 반응한다.
    const count = selectedIds.length
    try {
      // 부모가 낙관적 반영 + persist + (부분실패/전체실패) 롤백까지 수행
      const { failedCount } = await onBulkStatus(selectedIds, status)
      if (failedCount > 0) {
        // 일부만 실패 → 선택 유지 + 에러 표시 (실패분은 부모가 이미 원복)
        setErr(`${failedCount}건 변경 실패 (성공 ${count - failedCount}건). 다시 시도해주세요.`)
      } else {
        onDone()
      }
    } catch (e: unknown) {
      // 전체 실패 → 부모가 전체 롤백 완료. 사용자에게 표시
      setErr(e instanceof Error ? e.message : '일괄 변경에 실패했습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '10px 16px',
      background: UP.brandBg,
      borderRadius: 10,
      marginBottom: 12,
      border: `1px solid ${UP.brandLine}`,
    }}>
      <span style={{ fontSize: '0.82rem', color: UP.strong, fontWeight: 700 }}>
        {selectedIds.length}건 선택됨
      </span>
      <span style={{ marginLeft: 8, fontSize: '0.78rem', color: UP.sub }}>일괄 변경:</span>
      {ACTIONS.map(a => (
        <button
          key={a.status}
          onClick={() => handle(a.status)}
          disabled={busy}
          style={{
            ...badge(a.tone),
            padding: '5px 12px',
            border: 'none',
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          {a.label}
        </button>
      ))}
      {err && (
        <span style={{ marginLeft: 8, fontSize: '0.76rem', color: UP.danger, fontWeight: 600 }}>
          ⚠️ {err}
        </span>
      )}
    </div>
  )
}
