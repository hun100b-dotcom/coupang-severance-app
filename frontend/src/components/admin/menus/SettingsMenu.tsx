import { useEffect, useState } from 'react'
import { getSettings, getBlockedIps, patchSetting } from '../../../lib/api'
import type { SystemSettings, BlockedIp } from '../../../types/admin'
import DiscordSettings from '../settings/DiscordSettings'
import CmsSettings from '../settings/CmsSettings'
import LegalVariables from '../settings/LegalVariables'
import IpBlockManager from '../settings/IpBlockManager'

interface Props {
  isSuperAdmin: boolean
}

// ── 권한 레벨 관리 섹션 (슈퍼어드민 전용) ──────────────────
interface PermLevel { label: string; color: string; permissions: Record<string, boolean> }
type PermLevels = Record<string, PermLevel>

const FEATURE_KEYS = [
  { key: 'dashboard',  label: 'Dashboard' },
  { key: 'target',     label: 'Target' },
  { key: 'inquiries',  label: 'Inquiries' },
  { key: 'notices',    label: '공지사항' },
  { key: 'members',    label: '회원 관리' },
  { key: 'accounts',   label: '관리자 계정' },
  { key: 'settings',   label: 'Settings' },
  { key: 'audit_logs', label: 'Audit Logs' },
  { key: 'server_logs',label: 'Server Logs' },
]

const DEFAULT_PERM_LEVELS: PermLevels = {
  super_admin: {
    label: '슈퍼 관리자', color: '#f04040',
    permissions: Object.fromEntries(FEATURE_KEYS.map(f => [f.key, true])),
  },
  admin: {
    label: '관리자', color: '#3182f6',
    permissions: { dashboard:true,target:true,inquiries:true,notices:true,members:true,accounts:false,settings:false,audit_logs:false,server_logs:false },
  },
  viewer: {
    label: '뷰어', color: '#6b7280',
    permissions: { dashboard:true,target:false,inquiries:true,notices:false,members:false,accounts:false,settings:false,audit_logs:false,server_logs:false },
  },
}

