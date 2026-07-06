import { useState } from 'react'
import type { InquiryTemplate } from '../../../types/admin'
import { UP, RADIUS, btnPrimary, btnSecondary } from '../shared/adminTheme'
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
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return
    setSaving(true); setError(null)
    try {
      await createTemplate({ title: title.trim(), content: content.trim(), category })
      setTitle(''); setContent(''); setShowForm(false)
      onRefresh()
    } catch (e: unknown) {
      // 과거에는 catch 없이 finally만 있어 실패가 조용히 묻혔다 → 이제 표시
      setError(e instanceof Error ? e.message : '템플릿 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 템플릿을 삭제하시겠습니까?')) return
    setError(null)
    try {
      await deleteTemplate(id)
      onRefresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '템플릿 삭제에 실패했습니다.')
    }
  }

  return (
    <div style={{
      background: UP.sunken,
      border: `1px solid ${UP.hair}`,
      borderRadius: RADIUS.card,
      padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <p className="text-a14" style={{ fontWeight: 700, color: UP.body, flex: 1 }}>
          답변 템플릿 ({templates.length}개)
        </p>
        <button
          onClick={() => { setShowForm(f => !f); setError(null) }}
          className="text-a12" style={{ ...btnPrimary, padding: '5px 12px', }}
        >
          + 추가
        </button>
      </div>

      {/* 에러 표시 (생성/삭제 실패) */}
      {error && (
        <p className="text-a12" style={{ color: UP.danger, marginBottom: 10, fontWeight: 600 }}>
          ⚠️ {error}
        </p>
      )}

      {showForm && (
        <div style={{ marginBottom: 16, padding: 14, background: UP.sunken, border: `1px solid ${UP.hair}`, borderRadius: 10 }}>
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
            <button onClick={() => { setShowForm(false); setError(null) }} style={btnSecondaryStyle}>취소</button>
          </div>
        </div>
      )}

      {templates.length === 0 && !showForm && (
        <p className="text-a13" style={{ color: UP.sub, textAlign: 'center', padding: '16px 0' }}>
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
            background: UP.sunken,
            borderRadius: 8,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span className="text-a13" style={{ fontWeight: 700, color: UP.navy }}>{t.title}</span>
                <span className="text-a11" style={{
                  background: UP.brandBg,
                  color: UP.brand,
                  padding: '1px 7px',
                  borderRadius: 999,
                }}>
                  {t.category}
                </span>
                <span className="text-a11" style={{ color: UP.caption, marginLeft: 'auto' }}>
                  사용 {t.use_count}회
                </span>
              </div>
              <p className="text-a12" style={{ color: UP.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {t.content}
              </p>
            </div>
            <button onClick={() => handleDelete(t.id)} className="text-a13" style={{
              background: 'none', border: 'none', color: UP.danger,
              cursor: 'pointer', flexShrink: 0,
            }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: UP.sunken,
  border: `1px solid ${UP.hair}`,
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 13,
  color: UP.navy,
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
}

// 폼 저장/취소 버튼 — 헬퍼(btnPrimary/btnSecondary) 기반 + 폼 폭에 맞춘 작은 패딩
const btnPrimaryStyle: React.CSSProperties = {
  ...btnPrimary,
  padding: '7px 16px',
  fontSize: 13,
}

const btnSecondaryStyle: React.CSSProperties = {
  ...btnSecondary,
  padding: '7px 16px',
  fontSize: 13,
}
