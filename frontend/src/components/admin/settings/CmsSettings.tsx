import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import type { SystemSettings } from '../../../types/admin'

interface Props {
  settings: SystemSettings
  onRefresh: () => void
}

// Supabase에 직접 upsert (백엔드 경유 없이) — RLS: is_admin()으로 인증된 관리자만 가능
async function upsertSetting(key: string, value: string) {
  if (!supabase) throw new Error('Supabase 미연결')
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })
  if (error) throw error
}

export default function CmsSettings({ settings, onRefresh }: Props) {
  const [annoText, setAnnoText] = useState(settings['announcement_text'] ?? '')
  const [annoEnabled, setAnnoEnabled] = useState(settings['announcement_enabled'] === 'true')
  const [bannerText, setBannerText] = useState(settings['popup_banner_text'] ?? '')
  const [bannerEnabled, setBannerEnabled] = useState(settings['popup_banner_enabled'] === 'true')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      await Promise.all([
        upsertSetting('announcement_text',    annoText),
        upsertSetting('announcement_enabled', String(annoEnabled)),
        upsertSetting('popup_banner_text',    bannerText),
        upsertSetting('popup_banner_enabled', String(bannerEnabled)),
      ])
      setMsg({ text: '✅ 저장 완료. 홈 화면에 즉시 반영됩니다.', ok: true })
      onRefresh()
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : String(e)
      setMsg({ text: `❌ 저장 실패: ${err}`, ok: false })
    } finally {
      setSaving(false)
    }
  }

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <div onClick={onToggle} style={{
      width: 36, height: 20, borderRadius: 10,
      background: on ? '#3182f6' : 'rgba(255,255,255,0.15)',
      position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 17 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </div>
  )

  return (
    <div style={cardStyle}>
      <p style={titleStyle}>공지/배너 CMS</p>
      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)', marginBottom: 16, marginTop: -8 }}>
        저장 즉시 홈 화면에 반영 (Supabase 직접 연동)
      </p>

      {/* 긴급 공지 배너 */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={labelStyle}>긴급 공지 배너 (홈 상단 노란 띠)</span>
          <Toggle on={annoEnabled} onToggle={() => setAnnoEnabled(e => !e)} />
          <span style={{ fontSize: '0.72rem', color: annoEnabled ? '#3182f6' : 'rgba(255,255,255,0.3)' }}>
            {annoEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <textarea
          value={annoText}
          onChange={e => setAnnoText(e.target.value)}
          placeholder="긴급 공지 내용 (비워두면 표시 안 됨)"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* 팝업 배너 */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={labelStyle}>팝업 배너 (진입 시 모달 팝업)</span>
          <Toggle on={bannerEnabled} onToggle={() => setBannerEnabled(e => !e)} />
          <span style={{ fontSize: '0.72rem', color: bannerEnabled ? '#3182f6' : 'rgba(255,255,255,0.3)' }}>
            {bannerEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <textarea
          value={bannerText}
          onChange={e => setBannerText(e.target.value)}
          placeholder="팝업 내용 (줄바꿈 가능)"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
        <p style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.28)', marginTop: 5 }}>
          * 사용자가 "오늘 하루 보지 않기" 클릭 시 24시간 비표시
        </p>
      </div>

      <button onClick={save} disabled={saving} style={{
        ...btnStyle, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer',
      }}>
        {saving ? '저장 중...' : '설정 저장'}
      </button>
      {msg && (
        <p style={{ fontSize: '0.78rem', color: msg.ok ? '#00c48c' : '#ff6b6b', marginTop: 8 }}>
          {msg.text}
        </p>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14, padding: '20px', marginBottom: 16,
}
const titleStyle: React.CSSProperties = {
  fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 6,
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', flex: 1,
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
const btnStyle: React.CSSProperties = {
  padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3182f6',
  color: '#fff', fontSize: '0.85rem', fontWeight: 700,
}
