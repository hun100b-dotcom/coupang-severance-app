// AccountsMenu.tsx — 관리자 계정 관리
// RLS: super_admin만 INSERT/UPDATE/DELETE 가능 (004_security_rls.sql)
// → 최초 super_admin 등록은 Supabase SQL Editor에서 직접 INSERT 필요

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../lib/supabase'

interface AdminAccount {
  id: string
  email: string
  role: string
  display_name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface PermissionLevel {
  label: string
  color: string
  permissions: Record<string, boolean>
}

interface Props {
  isSuperAdmin: boolean
}

const DEFAULT_ROLE_COLORS: Record<string, string> = {
  super_admin: '#f04040',
  admin: '#3182f6',
  viewer: '#6b7280',
}

const EMPTY_FORM = {
  email: '', role: 'viewer', display_name: '', is_active: true,
}

export default function AccountsMenu({ isSuperAdmin }: Props) {
  const [accounts, setAccounts] = useState<AdminAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState<null | 'create' | AdminAccount>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saveError, setSaveError] = useState('')

  // 커스텀 권한 레벨 (system_settings에서 로드)
  const [permLevels, setPermLevels] = useState<Record<string, PermissionLevel>>({
    super_admin: { label: '슈퍼 관리자', color: '#f04040', permissions: {} },
    admin: { label: '관리자', color: '#3182f6', permissions: {} },
    viewer: { label: '뷰어', color: '#6b7280', permissions: {} },
  })

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