function PermissionLevelsSection({ onSaved }: { onSaved: () => void }) {
  const [levels, setLevels] = useState<PermLevels>(DEFAULT_PERM_LEVELS)
  const [editKey, setEditKey] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<PermLevel | null>(null)
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await (await import('../../../lib/supabase')).supabase!
          .from('system_settings').select('value').eq('key', 'permission_levels').single()
        if (data?.value) setLevels(JSON.parse(data.value))
      } catch { /* 기본값 사용 */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  async function saveLevels(updated: PermLevels) {
    setSaving(true); setMsg('')
    try {
      await patchSetting('permission_levels', JSON.stringify(updated))
      setLevels(updated)
      setMsg('권한 레벨 저장 완료')
      onSaved()
    } catch { setMsg('저장 실패') }
    finally { setSaving(false) }
  }

  function startEdit(key: string) {
    setEditKey(key)
    setEditForm({ ...levels[key], permissions: { ...levels[key].permissions } })
  }

  async function deleteLevel(key: string) {
    if (key === 'super_admin') { alert('슈퍼 관리자 레벨은 삭제할 수 없습니다.'); return }
    if (!confirm(`'${levels[key].label}' 권한 레벨을 삭제하시겠습니까?`)) return
    const updated = { ...levels }
    delete updated[key]
    await saveLevels(updated)
  }

  async function saveEdit() {
    if (!editKey || !editForm) return
    const updated = { ...levels, [editKey]: editForm }
    await saveLevels(updated)
    setEditKey(null)
    setEditForm(null)
  }

  async function addLevel() {
    if (!newKey.trim()) { alert('권한 레벨 키를 입력하세요.'); return }
    const key = newKey.trim().toLowerCase().replace(/\s+/g, '_')
    if (levels[key]) { alert('이미 존재하는 키입니다.'); return }
    const updated = {
      ...levels,
      [key]: { label: key, color: '#6b7280', permissions: Object.fromEntries(FEATURE_KEYS.map(f => [f.key, false])) }
    }
    await saveLevels(updated)
    setNewKey('')
  }

  if (loading) return <div style={cardSt}><p style={titleSt}>권한 레벨 관리</p><p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)' }}>로딩 중...</p></div>

  return (
    <div style={cardSt}>
      <p style={titleSt}>권한 레벨 관리 <span style={{ fontSize: '0.7rem', color: '#f04040', fontWeight: 700, marginLeft: 8 }}>● 최고관리자 전용</span></p>
      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 16, lineHeight: 1.5 }}>
        각 권한 레벨의 이름, 색상, 접근 가능 메뉴를 설정합니다. 변경사항은 관리자 계정 메뉴에 즉시 반영됩니다.
      </p>

      {Object.entries(levels).map(([key, lv]) => (
        <div key={key} style={{
          marginBottom: 10, padding: '12px 14px', borderRadius: 10,
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {editKey === key && editForm ? (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <input
                  value={editForm.label}
                  onChange={e => setEditForm(f => f ? { ...f, label: e.target.value } : f)}
                  placeholder="표시 이름"
                  style={{ ...inputSm, flex: '1 1 120px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>색상</label>
                  <input
                    type="color"
                    value={editForm.color}
                    onChange={e => setEditForm(f => f ? { ...f, color: e.target.value } : f)}
                    style={{ width: 36, height: 28, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {FEATURE_KEYS.map(f => (
                  <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!editForm.permissions[f.key]}
                      onChange={e => setEditForm(fm => fm ? { ...fm, permissions: { ...fm.permissions, [f.key]: e.target.checked } } : fm)}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={saveEdit} disabled={saving} style={{ ...btnSmPrimary }}>저장</button>
                <button onClick={() => { setEditKey(null); setEditForm(null) }} style={btnSmOutline}>취소</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: lv.color, background: `${lv.color}18`, padding: '2px 10px', borderRadius: 999 }}>{lv.label}</span>
              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>{key}</span>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)' }}>
                {Object.entries(lv.permissions).filter(([,v]) => v).map(([k]) => k).join(', ') || '권한 없음'}
              </span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button onClick={() => startEdit(key)} style={btnSmOutline}>수정</button>
                {key !== 'super_admin' && (
                  <button onClick={() => deleteLevel(key)} style={btnSmDanger}>삭제</button>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 새 레벨 추가 */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <input
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          placeholder="새 권한 레벨 키 (예: manager)"
          style={{ ...inputSm, flex: 1 }}
        />
        <button onClick={addLevel} disabled={saving} style={btnSmPrimary}>+ 추가</button>
      </div>
      {msg && <p style={{ fontSize: '0.78rem', color: msg.includes('실패') ? '#f04052' : '#00c48c', marginTop: 8 }}>{msg}</p>}
    </div>
  )
}

// ── 개인정보 보안키 섹션 (슈퍼어드민 전용) ───────────────────
function MaskingKeySection() {
  const [currentKey, setCurrentKey] = useState('')
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const { data } = await (await import('../../../lib/supabase')).supabase!
          .from('system_settings').select('value').eq('key', 'member_unmask_key').single()
        setCurrentKey(data?.value ?? '')
      } catch { setCurrentKey('') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  async function save() {
    if (!newKey.trim()) { setMsg('새 보안키를 입력하세요.'); return }
    setSaving(true); setMsg('')
    try {
      await patchSetting('member_unmask_key', newKey.trim())
      setCurrentKey(newKey.trim())
      setNewKey('')
      setRevealed(false)
      setMsg('보안키가 저장되었습니다.')
    } catch { setMsg('저장 실패') }
    finally { setSaving(false) }
  }

  return (
    <div style={cardSt}>
      <p style={titleSt}>개인정보 마스킹 해제 보안키 <span style={{ fontSize: '0.7rem', color: '#f04040', fontWeight: 700, marginLeft: 8 }}>● 최고관리자 전용</span></p>
      <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: 14, lineHeight: 1.5 }}>
        회원 관리 탭에서 이메일/ID 마스킹을 해제할 때 필요한 보안키입니다. 최고관리자만 설정·조회 가능합니다.
      </p>

      {!loading && (
        <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>현재 보안키</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <code style={{ fontSize: '0.88rem', color: revealed ? '#22c55e' : 'rgba(255,255,255,0.2)', letterSpacing: '0.1em' }}>
              {currentKey ? (revealed ? currentKey : '●'.repeat(Math.min(currentKey.length, 12))) : '(미설정)'}
            </code>
            {currentKey && (
              <button onClick={() => setRevealed(r => !r)} style={{ ...btnSmOutline, fontSize: '0.68rem' }}>
                {revealed ? '숨기기' : '보기'}
              </button>
            )}
          </div>
        </div>
      )}

      <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>
        새 보안키 {currentKey ? '(변경)' : '(설정)'}
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="password"
          value={newKey}
          onChange={e => setNewKey(e.target.value)}
          placeholder="새 보안키 입력..."
          style={{ ...inputSm, flex: 1 }}
        />
        <button onClick={save} disabled={saving} style={btnSmPrimary}>{saving ? '저장 중...' : '저장'}</button>
      </div>
      {msg && <p style={{ fontSize: '0.78rem', color: msg.includes('실패') ? '#f04052' : '#00c48c', marginTop: 8 }}>{msg}</p>}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────
export default function SettingsMenu({ isSuperAdmin }: Props) {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [ips, setIps] = useState<BlockedIp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = async () => {
    try {
      const res = await getSettings()
      setSettings(res.settings ?? {})
    } catch (e: unknown) { throw e }
  }

  const loadIps = async () => {
    try {
      const res = await getBlockedIps()
      setIps(res.blocked_ips ?? [])
    } catch { /* silent */ }
  }

  const reload = async () => {
    setLoading(true); setError(null)
    try {
      await Promise.all([loadSettings(), loadIps()])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally { setLoading(false) }
  }

  useEffect(() => { reload() }, [])

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>설정 로딩 중...</div>

  if (error || !settings) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)', borderRadius: 12, padding: '20px', color: '#ff6b6b' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ 설정 로드 실패</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>{error || '데이터를 불러오지 못했습니다.'}</div>
          <button onClick={reload} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3182f6', color: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700 }}>재시도</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: 0 }}>Settings</h2>
        <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>운영 제어 · Discord · CMS · 법정 변수 · IP 보안</p>
      </div>

      <div style={{ maxWidth: 700 }}>
        {/* 공통 설정 */}
        <DiscordSettings settings={settings} onRefresh={loadSettings} />
        <CmsSettings settings={settings} onRefresh={loadSettings} />
        <LegalVariables settings={settings} onRefresh={loadSettings} />
        <IpBlockManager ips={ips} onRefresh={loadIps} />

        {/* 슈퍼어드민 전용 섹션 */}
        {isSuperAdmin && (
          <>
            <div style={{ margin: '24px 0 14px', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 3, height: 16, background: '#f04040', borderRadius: 2 }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f04040' }}>최고관리자 전용 설정</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>catchmarsterdmin@gmail.com 계정에서만 표시됩니다.</p>
            </div>
            <MaskingKeySection />
            <PermissionLevelsSection onSaved={() => {}} />
          </>
        )}
      </div>
    </div>
  )
}

const cardSt: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '20px', marginBottom: 16 }
const titleSt: React.CSSProperties = { fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 14 }
const inputSm: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: '0.83rem', outline: 'none' }
const btnSmPrimary: React.CSSProperties = { padding: '6px 14px', borderRadius: 8, border: 'none', background: '#3182f6', color: '#fff', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700 }
const btnSmOutline: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', cursor: 'pointer' }
const btnSmDanger: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(240,64,64,0.2)', background: 'rgba(240,64,64,0.08)', color: '#f04052', fontSize: '0.78rem', cursor: 'pointer' }
