import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Notice } from '../../../types/supabase'

interface NoticeForm {
  content: string
  priority: number
  is_active: boolean
}

const defaultForm: NoticeForm = { content: '', priority: 0, is_active: true }

export default function NoticesMenu() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Notice | null>(null)
  const [form, setForm] = useState<NoticeForm>(defaultForm)
  const [saving, setSaving] = useState(false)

  const fetchNotices = async () => {
    if (!supabase) return
    setLoading(true)
    const { data } = await supabase
      .from('notices')
      .select('*')
      .order('priority', { ascending: false })
    setNotices(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchNotices() }, [])

  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  const openEdit = (n: Notice) => {
    setEditTarget(n)
    setForm({ content: n.content, priority: n.priority, is_active: n.is_active })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!supabase || !form.content.trim()) return
    setSaving(true)
    if (editTarget) {
      await supabase.from('notices').update({
        content: form.content,
        priority: form.priority,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }).eq('id', editTarget.id)
    } else {
      await supabase.from('notices').insert({
        content: form.content,
        priority: form.priority,
        is_active: form.is_active,
      })
    }
    setSaving(false)
    setModalOpen(false)
    fetchNotices()
  }

  const handleToggleActive = async (n: Notice) => {
    if (!supabase) return
    await supabase.from('notices')
      .update({ is_active: !n.is_active, updated_at: new Date().toISOString() })
      .eq('id', n.id)
    fetchNotices()
  }

  const handleDelete = async (n: Notice) => {
    if (!window.confirm(`"${n.content.slice(0, 30)}..." 공지를 삭제할까요?`)) return
    if (!supabase) return
    await supabase.from('notices').delete().eq('id', n.id)
    fetchNotices()
  }

  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    fontSize: '0.83rem',
    color: 'rgba(255,255,255,0.75)',
    verticalAlign: 'middle',
  }

  const thStyle: React.CSSProperties = {
    ...cellStyle,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>📢 공지사항 관리</h2>
          <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
            홈 화면 상단에 표시되는 공지를 관리합니다.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding: '8px 18px',
            borderRadius: 10,
            border: 'none',
            background: '#3182f6',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          + 새 공지 추가
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>불러오는 중...</p>
      ) : (
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                <th style={{ ...thStyle, width: 60 }}>우선순위</th>
                <th style={thStyle}>내용</th>
                <th style={{ ...thStyle, width: 80 }}>활성</th>
                <th style={{ ...thStyle, width: 120 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {notices.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ ...cellStyle, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                    공지사항이 없습니다.
                  </td>
                </tr>
              )}
              {notices.map(n => (
                <tr key={n.id} style={{ transition: 'background 0.15s' }}>
                  <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 700, color: '#3182f6' }}>
                    {n.priority}
                  </td>
                  <td style={cellStyle}>
                    {n.content.length > 40 ? n.content.slice(0, 40) + '…' : n.content}
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleActive(n)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        border: 'none',
                        background: n.is_active ? 'rgba(49,200,100,0.18)' : 'rgba(255,255,255,0.08)',
                        color: n.is_active ? '#3fc878' : 'rgba(255,255,255,0.35)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {n.is_active ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    <button
                      onClick={() => openEdit(n)}
                      style={{
                        marginRight: 6,
                        padding: '3px 10px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'rgba(49,130,246,0.15)',
                        color: '#3182f6',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(n)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 8,
                        border: 'none',
                        background: 'rgba(240,68,82,0.12)',
                        color: '#f04452',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 모달 */}
      {modalOpen && (
        <div
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 200,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#16162a',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16,
              padding: 28,
              width: '100%',
              maxWidth: 480,
            }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 800 }}>
              {editTarget ? '공지 수정' : '새 공지 추가'}
            </h3>

            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 6 }}>
                내용
              </span>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={4}
                placeholder="예: 🎉 새로운 기능이 추가되었어요! 퇴직금 계산기를 이용해보세요."
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.05)',
                  color: '#fff',
                  fontSize: '0.88rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </label>

            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 6 }}>
                  우선순위 (높을수록 먼저 표시)
                </span>
                <input
                  type="number"
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontSize: '0.88rem',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: 6 }}>
                  활성
                </span>
                <div
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 999,
                    background: form.is_active ? '#3182f6' : 'rgba(255,255,255,0.12)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background 0.2s',
                    padding: '3px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: 3,
                    left: form.is_active ? 21 : 3,
                    transition: 'left 0.2s',
                  }} />
                </div>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  padding: '9px 20px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'transparent',
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.content.trim()}
                style={{
                  padding: '9px 20px', borderRadius: 10,
                  border: 'none',
                  background: saving || !form.content.trim() ? 'rgba(49,130,246,0.3)' : '#3182f6',
                  color: '#fff',
                  fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
