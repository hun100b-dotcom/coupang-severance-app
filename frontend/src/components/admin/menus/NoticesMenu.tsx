// NoticesMenu.tsx — 관리자 공지사항 관리 메뉴
// - 공지 목록: 제목 + 본문 미리보기 분리 표시
// - 공지 추가/수정 모달: 제목(title) + 본문(content) 각각 입력
// - 활성/비활성 토글, 우선순위 설정, 삭제 기능 포함

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { Notice } from '../../../types/supabase'
import { UP, RADIUS, btnPrimary, btnSecondary, badge } from '../shared/adminTheme'

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
  const [error, setError] = useState<string | null>(null)

  // Supabase에서 공지사항 전체 목록 조회 (우선순위 내림차순)
  const fetchNotices = async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error } = await supabase
      .from('notices')
      .select('*')
      .order('priority', { ascending: false })
    if (error) setError(error.message)
    setNotices(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchNotices() }, [])

  // 새 공지 추가 모달 열기
  const openCreate = () => {
    setEditTarget(null)
    setForm(defaultForm)
    setError(null)
    setModalOpen(true)
  }

  // 기존 공지 수정 모달 열기 — 기존 값을 폼에 채워줌
  const openEdit = (n: Notice) => {
    setEditTarget(n)
    setError(null)
    setForm({
      title: n.title ?? '',        // title 컬럼이 비어있을 경우 빈 문자열 처리
      content: n.content,
      priority: n.priority,
      is_active: n.is_active,
    })
    setModalOpen(true)
  }

  // 모달 닫기 (취소/오버레이) — 닫을 때 에러도 함께 비워 유령 배너 방지
  const closeModal = () => { setModalOpen(false); setError(null) }

  // 공지 저장 (추가 or 수정)
  // ★ .select() 필수: update/delete 는 RLS USING 으로 권한 없는 행이 "안 보임"
  //   처리되어 error=null + 0행으로 조용히 통과(거짓 성공)한다. insert 는 WITH CHECK
  //   위반 시 error 를 던지므로 throw 로 잡힌다. 두 경우 모두 사용자에게 표시.
  const handleSave = async () => {
    // 제목 또는 본문 중 하나라도 비어있으면 저장 차단
    if (!supabase || !form.title.trim() || !form.content.trim()) return
    setSaving(true); setError(null)
    try {
      if (editTarget) {
        // 기존 공지 수정
        const { data, error } = await supabase.from('notices').update({
          title: form.title.trim(),
          content: form.content.trim(),
          priority: form.priority,
          is_active: form.is_active,
          updated_at: new Date().toISOString(),
        }).eq('id', editTarget.id).select('id')
        if (error) throw error
        if (!data || data.length === 0) throw new Error('변경된 행이 없습니다 — 관리자 권한(RLS)을 확인하세요.')
      } else {
        // 새 공지 추가
        const { data, error } = await supabase.from('notices').insert({
          title: form.title.trim(),
          content: form.content.trim(),
          priority: form.priority,
          is_active: form.is_active,
        }).select('id')
        if (error) throw error
        if (!data || data.length === 0) throw new Error('추가된 행이 없습니다 — 관리자 권한(RLS)을 확인하세요.')
      }
      setModalOpen(false)
      fetchNotices()
    } catch (e: unknown) {
      // 실패 시 모달을 닫지 않고 에러를 표시 → 입력 내용 보존
      setError(e instanceof Error ? e.message : '공지 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 활성/비활성 토글
  const handleToggleActive = async (n: Notice) => {
    if (!supabase) return
    setError(null)
    const { data, error } = await supabase.from('notices')
      .update({ is_active: !n.is_active, updated_at: new Date().toISOString() })
      .eq('id', n.id).select('id')
    if (error || !data || data.length === 0) {
      setError(error?.message ?? '상태 변경 실패 — 관리자 권한(RLS)을 확인하세요.')
      fetchNotices()  // 화면을 DB 진실과 재동기화 (옛 상태 잔류 방지)
      return
    }
    fetchNotices()
  }

  // 공지 삭제 (제목 앞 20자로 확인 팝업)
  const handleDelete = async (n: Notice) => {
    const preview = (n.title || n.content).slice(0, 20)
    if (!window.confirm(`"${preview}..." 공지를 삭제할까요?`)) return
    if (!supabase) return
    setError(null)
    const { data, error } = await supabase.from('notices').delete().eq('id', n.id).select('id')
    if (error || !data || data.length === 0) {
      setError(error?.message ?? '삭제 실패 — 관리자 권한(RLS)을 확인하세요.')
      fetchNotices()  // 화면을 DB 진실과 재동기화
      return
    }
    fetchNotices()
  }

  // ── 공통 셀 스타일 (어두운 테마) ──────────────────────────────────────────
  const cellStyle: React.CSSProperties = {
    padding: '10px 12px',
    borderBottom: `1px solid ${UP.hairSoft}`,
    fontSize: '0.83rem',
    color: UP.body,
    verticalAlign: 'middle',
  }

  const thStyle: React.CSSProperties = {
    ...cellStyle,
    color: UP.sub,
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
    border: `1px solid ${UP.hair}`,
    background: UP.sunken,
    color: UP.navy,
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
          <p style={{ fontSize: '0.8rem', color: UP.sub, margin: '4px 0 0' }}>
            홈 화면 배너에 표시되는 공지를 관리합니다. 제목은 배너에, 본문은 상세 페이지에 표시됩니다.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{ ...btnPrimary }}
        >
          + 새 공지 추가
        </button>
      </div>

      {/* ── 에러 배너 (목록/저장/토글/삭제 실패) ──────────────────────────────── */}
      {error && (
        <div style={{
          background: UP.dangerBg, border: `1px solid ${UP.dangerLine}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16,
          color: UP.danger, fontSize: '0.82rem', fontWeight: 600,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── 공지 목록 테이블 ─────────────────────────────────────────────────── */}
      {loading ? (
        <p style={{ color: UP.sub, fontSize: '0.85rem' }}>불러오는 중...</p>
      ) : (
        <div style={{ background: '#fff', borderRadius: RADIUS.card, overflow: 'hidden', border: `1px solid ${UP.hair}` }}>
          <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
            <thead>
              <tr style={{ background: UP.sunken }}>
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
                  <td colSpan={5} style={{ ...cellStyle, textAlign: 'center', color: UP.sub }}>
                    공지사항이 없습니다.
                  </td>
                </tr>
              )}
              {notices.map(n => (
                <tr key={n.id} style={{ transition: 'background 0.15s' }}>
                  {/* 우선순위 */}
                  <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 700, color: UP.strong }}>
                    {n.priority}
                  </td>
                  {/* 제목 — 비어있으면 "(제목 없음)" 표시 */}
                  <td style={{ ...cellStyle, fontWeight: 600, color: UP.navy }}>
                    {n.title
                      ? (n.title.length > 24 ? n.title.slice(0, 24) + '…' : n.title)
                      : <span style={{ color: UP.caption, fontStyle: 'italic' }}>(제목 없음)</span>
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
                        ...badge(n.is_active ? 'green' : 'neutral'),
                        border: 'none',
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
                        ...badge('brand'),
                        marginRight: 6,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      수정
                    </button>
                    <button
                      onClick={() => handleDelete(n)}
                      style={{
                        ...badge('danger'),
                        border: 'none',
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
          onClick={closeModal}
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
              border: `1px solid ${UP.hair}`,
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
              <span style={{ fontSize: '0.78rem', color: UP.sub, display: 'block', marginBottom: 6 }}>
                제목 <span style={{ color: UP.danger }}>*</span>
                <span style={{ color: UP.caption, marginLeft: 6 }}>홈 화면 배너에 표시됩니다</span>
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
              <span style={{ fontSize: '0.7rem', color: UP.caption, marginTop: 4, display: 'block', textAlign: 'right' }}>
                {form.title.length}/60
              </span>
            </label>

            {/* ── 본문 입력 (상세 페이지에서 표시) ── */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span style={{ fontSize: '0.78rem', color: UP.sub, display: 'block', marginBottom: 6 }}>
                본문 <span style={{ color: UP.danger }}>*</span>
                <span style={{ color: UP.caption, marginLeft: 6 }}>공지사항 상세 페이지에 표시됩니다</span>
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
                <span style={{ fontSize: '0.78rem', color: UP.sub, display: 'block', marginBottom: 6 }}>
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
                <span style={{ fontSize: '0.78rem', color: UP.sub, display: 'block', marginBottom: 6 }}>
                  활성
                </span>
                <div
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 999,
                    background: form.is_active ? UP.brand : UP.hair,
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

            {/* 저장 실패 에러 (모달 내부 — 오버레이가 상단 배너를 가리므로) */}
            {error && (
              <p style={{ fontSize: '0.78rem', color: UP.danger, marginBottom: 12, fontWeight: 600 }}>
                ⚠️ {error}
              </p>
            )}

            {/* ── 취소/저장 버튼 ── */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                style={{ ...btnSecondary }}
              >
                취소
              </button>
              <button
                onClick={handleSave}
                // 제목 또는 본문이 비어있으면 저장 불가
                disabled={saving || !form.title.trim() || !form.content.trim()}
                style={{
                  ...btnPrimary,
                  // 비활성 시 배경을 옅은 블루로 (기존 거짓성공 방지 UX 보존)
                  background: (saving || !form.title.trim() || !form.content.trim())
                    ? UP.brandLine
                    : UP.brand,
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
