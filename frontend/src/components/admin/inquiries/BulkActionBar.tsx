import { useState } from 'react'
import { bulkInquiryStatus } from '../../../lib/api'

interface Props {
  selectedIds: (string | number)[]
  onDone: () => void
}

const ACTIONS = [
  { label: '검토중으로', status: 'reviewing', color: '#3182f6' },
  { label: '답변완료로', status: 'answered',  color: '#00a876' },
  { label: '종결로',     status: 'closed',    color: '#64748b' },
]

export default function BulkActionBar({ selectedIds, onDone }: Props) {
  // 훅 규칙: 모든 훅은 조건부 return 보다 위에서 호출해야 한다
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  if (selectedIds.length === 0) return null

  const handle = async (status: string) => {
    setErr(''); setBusy(true)
    try {
      // 백엔드는 부분 실패 시 failed_ids 를 반환한다 (무음 은폐 방지)
      const res = await bulkInquiryStatus(selectedIds, status)
      const failedCount = (res?.failed_ids?.length as number | undefined) ?? 0
      if (failedCount > 0) {
        // 일부만 실패 → 선택을 유지한 채 에러 표시 (사용자가 재시도 가능)
        setErr(`${failedCount}건 변경 실패 (성공 ${selectedIds.length - failedCount}건). 다시 시도해주세요.`)
      } else {
        onDone()
      }
    } catch (e: unknown) {
      // 과거에는 // silent 로 실패를 삼켰다 → 이제 사용자에게 표시
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
      background: 'rgba(49,130,246,0.1)',
      borderRadius: 10,
      marginBottom: 12,
      border: '1px solid rgba(49,130,246,0.2)',
    }}>
      <span style={{ fontSize: '0.82rem', color: '#3182f6', fontWeight: 700 }}>
        {selectedIds.length}건 선택됨
      </span>
      <span style={{ marginLeft: 8, fontSize: '0.78rem', color: '#64748b' }}>일괄 변경:</span>
      {ACTIONS.map(a => (
        <button
          key={a.status}
          onClick={() => handle(a.status)}
          disabled={busy}
          style={{
            padding: '5px 12px',
            borderRadius: 999,
            border: 'none',
            background: `${a.color}20`,
            color: a.color,
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: busy ? 'not-allowed' : 'pointer',
            opacity: busy ? 0.5 : 1,
          }}
        >
          {a.label}
        </button>
      ))}
      {err && (
        <span style={{ marginLeft: 8, fontSize: '0.76rem', color: '#cc2233', fontWeight: 600 }}>
          ⚠️ {err}
        </span>
      )}
    </div>
  )
}
