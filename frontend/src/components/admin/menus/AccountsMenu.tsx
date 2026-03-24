// AccountsMenu.tsx — 관리자 계정 관리 메뉴
// ─────────────────────────────────────────────────────────────
// Supabase `admin_accounts` 테이블을 기반으로 관리자 계정을 CRUD 관리합니다.
//
// 권한 레벨 (role):
//   - super_admin: 모든 권한 (계정 추가/삭제 포함)
//   - admin: 일반 관리 권한 (공지, 문의, 설정 등)
//   - viewer: 읽기 전용 (조회만 가능)
//
// SQL 테이블 구조:
//   → supabase/migrations/003_admin_accounts.sql 파일 참조

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

// ── 관리자 계정 타입 ──
interface AdminAccount {
  id: string
  email: string
  role: 'super_admin' | 'admin' | 'viewer'
  display_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── 역할 표시 레이블 및 색상 ──
const ROLE_LABEL: Record<AdminAccount['role'], string> = {
  super_admin: '슈퍼 관리자',
  admin: '관리자',
  viewer: '뷰어',
}

const ROLE_COLOR: Record<AdminAccount['role'], string> = {
  super_admin: '#f04040',   // 빨간색: 최고 권한
  admin: '#3182f6',          // 파란색: 일반 관리자
  viewer: '#6b7280',         // 회색: 읽기 전용
}

// ── 빈 폼 초기값 ──
const EMPTY_FORM = {
  email: '',
  role: 'viewer' as AdminAccount['role'],
  display_name: '',
  is_active: true,
}

export default function AccountsMenu() {
  // 계정 목록 상태
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 모달 상태 (null=닫힘, 'create'=신규 생성, AdminAccount=수정 중)
  const [modal, setModal] = useState<null | 'create' | AdminAccount>(null)

  // 폼 입력값 상태
  const [form, setForm] = useState(EMPTY_FORM)

  // ── 계정 목록 불러오기 ──
  const fetchAccounts = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('admin_accounts')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAccounts(data ?? [])
    } catch (err) {
      console.error('계정 목록 불러오기 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  // ── 신규 생성 모달 열기 ──
  function openCreate() {
    setForm(EMPTY_FORM)
    setModal('create')
  }

  // ── 수정 모달 열기 ──
  function openEdit(account: AdminAccount) {
    setForm({
      email: account.email,
      role: account.role,
      display_name: account.display_name ?? '',
      is_active: account.is_active,
    })
    setModal(account)
  }

  // ── 저장 (생성 또는 수정) ──
  async function handleSave() {
    if (!supabase) return
    if (!form.email.trim()) {
      alert('이메일을 입력하세요.')
      return
    }
    setSaving(true)
    try {
      if (modal === 'create') {
        // 신규 생성
        const { error } = await supabase.from('admin_accounts').insert({
          email: form.email.trim().toLowerCase(),
          role: form.role,
          display_name: form.display_name.trim() || null,
          is_active: form.is_active,
        })
        if (error) throw error
      } else if (modal && typeof modal === 'object') {
        // 기존 계정 수정
        const { error } = await supabase
          .from('admin_accounts')
          .update({
            email: form.email.trim().toLowerCase(),
            role: form.role,
            display_name: form.display_name.trim() || null,
            is_active: form.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', modal.id)
        if (error) throw error
      }
      await fetchAccounts()
      setModal(null)
    } catch (err) {
      console.error('계정 저장 실패:', err)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // ── 계정 삭제 ──
  async function handleDelete(account: AdminAccount) {
    if (!supabase) return
    if (!confirm(`'${account.email}' 계정을 삭제하시겠습니까?`)) return

    try {
      const { error } = await supabase
        .from('admin_accounts')
        .delete()
        .eq('id', account.id)
      if (error) throw error
      await fetchAccounts()
    } catch (err) {
      console.error('계정 삭제 실패:', err)
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  // ── 날짜 포맷 ──
  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>

      {/* ── 헤더 ── */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            관리자 계정 관리
          </h2>
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            admin_accounts 테이블 · 권한 레벨: super_admin / admin / viewer
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {/* 새로고침 버튼 */}
          <button onClick={fetchAccounts} style={outlineBtn}>↻ 새로고침</button>
          {/* 계정 추가 버튼 */}
          <button onClick={openCreate} style={primaryBtn}>+ 계정 추가</button>
        </div>
      </div>

      {/* ── 계정 목록 테이블 ── */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>
            로딩 중...
          </p>
        ) : accounts.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>
            등록된 관리자 계정이 없습니다.
          </p>
        ) : (
          /* ── PC: 테이블 | 모바일: 카드 ── */
          <>
            {/* PC 테이블 헤더 (md 이상) */}
            <div className="hidden md:grid" style={{
              gridTemplateColumns: '1fr 120px 120px 80px 100px',
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              <span>이메일 / 이름</span>
              <span>역할</span>
              <span>등록일</span>
              <span>상태</span>
              <span style={{ textAlign: 'right' }}>관리</span>
            </div>

            {accounts.map(account => (
              <div key={account.id}>
                {/* PC: 테이블 행 */}
                <div
                  className="hidden md:grid"
                  style={{
                    gridTemplateColumns: '1fr 120px 120px 80px 100px',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    alignItems: 'center',
                  }}
                >
                  {/* 이메일/이름 */}
                  <div>
                    <div style={{ fontSize: '0.88rem', color: '#fff', fontWeight: 600 }}>
                      {account.email}
                    </div>
                    {account.display_name && (
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                        {account.display_name}
                      </div>
                    )}
                  </div>
                  {/* 역할 배지 */}
                  <div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: ROLE_COLOR[account.role],
                      background: `${ROLE_COLOR[account.role]}22`,
                      padding: '3px 8px',
                      borderRadius: 999,
                    }}>
                      {ROLE_LABEL[account.role]}
                    </span>
                  </div>
                  {/* 등록일 */}
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                    {formatDate(account.created_at)}
                  </div>
                  {/* 상태 */}
                  <div>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: account.is_active ? '#22c55e' : 'rgba(255,255,255,0.3)',
                      background: account.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                      padding: '3px 8px',
                      borderRadius: 999,
                    }}>
                      {account.is_active ? '활성' : '비활성'}
                    </span>
                  </div>
                  {/* 수정/삭제 버튼 */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => openEdit(account)} style={smallOutlineBtn}>수정</button>
                    <button onClick={() => handleDelete(account)} style={smallDangerBtn}>삭제</button>
                  </div>
                </div>

                {/* 모바일: 카드 형식 */}
                <div
                  className="md:hidden"
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  {/* 상단: 이메일 + 역할 배지 */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, wordBreak: 'break-all', flex: 1 }}>
                      {account.email}
                    </div>
                    <span style={{
                      marginLeft: 8,
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: ROLE_COLOR[account.role],
                      background: `${ROLE_COLOR[account.role]}22`,
                      padding: '2px 7px',
                      borderRadius: 999,
                      flexShrink: 0,
                    }}>
                      {ROLE_LABEL[account.role]}
                    </span>
                  </div>
                  {/* 하단: 이름, 날짜, 상태, 버튼 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {account.display_name && (
                      <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                        {account.display_name}
                      </span>
                    )}
                    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                      {formatDate(account.created_at)}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      color: account.is_active ? '#22c55e' : 'rgba(255,255,255,0.3)',
                    }}>
                      {account.is_active ? '● 활성' : '○ 비활성'}
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(account)} style={smallOutlineBtn}>수정</button>
                      <button onClick={() => handleDelete(account)} style={smallDangerBtn}>삭제</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* ── 계정 생성/수정 모달 ── */}
      {modal !== null && (
        <div style={modalOverlay} onClick={() => setModal(null)}>
          <div
            style={modalBox}
            onClick={e => e.stopPropagation()} // 클릭 이벤트가 배경까지 전달되지 않도록 차단
          >
            {/* 모달 제목 */}
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: 20 }}>
              {modal === 'create' ? '관리자 계정 추가' : '관리자 계정 수정'}
            </h3>

            {/* 이메일 입력 */}
            <label style={labelStyle}>이메일 *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="admin@example.com"
              style={inputStyle}
            />

            {/* 표시 이름 입력 */}
            <label style={labelStyle}>표시 이름 (선택)</label>
            <input
              type="text"
              value={form.display_name}
              onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
              placeholder="홍길동"
              style={inputStyle}
            />

            {/* 역할 선택 */}
            <label style={labelStyle}>권한 레벨</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as AdminAccount['role'] }))}
              style={inputStyle}
            >
              <option value="viewer">뷰어 (읽기 전용)</option>
              <option value="admin">관리자 (일반 관리)</option>
              <option value="super_admin">슈퍼 관리자 (모든 권한)</option>
            </select>

            {/* 활성 상태 토글 */}
            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              활성 상태 (비활성화 시 로그인 불가)
            </label>

            {/* 버튼 그룹 */}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setModal(null)} style={{ ...outlineBtn, flex: 1 }}>
                취소
              </button>
              <button onClick={handleSave} disabled={saving} style={{ ...primaryBtn, flex: 1 }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 공통 스타일 상수 ──
const outlineBtn: React.CSSProperties = {
  padding: '7px 14px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600,
}
const primaryBtn: React.CSSProperties = {
  padding: '7px 16px', borderRadius: 8,
  border: 'none', background: '#3182f6', color: '#fff',
  fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
}
const smallOutlineBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'transparent', color: 'rgba(255,255,255,0.6)',
  fontSize: '0.75rem', cursor: 'pointer',
}
const smallDangerBtn: React.CSSProperties = {
  padding: '4px 10px', borderRadius: 6,
  border: '1px solid rgba(240,68,82,0.25)',
  background: 'rgba(240,68,82,0.08)', color: '#f04052',
  fontSize: '0.75rem', cursor: 'pointer',
}
const modalOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  padding: '16px',
}
const modalBox: React.CSSProperties = {
  background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 20, padding: '28px 24px',
  width: '100%', maxWidth: 440,
  maxHeight: '90vh', overflowY: 'auto',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.78rem', fontWeight: 600,
  color: 'rgba(255,255,255,0.5)', marginBottom: 6, marginTop: 14,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.06)', color: '#fff',
  fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
}
