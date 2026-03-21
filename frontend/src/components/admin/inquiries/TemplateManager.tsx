import { useState } from 'react'
import type { InquiryTemplate } from '../../../types/admin'
import { createTemplate, deleteTemplate } from '../../../lib/api'

interface Props {
  templates: InquiryTemplate[]
  onRefresh: () => void
}

const CATEGORIES = ['퇴직금/실업급여', '서류발급', '오류/버그', '기타']

export default function TemplateManager({ templates, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true)
    try {
      await createTemplate({ title: title.trim(), content: content.trim(), category })
      setTitle(''); setContent(''); setShowForm(false)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 템플릿을 삭제하시겠습니까?')) return
    await deleteTemplate(id)
    onRefresh()
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 14,
      padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', flex: 1 }}>
          답변 템플릿 ({templates.length}개)
        </p>
        <button
          onClick={() => setShowForm(f => !f)}
          style={{
            padding: '5px 12px',
            borderRadius: 8,
            border: 'none',
            background: '#3182f6',
            color: '#fff',
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          + 추가
        </button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 16, padding: 14, background: 'rgba(0,0,0,0.2)', borderRadius: 10 }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="템플릿 제목"
            style={inputStyle}
          />
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ ...inputStyle, marginTop: 8 }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="템플릿 내용..."
            rows={4}
            style={{ ...inputStyle, marginTop: 8, resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={handleCreate} disabled={saving} style={btnPrimaryStyle}>
              {saving ? '저장 중...' : '저장'}
            </button>
            <button onClick={() => setShowForm(false)} style={btnSecondaryStyle}>취소</button>
          </div>
        </div>
      )}

      {templates.length === 0 && !showForm && (
        <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '16px 0' }}>
          등록된 템플릿이 없습니다.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {templates.map(t => (
          <div key={t.id} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '10px 12px',
            background: 'rgba(0,0,0,0.15)',
            borderRadius: 8,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{t.title}</span>
                <span style={{
                  fontSize: '0.68rem',
                  background: 'rgba(49,130,246,0.15)',
                  color: '#3182f6',
                  padding: '1px 7px',
                  borderRadius: 999,
                }}>
                  {t.category}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                  사용 {t.use_count}회
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.content}
              </p>
            </div>
            <button onClick={() => handleDelete(t.id)} style={{
              background: 'none', border: 'none', color: 'rgba(240,68,82,0.6)',
              cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0,
            }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: '0.85rem',
  color: 'rgba(255,255,255,0.85)',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

const btnPrimaryStyle: React.CSSProperties = {
  padding: '7px 16px',
  borderRadius: 8,
  border: 'none',
  background: '#3182f6',
  color: '#fff',
  fontSize: '0.82rem',
  fontWeight: 700,
  cursor: 'pointer',
}

const btnSecondaryStyle: React.CSSProperties = {
  padding: '7px 16px',
  borderRadius: 8,
  border: 'none',
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.5)',
  fontSize: '0.82rem',
  fontWeight: 700,
  cursor: 'pointer',
}
