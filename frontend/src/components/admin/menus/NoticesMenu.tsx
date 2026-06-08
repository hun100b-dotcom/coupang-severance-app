// NoticesMenu.tsx — 관리자 공지사항 관리 메뉴
// - 공지 목록: 제목 + 본문 미리보기 분리 표시
// - 공지 추가/수정 모달: 제목(title) + 본문(content) 각각 입력
// - 활성/비활성 토글, 우선순위 설정, 삭제 기능 포함

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Notice } from '../../../types/supabase'

// 공지 작성/수정 폼 필드 타입
interface NoticeForm {
  title: string    // 배너에 표시될 짧은 제목
  content: string  // 상세 페이지에서 보이는 본문
  priority: number
  is_active: boolean
}

// 새 공지 작성 시 기본값
const defaultForm: NoticeForm = { title: '', content: '', priority: 0, is_active: true }

export default function NoticesMenu() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Notice | null>(null)
  const [form, setForm] = useState<NoticeForm>(defaultForm)
  const [saving, setSaving] = useState(false)

  // Supabase에서 공지사항 전체 목록 조회 (우선순위 내림차순)
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

  // 새 공지 추가 모달 열기
  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  // 기존 공지 수정 모달 열기 — 기존 값을 폼에 채워줌
  const openEdit = (n: Notice) => {
    setEditTarget(n)
    setForm({
      title: n.title ?? '',        // title 컬럼이 비어있을 경우 빈 문자열 처리
      content: n.content,
      priority: n.priority,
      is_active: n.is_active,
    })
    setModalOpen(true)
  }

  // 공지 저장 (추가 or 수정)
  const handleSave = async () => {
    // 제목 또는 본문 중 하나라도 비어있으면 저장 차단
    if (!supabase || !form.title.trim() || !form.content.trim()) return
    setSaving(true)
    if (editTarget) {
      // 기존 공지 수정
      await supabase.from('notices').update({
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      }).eq('id', editTarget.id)
    } else {
      // 새 공지 추가
      await supabase.from('notices').insert({
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        is_active: form.is_active,
      })
    }
    setSaving(false)
    setModalOpen(false)
    fetchNotices()
  }

  // 활성/비활성 토글
  const handleToggleActive = async (n: Notice) => {
    if (!supabase) return
    await supabase.from('notices')
      .update({ is_active: !n.is_active, updated_at: new Date().toISOString() })
      .eq('id', n.id)
    fetchNotices()
  }

  // 공지 삭제 (제목 앞 20자로 확인 팝업)
  const handleDelete = async (n: Notice) => {
    const preview = (n.title || n.content).slice(0, 20)
    if (!window.confirm(`"${preview}..." 공지를 삭제할까요?`)) return
    if (!supabase) return
    await supabase.from('notices').delete().eq('id', n.id)
    fetchNotices()
  }

  // ── 공통 셀 스타일 (어두운 테마) ──────────────────────────────────────────
  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: '1px solid #f1f5f9',
    fontSize: '0.83rem',
    color: '#334155',
    verticalAlign: 'middle',
  }

  const thStyle: React.CSSProperties = {
    ...cellStyle,
    color: '#64748b',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  }

  // ── 공통 인풋 스타일 ───────────────────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#0f172a',
    fontSize: '0.88rem',
    boxSizing: 'border-box',
    outline: 'none',
  }

  return (
    <div style={{ padding: 'clamp(16px, 4vw, 32px)' }}>
      {/* ── 헤더 영역 ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0 }}>📢 공지사항 관리</h2>
          <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '4px 0 0' }}>
            홈 화면 배너에 표시되는 공지를 관리합니다. 제목은 배너에, 본문은 상세 페이지에 표시됩니다.
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

      {/* ── 공지 목록 테이블 ─────────────────────────────────────────────────── */}
      {loading ? (
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>불러오는 중...</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={{ ...thStyle, width: 60 }}>우선순위</th>
                {/* 제목 + 본문 미리보기 분리 표시 */}
                <th style={thStyle}>제목</th>
                <th style={thStyle}>본문 미리보기</th>
                <th style={{ ...thStyle, width: 80 }}>활성</th>
                <th style={{ ...thStyle, width: 120 }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {notices.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...cellStyle, textAlign: 'center', color: '#94a3b8' }}>
                    공지사항이 없습니다.
                  </td>
                </tr>
              )}
              {notices.map(n => (
                <tr key={n.id} style={{ transition: 'background 0.15s' }}>
                  {/* 우선순위 */}
                  <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 700, color: '#3182f6' }}>
                    {n.priority}
                  </td>
                  {/* 제목 — 비어있으면 "(제목 없음)" 표시 */}
                  <td style={{ ...cellStyle, fontWeight: 600, color: '#0f172a' }}>
                    {n.title
                      ? (n.title.length > 24 ? n.title.slice(0, 24) + '…' : n.title)
                      : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(제목 없음)</span>
                    }
                  </td>
                  {/* 본문 미리보기 */}
                  <td style={cellStyle}>
                    {n.content.length > 40 ? n.content.slice(0, 40) + '…' : n.content}
                  </td>
                  {/* 활성/비활성 토글 버튼 */}
                  <td style={{ ...cellStyle, textAlign: 'center' }}>
                    <button
                      onClick={() => handleToggleActive(n)}
                      style={{
                        padding: '3px 10px',
                        borderRadius: 999,
                        border: 'none',
                        background: n.is_active ? 'rgba(49,200,100,0.18)' : '#f1f5f9',
                        color: n.is_active ? '#3fc878' : '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {n.is_active ? '활성' : '비활성'}
                    </button>
                  </td>
                  {/* 수정/삭제 버튼 */}
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
        </div>
      )}

      {/* ── 공지 추가/수정 모달 ──────────────────────────────────────────────── */}
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
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: 16,
              padding: 28,
              width: '100%',
              maxWidth: 480,
            }}
          >
            <h3 style={{ margin: '0 0 20px', fontSize: '1.05rem', fontWeight: 800 }}>
              {editTarget ? '공지 수정' : '새 공지 추가'}
            </h3>

            {/* ── 제목 입력 (배너에 표시되는 짧은 텍스트) ── */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                제목 <span style={{ color: 'rgba(255,100,100,0.7)' }}>*</span>
                <span style={{ color: '#94a3b8', marginLeft: 6 }}>홈 화면 배너에 표시됩니다</span>
              </span>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="예: 🎉 퇴직금 계산기 업데이트"
                maxLength={60}
                style={inputStyle}
              />
              {/* 글자 수 카운터 */}
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4, display: 'block', textAlign: 'right' }}>
                {form.title.length}/60
              </span>
            </label>

            {/* ── 본문 입력 (상세 페이지에서 표시) ── */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                본문 <span style={{ color: 'rgba(255,100,100,0.7)' }}>*</span>
                <span style={{ color: '#94a3b8', marginLeft: 6 }}>공지사항 상세 페이지에 표시됩니다</span>
              </span>
              <textarea
                value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                rows={4}
                placeholder="예: 새로운 기능이 추가되었어요! 이제 PDF 없이도 간편하게 퇴직금을 계산할 수 있습니다."
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </label>

            {/* ── 우선순위 + 활성 토글 ── */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <label style={{ flex: 1 }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  우선순위 (높을수록 먼저 표시)
                </span>
                <input
                  type="number"
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                  style={inputStyle}
                />
              </label>

              {/* 활성 토글 스위치 */}
              <label style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block', marginBottom: 6 }}>
                  활성
                </span>
                <div
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 999,
                    background: form.is_active ? '#3182f6' : '#e2e8f0',
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

            {/* ── 취소/저장 버튼 ── */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  padding: '9px 20px', borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: 'transparent',
                  color: '#475569',
                  fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                // 제목 또는 본문이 비어있으면 저장 불가
                disabled={saving || !form.title.trim() || !form.content.trim()}
                style={{
                  padding: '9px 20px', borderRadius: 10,
                  border: 'none',
                  background: (saving || !form.title.trim() || !form.content.trim())
                    ? 'rgba(49,130,246,0.3)'
                    : '#3182f6',
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
