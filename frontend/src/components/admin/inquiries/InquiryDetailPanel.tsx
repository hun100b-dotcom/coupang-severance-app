import { useState } from 'react'
import type { AdminInquiry, InquiryTemplate } from '../../../types/admin'
import { UP, RADIUS, badge, btnPrimary } from '../shared/adminTheme'

interface Props {
  inquiry: AdminInquiry
  templates: InquiryTemplate[]
  onClose: () => void
  // 상태 변경/답변 저장은 부모가 '낙관적 업데이트(즉시 반영) + 실패 시 롤백'으로
  // 수행한다. 자식은 이 함수를 await 하기만 하면 되고, 실패(throw) 시 에러를 표시.
  onStatusChange: (id: string | number, status: string) => Promise<void>
  onSaveAnswer: (id: string | number, answer: string) => Promise<void>
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const STATUSES = ['waiting', 'reviewing', 'answered', 'closed']
const STATUS_LABEL: Record<string, string> = {
  waiting: '대기중', reviewing: '검토중', answered: '답변완료', closed: '종결',
}

export default function InquiryDetailPanel({ inquiry, templates, onClose, onStatusChange, onSaveAnswer }: Props) {
  const [answer, setAnswer] = useState(inquiry.answer ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  // 처리 중인 상태 버튼(중복 클릭 방지용). 화면 전환 자체는 부모 낙관적 갱신으로 즉각.
  const [busyStatus, setBusyStatus] = useState<string | null>(null)

  const handleSaveAnswer = async () => {
    if (!answer.trim()) { setErr('답변 내용을 입력하세요.'); return }
    setSaving(true); setErr('')
    try {
      // 부모가 즉시 UI 반영(낙관적) → 백그라운드 persist → 실패 시 롤백+throw
      await onSaveAnswer(inquiry.id, answer.trim())
    } catch {
      setErr('저장 실패. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    if (busyStatus) return // 다른 상태 변경 진행 중이면 무시
    setErr(''); setBusyStatus(status)
    try {
      // 클릭 즉시 하이라이트가 부모 낙관적 갱신으로 이동, persist 는 백그라운드
      await onStatusChange(inquiry.id, status)
    } catch {
      setErr('상태 변경 실패. 다시 시도해주세요.')
    } finally {
      setBusyStatus(null)
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0,
      width: 420,
      maxWidth: '100vw',   // 320px 등 좁은 화면에서 패널이 뷰포트를 넘지 않도록
      height: '100vh',
      background: UP.surface,
      borderLeft: `1px solid ${UP.hair}`,
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      boxShadow: '-8px 0 32px rgba(16,24,40,0.14)',
    }}>
      {/* 헤더 */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${UP.hairSoft}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: UP.sub, fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: UP.navy }}>문의 상세</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: UP.sub }}>{fmt(inquiry.created_at)}</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {/* 메타 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ ...badge('brand') }}>
            {inquiry.category}
          </span>
          <span style={{ fontSize: '0.72rem', color: UP.sub }}>
            {inquiry.user_email ?? `UID: ${String(inquiry.user_id).slice(0, 12)}…`}
          </span>
        </div>

        {/* 제목 */}
        {inquiry.title && (
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: UP.navy, marginBottom: 10 }}>
            {inquiry.title}
          </p>
        )}

        {/* 본문 */}
        <div style={{
          background: UP.sunken,
          borderRadius: 10,
          padding: '14px',
          fontSize: '0.85rem',
          color: UP.body,
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          marginBottom: 16,
        }}>
          {inquiry.content}
        </div>

        {/* 상태 변경 */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.75rem', color: UP.sub, marginBottom: 8 }}>상태 변경</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map(s => {
              const isBusy = busyStatus === s
              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={busyStatus !== null}
                  style={{
                    padding: '5px 12px',
                    borderRadius: RADIUS.pill,
                    border: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: busyStatus !== null ? 'wait' : 'pointer',
                    // 현재 상태=brand 채움, 비선택=neutral 톤(badge('neutral')과 정합)
                    background: inquiry.status === s ? UP.brand : UP.sunken,
                    color: inquiry.status === s ? '#fff' : UP.sub,
                    transition: 'all 0.15s',
                    // 진행 중 버튼만 살짝 흐리게 (스피너 대체). 화면 전환은 이미 즉각 반영됨
                    opacity: busyStatus !== null && !isBusy ? 0.6 : 1,
                  }}
                >
                  {STATUS_LABEL[s]}
                </button>
              )
            })}
          </div>
        </div>

        {/* 템플릿 선택 */}
        {templates.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: '0.75rem', color: UP.sub, marginBottom: 8 }}>답변 템플릿</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setAnswer(t.content)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: `1px solid ${UP.hair}`,
                    background: UP.sunken,
                    color: UP.body,
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                  }}
                >
                  {t.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 기존 답변 */}
        {inquiry.answer && (
          <div style={{
            background: UP.greenBg,
            border: `1px solid ${UP.greenLine}`,
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 12,
          }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: UP.green, marginBottom: 6 }}>✓ 등록된 답변</p>
            <p style={{ fontSize: '0.83rem', color: UP.body, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{inquiry.answer}</p>
          </div>
        )}

        {/* 답변 작성 */}
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="답변 내용을 입력하세요..."
          rows={5}
          style={{
            width: '100%',
            background: UP.sunken,
            border: `1px solid ${UP.hair}`,
            borderRadius: 10,
            padding: '12px',
            fontSize: '0.85rem',
            color: UP.navy,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />
        {err && <p style={{ fontSize: '0.78rem', color: UP.danger, marginTop: 6 }}>{err}</p>}
        <button
          onClick={handleSaveAnswer}
          disabled={saving}
          style={{
            ...btnPrimary,
            marginTop: 10,
            width: '100%',
            padding: '12px',
            // 저장 중에는 옅은 블루로 비활성 표시 (기존 UX 보존)
            background: saving ? UP.brandLine : UP.brand,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '저장 중...' : '답변 저장'}
        </button>
      </div>
    </div>
  )
}
