// NoticesMenu.tsx — 관리자 공지사항 관리 메뉴
// - 공지 목록: 제목 + 본문 미리보기 분리 표시
// - 공지 추가/수정 모달: 제목(title) + 본문(content) 각각 입력
// - 활성/비활성 토글, 우선순위 설정, 삭제 기능 포함

import { useEffect, useState } from 'react'
import { getAdminNotices, createNotice, updateNotice, deleteNotice } from '../../../lib/api'
import type { Notice } from '../../../types/supabase'
import { DS } from '../ds/adminDS'
import { PageHead, Panel, Table, Th, Td, DSButton, Badge, StateLoading } from '../ds/DSKit'

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

  // 공지 전체 목록 조회 — 백엔드 경로(service-role, 비활성 공지 포함, 우선순위 내림차순)
  const fetchNotices = async () => {
    setLoading(true)
    try {
      const rows = await getAdminNotices()
      setNotices(rows)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '공지 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
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

  // 공지 저장 (추가 or 수정) — 백엔드 경로(service-role). 실패 시 HTTP 에러를 throw 하므로
  //   catch 로 잡아 사용자에게 표시(과거 RLS 무음 거짓성공 문제 해소). 존재하지 않는 id 는 404.
  const handleSave = async () => {
    // 제목 또는 본문 중 하나라도 비어있으면 저장 차단
    if (!form.title.trim() || !form.content.trim()) return
    setSaving(true); setError(null)
    try {
      if (editTarget) {
        await updateNotice(editTarget.id, {
          title: form.title.trim(),
          content: form.content.trim(),
          priority: form.priority,
          is_active: form.is_active,
        })
      } else {
        await createNotice({
          title: form.title.trim(),
          content: form.content.trim(),
          priority: form.priority,
          is_active: form.is_active,
        })
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

  // 활성/비활성 토글 — is_active 만 부분 수정
  const handleToggleActive = async (n: Notice) => {
    setError(null)
    try {
      await updateNotice(n.id, { is_active: !n.is_active })
      fetchNotices()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '상태 변경에 실패했습니다.')
      fetchNotices()  // 화면을 DB 진실과 재동기화 (옛 상태 잔류 방지)
    }
  }

  // 공지 삭제 (제목 앞 20자로 확인 팝업)
  const handleDelete = async (n: Notice) => {
    const preview = (n.title || n.content).slice(0, 20)
    if (!window.confirm(`"${preview}..." 공지를 삭제할까요?`)) return
    setError(null)
    try {
      await deleteNotice(n.id)
      fetchNotices()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '삭제에 실패했습니다.')
      fetchNotices()  // 화면을 DB 진실과 재동기화
    }
  }

  // ── 공통 셀 스타일 (어두운 테마) ──────────────────────────────────────────
  // ── 공통 인풋 스타일(DS) ──
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 10,
    border: `1px solid ${DS.line}`, background: DS.panel, color: DS.ink,
    fontSize: '0.88rem', boxSizing: 'border-box', outline: 'none',
  }

  return (
    <div style={{ padding: 'clamp(16px, 3vw, 32px)', maxWidth: 1440, margin: '0 auto' }}>
      {/* 헤더 */}
      <PageHead
        icon="📢"
        title="공지사항 관리"
        subtitle="홈 배너에 노출되는 공지 — 제목은 배너에, 본문은 상세에 표시됩니다."
        actions={<DSButton variant="primary" onClick={openCreate}>+ 새 공지 추가</DSButton>}
      />

      {/* 에러 배너 */}
      {error && (
        <div className="text-a13" style={{
          background: DS.badSoft, border: `1px solid ${DS.badLine}`,
          borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: DS.bad, fontWeight: 700,
        }}>⚠️ {error}</div>
      )}

      {/* 공지 목록 */}
      {loading ? (
        <Panel><StateLoading label="공지를 불러오는 중이에요…" /></Panel>
      ) : (
        <Panel>
          <Table minWidth={520}>
            <thead>
              <tr>
                <Th align="center" style={{ width: 64 }}>우선순위</Th>
                <Th>제목</Th>
                <Th>본문 미리보기</Th>
                <Th align="center" style={{ width: 84 }}>활성</Th>
                <Th align="center" style={{ width: 130 }}>관리</Th>
              </tr>
            </thead>
            <tbody>
              {notices.length === 0 && (
                <tr><Td colSpan={5} align="center" style={{ color: DS.sub, padding: '36px 12px' }}>공지사항이 없습니다.</Td></tr>
              )}
              {notices.map(n => (
                <tr key={n.id}>
                  <Td align="center" num style={{ fontWeight: 800, color: DS.accentStrong }}>{n.priority}</Td>
                  <Td style={{ fontWeight: 700, color: DS.ink }}>
                    {n.title ? (n.title.length > 24 ? n.title.slice(0, 24) + '…' : n.title)
                      : <span style={{ color: DS.faint, fontStyle: 'italic' }}>(제목 없음)</span>}
                  </Td>
                  <Td style={{ color: DS.sub }}>{n.content.length > 40 ? n.content.slice(0, 40) + '…' : n.content}</Td>
                  <Td align="center">
                    <button onClick={() => handleToggleActive(n)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                      <Badge tone={n.is_active ? 'ok' : 'neutral'}>{n.is_active ? '활성' : '비활성'}</Badge>
                    </button>
                  </Td>
                  <Td align="center">
                    <button onClick={() => openEdit(n)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, marginRight: 6 }}><Badge tone="brand">수정</Badge></button>
                    <button onClick={() => handleDelete(n)} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}><Badge tone="bad">삭제</Badge></button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
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
              background: DS.panel, border: `1px solid ${DS.line}`, borderRadius: 18,
              padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(11,18,32,0.28)',
            }}
          >
            <h3 className="text-a18" style={{ margin: '0 0 20px', fontWeight: 900, color: DS.ink }}>
              {editTarget ? '공지 수정' : '새 공지 추가'}
            </h3>

            {/* ── 제목 입력 (배너에 표시되는 짧은 텍스트) ── */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span className="text-a12" style={{ color: DS.sub, display: 'block', marginBottom: 6 }}>
                제목 <span style={{ color: DS.bad }}>*</span>
                <span style={{ color: DS.faint, marginLeft: 6 }}>홈 화면 배너에 표시됩니다</span>
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
              <span className="text-a11" style={{ color: DS.faint, marginTop: 4, display: 'block', textAlign: 'right' }}>
                {form.title.length}/60
              </span>
            </label>

            {/* ── 본문 입력 (상세 페이지에서 표시) ── */}
            <label style={{ display: 'block', marginBottom: 14 }}>
              <span className="text-a12" style={{ color: DS.sub, display: 'block', marginBottom: 6 }}>
                본문 <span style={{ color: DS.bad }}>*</span>
                <span style={{ color: DS.faint, marginLeft: 6 }}>공지사항 상세 페이지에 표시됩니다</span>
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
                <span className="text-a12" style={{ color: DS.sub, display: 'block', marginBottom: 6 }}>
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
                <span className="text-a12" style={{ color: DS.sub, display: 'block', marginBottom: 6 }}>
                  활성
                </span>
                <div
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  style={{
                    width: 44,
                    height: 26,
                    borderRadius: 999,
                    background: form.is_active ? DS.accent : DS.line,
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
              <p className="text-a12" style={{ color: DS.bad, marginBottom: 12, fontWeight: 600 }}>
                ⚠️ {error}
              </p>
            )}

            {/* ── 취소/저장 버튼 ── */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <DSButton variant="ghost" onClick={closeModal}>취소</DSButton>
              <DSButton
                variant="primary"
                onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.content.trim()}
                style={{ opacity: (saving || !form.title.trim() || !form.content.trim()) ? 0.55 : 1 }}
              >
                {saving ? '저장 중...' : '저장'}
              </DSButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
