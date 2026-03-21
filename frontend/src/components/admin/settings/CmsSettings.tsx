import { useState } from 'react'
import type { SystemSettings } from '../../../types/admin'
import { patchSetting } from '../../../lib/api'

interface Props {
  settings: SystemSettings
  onRefresh: () => void
}

export default function CmsSettings({ settings, onRefresh }: Props) {
  const [annoText, setAnnoText] = useState(settings['announcement_text'] ?? '')
  const [annoEnabled, setAnnoEnabled] = useState(settings['announcement_enabled'] === 'true')
  const [bannerText, setBannerText] = useState(settings['popup_banner_text'] ?? '')
  const [bannerEnabled, setBannerEnabled] = useState(settings['popup_banner_enabled'] === 'true')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      await patchSetting('announcement_text', annoText)
      await patchSetting('announcement_enabled', String(annoEnabled))
      await patchSetting('popup_banner_text', bannerText)
      await patchSetting('popup_banner_enabled', String(bannerEnabled))
      setMsg('저장되었습니다.')
      onRefresh()
    } catch {
      setMsg('저장 실패.')
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

      {/* 긴급 공지 */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={labelStyle}>긴급 공지 배너</span>
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
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={labelStyle}>팝업 배너</span>
          <Toggle on={bannerEnabled} onToggle={() => setBannerEnabled(e => !e)} />
          <span style={{ fontSize: '0.72rem', color: bannerEnabled ? '#3182f6' : 'rgba(255,255,255,0.3)' }}>
            {bannerEnabled ? 'ON' : 'OFF'}
          </span>
        </div>
        <textarea
          value={bannerText}
          onChange={e => setBannerText(e.target.value)}
          placeholder="팝업 배너 내용"
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <button onClick={save} disabled={saving} style={btnStyle}>
        {saving ? '저장 중...' : '설정 저장'}
      </button>
      {msg && <p style={{ fontSize: '0.78rem', color: '#00c48c', marginTop: 8 }}>{msg}</p>}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 14, padding: '20px', marginBottom: 16,
}
const titleStyle: React.CSSProperties = {
  fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 14,
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
  color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
}
