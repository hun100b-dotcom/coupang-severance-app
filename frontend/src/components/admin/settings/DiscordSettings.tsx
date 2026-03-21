import { useState } from 'react'
import type { SystemSettings } from '../../../types/admin'
import { patchSetting } from '../../../lib/api'

interface Props {
  settings: SystemSettings
  onRefresh: () => void
}

export default function DiscordSettings({ settings, onRefresh }: Props) {
  const [url, setUrl] = useState(settings['discord_webhook_url'] ?? '')
  const [enabled, setEnabled] = useState(settings['discord_notify_enabled'] === 'true')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      await patchSetting('discord_webhook_url', url.trim())
      await patchSetting('discord_notify_enabled', String(enabled))
      setMsg('저장되었습니다.')
      onRefresh()
    } catch {
      setMsg('저장 실패.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={cardStyle}>
      <p style={titleStyle}>Discord 알림 설정</p>
      <label style={labelStyle}>Webhook URL</label>
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://discord.com/api/webhooks/..."
        style={inputStyle}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, marginBottom: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <div
            onClick={() => setEnabled(e => !e)}
            style={{
              width: 40, height: 22, borderRadius: 11,
              background: enabled ? '#3182f6' : 'rgba(255,255,255,0.15)',
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: enabled ? 20 : 3,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
            Discord 알림 {enabled ? '활성화' : '비활성화'}
          </span>
        </label>
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
  borderRadius: 14,
  padding: '20px',
  marginBottom: 16,
}
const titleStyle: React.CSSProperties = {
  fontSize: '0.88rem', fontWeight: 700, color: 'rgba(255,255,255,0.7)', marginBottom: 14,
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6,
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
