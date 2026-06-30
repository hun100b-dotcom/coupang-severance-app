import { useEffect, useState } from 'react'
import { UP } from '../shared/adminTheme'
import { getSettings, getBlockedIps, patchSetting, setUnmaskKey, getUnmaskKeyStatus } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'
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
    label: '슈퍼 관리자', color: UP.danger,
    permissions: Object.fromEntries(FEATURE_KEYS.map(f => [f.key, true])),
  },
  admin: {
    label: '관리자', color: UP.brand,
    permissions: { dashboard:true,target:true,inquiries:true,notices:true,members:true,accounts:false,settings:false,audit_logs:false,server_logs:false },
  },
  viewer: {
    label: '뷰어', color: UP.sub,
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
      [key]: { label: key, color: UP.sub, permissions: Object.fromEntries(FEATURE_KEYS.map(f => [f.key, false])) }
    }
    await saveLevels(updated)
    setNewKey('')
  }

  if (loading) return <div style={cardSt}><p style={titleSt}>권한 레벨 관리</p><p style={{ fontSize: '0.8rem', color: UP.caption }}>로딩 중...</p></div>

  return (
    <div style={cardSt}>
      <p style={titleSt}>권한 레벨 관리 <span style={{ fontSize: '0.7rem', color: UP.danger, fontWeight: 700, marginLeft: 8 }}>● 최고관리자 전용</span></p>
      <p style={{ fontSize: '0.78rem', color: UP.sub, marginBottom: 16, lineHeight: 1.5 }}>
        각 권한 레벨의 이름, 색상, 접근 가능 메뉴를 설정합니다. 변경사항은 관리자 계정 메뉴에 즉시 반영됩니다.
      </p>

      {Object.entries(levels).map(([key, lv]) => (
        <div key={key} style={{
          marginBottom: 10, padding: '12px 14px', borderRadius: 10,
          background: UP.sunken, border: `1px solid ${UP.hair}`,
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
                  <label style={{ fontSize: '0.72rem', color: UP.sub }}>색상</label>
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
                  <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: UP.body, cursor: 'pointer' }}>
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
              <span style={{ fontSize: '0.72rem', color: UP.caption }}>{key}</span>
              <span style={{ fontSize: '0.7rem', color: UP.sub }}>
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
      {msg && <p style={{ fontSize: '0.78rem', color: msg.includes('실패') ? UP.danger : UP.green, marginTop: 8 }}>{msg}</p>}
    </div>
  )
}

// ── 개인정보 보안키 섹션 (슈퍼어드민 전용) ───────────────────
// 보안 재설계(🔴#4): 과거에는 보안키를 system_settings 에 "평문 저장 + 공개 읽기"해서
// 누구나 키를 조회할 수 있었다. 이제 서버가 PBKDF2 해시만 보관하므로 원문은 어디에도
// 노출되지 않는다. 따라서 "현재 키 보기"는 불가능하고, "설정 여부"만 표시한다.
function MaskingKeySection() {
  const [configured, setConfigured] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)

  async function loadStatus() {
    try {
      const res = await getUnmaskKeyStatus()
      setConfigured(!!res.configured)
      setUpdatedAt(res.updated_at ?? null)
    } catch { setConfigured(false) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadStatus() }, [])

  async function save() {
    if (!newKey.trim()) { setMsg('새 보안키를 입력하세요.'); return }
    setSaving(true); setMsg('')
    try {
      const email = (await supabase?.auth.getUser())?.data.user?.email ?? ''
      await setUnmaskKey(newKey.trim(), email)
      setNewKey('')
      setMsg('보안키가 저장되었습니다. (서버에 해시로만 보관됩니다)')
      await loadStatus()
    } catch { setMsg('저장 실패') }
    finally { setSaving(false) }
  }

  return (
    <div style={cardSt}>
      <p style={titleSt}>개인정보 마스킹 해제 보안키 <span style={{ fontSize: '0.7rem', color: UP.danger, fontWeight: 700, marginLeft: 8 }}>● 최고관리자 전용</span></p>
      <p style={{ fontSize: '0.78rem', color: UP.sub, marginBottom: 14, lineHeight: 1.5 }}>
        회원 관리 탭에서 평문 정보를 단건 확인할 때 필요한 보안키입니다. 서버에 해시로만 저장되어
        원문은 다시 조회할 수 없으니, 분실 시 새 키로 재설정하세요.
      </p>

      {!loading && (
        <div style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: UP.sunken, border: `1px solid ${UP.hair}` }}>
          <div style={{ fontSize: '0.72rem', color: UP.sub, marginBottom: 4 }}>현재 상태</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: configured ? UP.green : UP.caption }}>
              {configured ? '🔐 설정됨 (서버 해시 보관)' : '(미설정)'}
            </span>
            {configured && updatedAt && (
              <span style={{ fontSize: '0.72rem', color: UP.caption }}>
                · 최종 변경 {new Date(updatedAt).toLocaleString('ko-KR')}
              </span>
            )}
          </div>
        </div>
      )}

      <label style={{ fontSize: '0.75rem', color: UP.sub, display: 'block', marginBottom: 6 }}>
        새 보안키 {configured ? '(변경)' : '(설정)'}
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
      {msg && <p style={{ fontSize: '0.78rem', color: msg.includes('실패') ? UP.danger : UP.green, marginTop: 8 }}>{msg}</p>}
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
    const res = await getSettings()
    setSettings(res.settings ?? {})
  }

  const loadIps = async () => {
    try {
      const res = await getBlockedIps()
      setIps(res.blocked_ips ?? [])
    } catch (err) { console.warn('[Settings] 차단 IP 목록 조회 실패:', err) }
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

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: UP.sub, fontSize: '0.88rem' }}>설정 로딩 중...</div>

  if (error || !settings) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)', borderRadius: 12, padding: '20px', color: UP.danger }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ 설정 로드 실패</div>
          <div style={{ fontSize: '0.82rem', color: UP.body, marginBottom: 12 }}>{error || '데이터를 불러오지 못했습니다.'}</div>
          <button onClick={reload} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: UP.brand, color: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700 }}>재시도</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: UP.navy, margin: 0 }}>Settings</h2>
        <p style={{ fontSize: '0.75rem', color: UP.sub, marginTop: 2 }}>운영 제어 · Discord · CMS · 법정 변수 · IP 보안</p>
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
            <div style={{ margin: '24px 0 14px', borderTop: `1px solid ${UP.hair}`, paddingTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <div style={{ width: 3, height: 16, background: UP.danger, borderRadius: 2 }} />
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: UP.danger }}>최고관리자 전용 설정</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: UP.caption }}>catchmasterdmin@gmail.com 계정에서만 표시됩니다.</p>
            </div>
            <MaskingKeySection />
            <PermissionLevelsSection onSaved={() => {}} />
          </>
        )}
      </div>
    </div>
  )
}

const cardSt: React.CSSProperties = { background: UP.sunken, border: `1px solid ${UP.hair}`, borderRadius: 14, padding: '20px', marginBottom: 16 }
const titleSt: React.CSSProperties = { fontSize: '0.88rem', fontWeight: 700, color: UP.body, marginBottom: 14 }
const inputSm: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: `1px solid ${UP.hair}`, background: '#fff', color: UP.navy, fontSize: '0.83rem', outline: 'none' }
const btnSmPrimary: React.CSSProperties = { padding: '6px 14px', borderRadius: 8, border: 'none', background: UP.brand, color: '#fff', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700 }
const btnSmOutline: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: `1px solid ${UP.hair}`, background: UP.sunken, color: UP.body, fontSize: '0.78rem', cursor: 'pointer' }
const btnSmDanger: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(240,64,64,0.2)', background: 'rgba(240,64,64,0.08)', color: UP.danger, fontSize: '0.78rem', cursor: 'pointer' }
