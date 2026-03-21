import { useState } from 'react'
import type { AdminInquiry, InquiryTemplate } from '../../../types/admin'
import { patchInquiryAnswer, patchInquiryStatus } from '../../../lib/api'

interface Props {
  inquiry: AdminInquiry
  templates: InquiryTemplate[]
  onClose: () => void
  onUpdated: (updated: AdminInquiry) => void
}

function fmt(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const STATUSES = ['waiting', 'reviewing', 'answered', 'closed']
const STATUS_LABEL: Record<string, string> = {
  waiting: '대기중', reviewing: '검토중', answered: '답변완료', closed: '종결',
}

export default function InquiryDetailPanel({ inquiry, templates, onClose, onUpdated }: Props) {
  const [answer, setAnswer] = useState(inquiry.answer ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const handleSaveAnswer = async () => {
    if (!answer.trim()) { setErr('답변 내용을 입력하세요.'); return }
    setSaving(true); setErr('')
    try {
      await patchInquiryAnswer(inquiry.id, answer.trim())
      onUpdated({ ...inquiry, answer: answer.trim(), status: 'answered' })
    } catch {
      setErr('저장 실패. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (status: string) => {
    try {
      await patchInquiryStatus(inquiry.id, status)
      onUpdated({ ...inquiry, status })
    } catch {
      setErr('상태 변경 실패.')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0,
      width: 420,
      height: '100vh',
      background: 'rgba(16,16,26,0.98)',
      borderLeft: '1px solid rgba(255,255,255,0.1)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
    }}>
      {/* 헤더 */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>문의 상세</span>
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>{fmt(inquiry.created_at)}</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {/* 메타 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(49,130,246,0.15)', color: '#3182f6', padding: '2px 8px', borderRadius: 999 }}>
            {inquiry.category}
          </span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>
            UID: {inquiry.user_id.slice(0, 12)}…
          </span>
        </div>

        {/* 제목 */}
        {inquiry.title && (
          <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 10 }}>
            {inquiry.title}
          </p>
        )}

        {/* 본문 */}
        <div style={{
          background: 'rgba(0,0,0,0.25)',
          borderRadius: 10,
          padding: '14px',
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.75)',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          marginBottom: 16,
        }}>
          {inquiry.content}
        </div>

        {/* 상태 변경 */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>상태 변경</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                style={{
                  padding: '5px 12px',
                  borderRadius: 999,
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: inquiry.status === s ? '#3182f6' : 'rgba(255,255,255,0.08)',
                  color: inquiry.status === s ? '#fff' : 'rgba(255,255,255,0.5)',
                  transition: 'all 0.15s',
                }}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        {/* 템플릿 선택 */}
        {templates.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>답변 템플릿</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => setAnswer(t.content)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.6)',
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
            background: 'rgba(0,196,140,0.07)',
            border: '1px solid rgba(0,196,140,0.18)',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 12,
          }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#00a876', marginBottom: 6 }}>✓ 등록된 답변</p>
            <p style={{ fontSize: '0.83rem', color: 'rgba(255,255,255,0.75)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{inquiry.answer}</p>
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
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '12px',
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.85)',
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />
        {err && <p style={{ fontSize: '0.78rem', color: '#cc2233', marginTop: 6 }}>{err}</p>}
        <button
          onClick={handleSaveAnswer}
          disabled={saving}
          style={{
            marginTop: 10,
            width: '100%',
            padding: '12px',
            background: saving ? 'rgba(49,130,246,0.4)' : '#3182f6',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: '0.88rem',
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '저장 중...' : '답변 저장'}
        </button>
      </div>
    </div>
  )
}
