import { useState } from 'react'
import type { BlockedIp } from '../../../types/admin'
import { UP } from '../shared/adminTheme'
import { blockIp, unblockIp } from '../../../lib/api'

interface Props {
  ips: BlockedIp[]
  onRefresh: () => void
}

function fmt(iso: string | null) {
  if (!iso) return '영구'
  return new Date(iso).toLocaleDateString('ko-KR')
}

export default function IpBlockManager({ ips, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [ipAddr, setIpAddr] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleBlock = async () => {
    if (!ipAddr.trim()) return
    setSaving(true); setError(null)
    try {
      await blockIp({ ip_address: ipAddr.trim(), reason: reason.trim() || null })
      setIpAddr(''); setReason(''); setShowForm(false)
      onRefresh()
    } catch (e: unknown) {
      // 과거에는 finally만 있어 실패가 조용히 묻혔다 → 이제 표시
      setError(e instanceof Error ? e.message : 'IP 차단에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleUnblock = async (id: string) => {
    if (!confirm('이 IP 차단을 해제하시겠습니까?')) return
    setError(null)
    try {
      await unblockIp(id)
      onRefresh()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'IP 차단 해제에 실패했습니다.')
    }
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ ...titleStyle, flex: 1 }}>IP 차단 관리 ({ips.length}개)</p>
        <button onClick={() => { setShowForm(f => !f); setError(null) }} style={btnStyle}>+ IP 차단</button>
      </div>

      {/* 에러 표시 (차단/해제 실패) */}
      {error && (
        <p style={{ fontSize: '0.78rem', color: UP.danger, marginBottom: 12, fontWeight: 600 }}>
          ⚠️ {error}
        </p>
      )}

      {showForm && (
        <div style={{ marginBottom: 14, padding: 14, background: 'rgba(240,68,82,0.06)', borderRadius: 10, border: '1px solid rgba(240,68,82,0.15)' }}>
          <input value={ipAddr} onChange={e => setIpAddr(e.target.value)} placeholder="IP 주소 (예: 1.2.3.4)" style={{ ...inputStyle, marginBottom: 8 }} />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="차단 사유 (선택)" style={inputStyle} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={handleBlock} disabled={saving} style={{ ...btnStyle, background: UP.danger }}>
              {saving ? '처리 중...' : '차단 적용'}
            </button>
            <button onClick={() => { setShowForm(false); setError(null) }} style={{ ...btnStyle, background: UP.hairSoft, color: UP.sub }}>취소</button>
          </div>
        </div>
      )}

      {ips.length === 0 && !showForm && (
        <p style={{ fontSize: '0.82rem', color: UP.sub, textAlign: 'center', padding: '16px 0' }}>
          차단된 IP가 없습니다.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ips.map(ip => (
          <div key={ip.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(240,68,82,0.05)', borderRadius: 8, border: '1px solid rgba(240,68,82,0.1)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: UP.danger, flex: 1 }}>{ip.ip_address}</span>
            <span style={{ fontSize: '0.75rem', color: UP.sub }}>{ip.reason ?? '사유 없음'}</span>
            <span style={{ fontSize: '0.72rem', color: UP.caption }}>~{fmt(ip.expires_at)}</span>
            <button onClick={() => handleUnblock(ip.id)} style={{ background: 'none', border: 'none', color: UP.sub, cursor: 'pointer', fontSize: '0.82rem' }}>
              해제
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: UP.sunken,
  border: `1px solid ${UP.hair}`,
  borderRadius: 14, padding: '20px', marginBottom: 16,
}
const titleStyle: React.CSSProperties = {
  fontSize: '0.88rem', fontWeight: 700, color: UP.body,
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: UP.sunken, border: `1px solid ${UP.hair}`,
  borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem', color: UP.navy,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
const btnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 8, border: 'none', background: UP.brand,
  color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
}
