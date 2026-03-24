import { useEffect, useState } from 'react'
import { getSettings, getBlockedIps } from '../../../lib/api'
import type { SystemSettings, BlockedIp } from '../../../types/admin'
import DiscordSettings from '../settings/DiscordSettings'
import CmsSettings from '../settings/CmsSettings'
import LegalVariables from '../settings/LegalVariables'
import IpBlockManager from '../settings/IpBlockManager'

export default function SettingsMenu() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [ips, setIps] = useState<BlockedIp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = async () => {
    try {
      const res = await getSettings()
      setSettings(res.settings ?? {})
    } catch (e: unknown) {
      throw e
    }
  }

  const loadIps = async () => {
    try {
      const res = await getBlockedIps()
      setIps(res.blocked_ips ?? [])
    } catch {
      // silent — ip 목록은 optional
    }
  }

  const reload = async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadSettings(), loadIps()])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.88rem' }}>설정 로딩 중...</div>
  }

  if (error || !settings) {
    return (
      <div style={{ padding: '40px' }}>
        <div style={{ background: 'rgba(240,68,82,0.12)', border: '1px solid rgba(240,68,82,0.3)', borderRadius: 12, padding: '24px', color: '#ff6b6b' }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>⚠️ 설정 로드 실패</div>
          <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>{error || '데이터를 불러오지 못했습니다.'}</div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.45)' }}>
            Render: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>ADMIN_SECRET</code> &amp; <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 6px', borderRadius: 4 }}>SUPABASE_SERVICE_ROLE_KEY</code> 확인
          </div>
          <button onClick={reload} style={{ marginTop: 14, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#3182f6', color: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700 }}>재시도</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 24px)' }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', margin: 0 }}>Settings</h2>
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>운영 제어 · Discord · CMS · 법정 변수 · IP 보안</p>
      </div>

      <div style={{ maxWidth: 680 }}>
        <DiscordSettings settings={settings} onRefresh={loadSettings} />
        <CmsSettings settings={settings} onRefresh={loadSettings} />
        <LegalVariables settings={settings} onRefresh={loadSettings} />
        <IpBlockManager ips={ips} onRefresh={loadIps} />
      </div>
    </div>
  )
}
