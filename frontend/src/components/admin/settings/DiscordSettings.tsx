import { useState } from 'react'
import type { SystemSettings } from '../../../types/admin'
import { UP, RADIUS, btnPrimary, btnSecondary } from '../shared/adminTheme'
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
              background: enabled ? UP.brand : UP.caption,
              position: 'relative', cursor: 'pointer', transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute', top: 3, left: enabled ? 20 : 3,
              width: 16, height: 16, borderRadius: '50%',
              background: '#fff', transition: 'left 0.2s',
            }} />
          </div>
          <span style={{ fontSize: '0.85rem', color: UP.body }}>
            Discord 알림 {enabled ? '활성화' : '비활성화'}
          </span>
        </label>
      </div>
      {/* 저장 + 테스트 버튼 나란히 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={save} disabled={saving} style={btnPrimary}>
          {saving ? '저장 중...' : '설정 저장'}
        </button>
        {/* 테스트 버튼: 보조 버튼(btnSecondary) 베이스 + 디스코드 보라색 강조 유지 */}
        <button onClick={testWebhook} disabled={testing || !url.trim()} style={{
          ...btnSecondary,
          background: url.trim() ? '#5865F2' : UP.hairSoft,  // 디스코드 보라색
          color: url.trim() ? '#fff' : UP.sub,
          border: 'none',
          opacity: url.trim() ? 1 : 0.5,
        }}>
          {testing ? '발송 중...' : '📡 테스트 알림'}
        </button>
      </div>
      {/* 설정 안내 메시지 */}
      <p style={{ fontSize: '0.72rem', color: UP.caption, marginTop: 10, lineHeight: 1.7 }}>
        저장된 URL은 <strong style={{ color: UP.sub }}>문의 접수 시 실제 알림</strong>에 사용됩니다.
        (백엔드 FastAPI + Supabase Edge Function 양쪽 모두 이 값을 우선 조회)<br />
        📡 테스트 버튼은 Edge Function 경로로 즉시 발송합니다.<br />
        Render 환경변수 <code style={{ color: UP.strong }}>DISCORD_WEBHOOK_URL</code>이 설정된 경우
        이 값이 없을 때 폴백으로 사용됩니다.
      </p>
      {msg && (
        <p style={{
          fontSize: '0.78rem',
          color: msg.startsWith('✅') ? UP.green : msg.startsWith('⚠️') ? UP.amber : UP.danger,
          marginTop: 8,
        }}>{msg}</p>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: UP.sunken,
  border: `1px solid ${UP.hair}`,
  borderRadius: RADIUS.card,
  padding: '20px',
  marginBottom: 16,
}
const titleStyle: React.CSSProperties = {
  fontSize: '0.88rem', fontWeight: 700, color: UP.body, marginBottom: 14,
}
const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem', color: UP.sub, display: 'block', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: UP.sunken, border: `1px solid ${UP.hair}`,
  borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem', color: UP.navy,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
