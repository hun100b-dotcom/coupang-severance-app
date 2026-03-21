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

  const loadSettings = async () => {
    try {
      const res = await getSettings()
      setSettings(res.settings ?? {})
    } catch {
      // silent
    }
  }

  const loadIps = async () => {
    try {
      const res = await getBlockedIps()
      setIps(res.blocked_ips ?? [])
    } catch {
      // silent
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([loadSettings(), loadIps()])
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !settings) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.88rem' }}>설정 로딩 중...</div>
  }

  return (
    <div style={{ padding: '24px' }}>
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
