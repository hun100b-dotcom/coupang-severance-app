import { useState } from 'react'
import type { SystemSettings } from '../../../types/admin'
import { patchSetting } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'

interface Props {
  settings: SystemSettings
  onRefresh: () => void
}

export default function DiscordSettings({ settings, onRefresh }: Props) {
  const [url, setUrl] = useState(settings['discord_webhook_url'] ?? '')
  const [enabled, setEnabled] = useState(settings['discord_notify_enabled'] === 'true')
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      await patchSetting('discord_webhook_url', url.trim())
      await patchSetting('discord_notify_enabled', String(enabled))
      setMsg('✅ 저장되었습니다. 문의 접수 시 Discord로 알림이 발송됩니다.')
      onRefresh()
    } catch {
      setMsg('❌ 저장 실패.')
    } finally {
      setSaving(false)
    }
  }

  // 웹훅 테스트: 저장된 URL로 테스트 메시지 발송
  const testWebhook = async () => {
    if (!url.trim()) {
      setMsg('⚠️ Webhook URL을 먼저 입력하세요.')
      return
    }
    setTesting(true); setMsg('')
    try {
      // notify-inquiry 엣지 함수에 테스트 메시지 발송 요청
      const { error } = await supabase!.functions.invoke('notify-inquiry', {
        body: {
          message:   '이것은 CATCH 어드민에서 보낸 테스트 알림입니다.',
          category:  '테스트',
          userEmail: 'admin-test@catch.kr',
          createdAt: new Date().toISOString(),
        },
      })
      if (error) throw error
      setMsg('✅ 테스트 알림을 발송했습니다. Discord 채널을 확인하세요.')
    } catch (e) {
      setMsg(`❌ 테스트 실패: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setTesting(false)
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
      {/* 저장 + 테스트 버튼 나란히 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={save} disabled={saving} style={btnStyle}>
          {saving ? '저장 중...' : '설정 저장'}
        </button>
        <button onClick={testWebhook} disabled={testing || !url.trim()} style={{
          ...btnStyle,
          background: url.trim() ? '#5865F2' : 'rgba(255,255,255,0.1)',  // 디스코드 보라색
          opacity: url.trim() ? 1 : 0.5,
        }}>
          {testing ? '발송 중...' : '📡 테스트 알림'}
        </button>
      </div>
      {/* 설정 안내 메시지 */}
      <p style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 10, lineHeight: 1.6 }}>
        저장된 URL은 문의 접수 시 자동으로 사용됩니다. Supabase Edge Function 환경변수
        (DISCORD_WEBHOOK_URL)가 설정되어 있으면 그쪽이 폴백으로 사용됩니다.
      </p>
      {msg && (
        <p style={{
          fontSize: '0.78rem',
          color: msg.startsWith('✅') ? '#4ade80' : msg.startsWith('⚠️') ? '#fbbf24' : '#f87171',
          marginTop: 8,
        }}>{msg}</p>
      )}
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