  // 커스텀 권한 레벨 로드
  const fetchPermLevels = useCallback(async () => {
    if (!supabase) return
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'permission_levels')
        .single()
      if (data?.value) {
        const parsed = JSON.parse(data.value)
        setPermLevels(parsed)
      }
    } catch { /* 기본값 유지 */ }
  }, [])

  useEffect(() => {
    fetchAccounts()
    fetchPermLevels()
  }, [fetchAccounts, fetchPermLevels])

  function openCreate() { setForm(EMPTY_FORM); setSaveError(''); setModal('create') }
  function openEdit(account: AdminAccount) {
    setForm({
      email: account.email,
      role: account.role,
      display_name: account.display_name ?? '',
      is_active: account.is_active,
    })
    setSaveError('')
    setModal(account)
  }

  async function handleSave() {
    if (!supabase) return
    if (!form.email.trim()) { setSaveError('이메일을 입력하세요.'); return }
    if (!isSuperAdmin) {
      setSaveError('슈퍼 관리자만 계정을 추가/수정할 수 있습니다.')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      if (modal === 'create') {
        const { error } = await supabase.from('admin_accounts').insert({
          email: form.email.trim().toLowerCase(),
          role: form.role,
          display_name: form.display_name.trim() || null,
          is_active: form.is_active,
        })
        if (error) throw error
      } else if (modal && typeof modal === 'object') {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      setSaveError(`저장 실패: ${msg}`)
      console.error('계정 저장 실패:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(account: AdminAccount) {
    if (!supabase) return
    if (!isSuperAdmin) { alert('슈퍼 관리자만 계정을 삭제할 수 있습니다.'); return }
    if (!confirm(`'${account.email}' 계정을 삭제하시겠습니까?`)) return
    try {
      const { error } = await supabase.from('admin_accounts').delete().eq('id', account.id)
      if (error) throw error
      await fetchAccounts()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err)
      alert(`삭제 실패: ${msg}`)
    }
  }

  function getRoleLabel(role: string) {
    return permLevels[role]?.label ?? role
  }
  function getRoleColor(role: string) {
    return permLevels[role]?.color ?? DEFAULT_ROLE_COLORS[role] ?? '#6b7280'
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const roleOptions = Object.entries(permLevels).map(([key, v]) => ({ key, label: v.label }))

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>관리자 계정 관리</h2>
          <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            admin_accounts 테이블 · 슈퍼 관리자만 추가/수정/삭제 가능
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={fetchAccounts} style={outlineBtn}>↻ 새로고침</button>
          {isSuperAdmin && (
            <button onClick={openCreate} style={btnPrimary}>+ 계정 추가</button>
          )}
        </div>
      </div>

      {/* 슈퍼어드민 전용 안내 */}
      {!isSuperAdmin && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 10,
          background: 'rgba(49,130,246,0.06)', border: '1px solid rgba(49,130,246,0.15)',
          fontSize: '0.78rem', color: 'rgba(150,190,255,0.8)', lineHeight: 1.5,
        }}>
          ℹ️ 계정 추가/수정/삭제는 슈퍼 관리자만 가능합니다. 권한 레벨 설정은 Settings 탭에서 관리합니다.
        </div>
      )}

      {/* 최초 설정 안내 (계정 없을 때) */}
      {!loading && accounts.length === 0 && isSuperAdmin && (
        <div style={{
          marginBottom: 14, padding: '12px 16px', borderRadius: 10,
          background: 'rgba(240,200,0,0.06)', border: '1px solid rgba(240,200,0,0.2)',
          fontSize: '0.8rem', color: 'rgba(255,220,50,0.85)', lineHeight: 1.6,
        }}>
          ⚠️ 등록된 관리자 계정이 없습니다. 최초 슈퍼 관리자는 <strong>Supabase SQL Editor</strong>에서 직접 INSERT해야 합니다:<br />
          <code style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginTop: 4 }}>
            INSERT INTO admin_accounts (email, role) VALUES ('catchmarsterdmin@gmail.com', 'super_admin');
          </code>
        </div>
      )}

      {/* 계정 목록 */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, overflow: 'hidden',
      }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>로딩 중...</p>
        ) : accounts.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '32px 0', fontSize: '0.85rem' }}>등록된 관리자 계정이 없습니다.</p>
        ) : (
          <>
            <div className="hidden md:grid" style={{
              gridTemplateColumns: '1fr 120px 120px 80px 110px',
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: '0.7rem', fontWeight: 700,
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              <span>이메일 / 이름</span><span>권한</span><span>등록일</span><span>상태</span>
              {isSuperAdmin && <span style={{ textAlign: 'right' }}>관리</span>}
            </div>

            {accounts.map(account => (
              <div key={account.id}>
                {/* PC 행 */}
                <div className="hidden md:grid" style={{
                  gridTemplateColumns: isSuperAdmin ? '1fr 120px 120px 80px 110px' : '1fr 120px 120px 80px',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: '0.86rem', color: '#fff', fontWeight: 600 }}>{account.email}</div>
                    {account.display_name && (
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{account.display_name}</div>
                    )}
                  </div>
                  <div>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700,
                      color: getRoleColor(account.role),
                      background: `${getRoleColor(account.role)}22`,
                      padding: '3px 8px', borderRadius: 999,
                    }}>
                      {getRoleLabel(account.role)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>{formatDate(account.created_at)}</div>
                  <div>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700,
                      color: account.is_active ? '#22c55e' : 'rgba(255,255,255,0.3)',
                      background: account.is_active ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                      padding: '3px 8px', borderRadius: 999,
                    }}>
                      {account.is_active ? '활성' : '비활성'}
                    </span>
                  </div>
                  {isSuperAdmin && (
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => openEdit(account)} style={smallOutlineBtn}>수정</button>
                      <button onClick={() => handleDelete(account)} style={smallDangerBtn}>삭제</button>
                    </div>
                  )}
                </div>

                {/* 모바일 카드 */}
                <div className="md:hidden" style={{ padding: '13px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                    <div style={{ fontSize: '0.84rem', color: '#fff', fontWeight: 600, wordBreak: 'break-all', flex: 1 }}>
                      {account.email}
                    </div>
                    <span style={{
                      marginLeft: 8, fontSize: '0.68rem', fontWeight: 700,
                      color: getRoleColor(account.role),
                      background: `${getRoleColor(account.role)}22`,
                      padding: '2px 7px', borderRadius: 999, flexShrink: 0,
                    }}>
                      {getRoleLabel(account.role)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {account.display_name && <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>{account.display_name}</span>}
                    <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{formatDate(account.created_at)}</span>
                    <span style={{ fontSize: '0.7rem', color: account.is_active ? '#22c55e' : 'rgba(255,255,255,0.3)' }}>
                      {account.is_active ? '● 활성' : '○ 비활성'}
                    </span>
                    {isSuperAdmin && (
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(account)} style={smallOutlineBtn}>수정</button>
                        <button onClick={() => handleDelete(account)} style={smallDangerBtn}>삭제</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* 계정 생성/수정 모달 */}
      {modal !== null && isSuperAdmin && (
        <div style={overlayStyle} onClick={() => setModal(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#fff', marginBottom: 18 }}>
              {modal === 'create' ? '관리자 계정 추가' : '관리자 계정 수정'}
            </h3>

            <label style={labelSt}>이메일 *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" style={inputSt} />

            <label style={labelSt}>표시 이름 (선택)</label>
            <input type="text" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="홍길동" style={inputSt} />

            <label style={labelSt}>권한 레벨</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={inputSt}>
              {roleOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label} ({opt.key})</option>
              ))}
            </select>

            <label style={{ ...labelSt, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              활성 상태
            </label>

            {saveError && (
              <div style={{
                marginTop: 10, padding: '10px 12px', borderRadius: 8,
                background: 'rgba(240,64,64,0.1)', border: '1px solid rgba(240,64,64,0.25)',
                fontSize: '0.78rem', color: '#ff6b6b', lineHeight: 1.5,
              }}>
                ⚠️ {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setModal(null); setSaveError('') }} style={{ ...outlineBtn, flex: 1 }}>취소</button>
              <button onClick={handleSave} disabled={saving} style={{ ...btnPrimary, flex: 1 }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const outlineBtn: React.CSSProperties = { padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }
const btnPrimary: React.CSSProperties = { padding: '7px 16px', borderRadius: 8, border: 'none', background: '#3182f6', color: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700 }
const smallOutlineBtn: React.CSSProperties = { padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', cursor: 'pointer' }
const smallDangerBtn: React.CSSProperties = { padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(240,68,82,0.25)', background: 'rgba(240,68,82,0.08)', color: '#f04052', fontSize: '0.75rem', cursor: 'pointer' }
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }
const modalStyle: React.CSSProperties = { background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '26px 22px', width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }
const labelSt: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 6, marginTop: 14 }
const inputSt: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }
