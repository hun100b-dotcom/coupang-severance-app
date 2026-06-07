import { useState } from 'react'
import type { BlockedIp } from '../../../types/admin'
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

  const handleBlock = async () => {
    if (!ipAddr.trim()) return
    setSaving(true)
    try {
      await blockIp({ ip_address: ipAddr.trim(), reason: reason.trim() || null })
      setIpAddr(''); setReason(''); setShowForm(false)
      onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const handleUnblock = async (id: string) => {
    if (!confirm('이 IP 차단을 해제하시겠습니까?')) return
    await unblockIp(id)
    onRefresh()
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ ...titleStyle, flex: 1 }}>IP 차단 관리 ({ips.length}개)</p>
        <button onClick={() => setShowForm(f => !f)} style={btnStyle}>+ IP 차단</button>
      </div>

      {showForm && (
        <div style={{ marginBottom: 14, padding: 14, background: 'rgba(240,68,82,0.06)', borderRadius: 10, border: '1px solid rgba(240,68,82,0.15)' }}>
          <input value={ipAddr} onChange={e => setIpAddr(e.target.value)} placeholder="IP 주소 (예: 1.2.3.4)" style={{ ...inputStyle, marginBottom: 8 }} />
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="차단 사유 (선택)" style={inputStyle} />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={handleBlock} disabled={saving} style={{ ...btnStyle, background: '#cc2233' }}>
              {saving ? '처리 중...' : '차단 적용'}
            </button>
            <button onClick={() => setShowForm(false)} style={{ ...btnStyle, background: '#f1f5f9', color: '#64748b' }}>취소</button>
          </div>
        </div>
      )}

      {ips.length === 0 && !showForm && (
        <p style={{ fontSize: '0.82rem', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
          차단된 IP가 없습니다.
        </p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ips.map(ip => (
          <div key={ip.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(240,68,82,0.05)', borderRadius: 8, border: '1px solid rgba(240,68,82,0.1)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#cc2233', flex: 1 }}>{ip.ip_address}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{ip.reason ?? '사유 없음'}</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>~{fmt(ip.expires_at)}</span>
            <button onClick={() => handleUnblock(ip.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.82rem' }}>
              해제
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: 14, padding: '20px', marginBottom: 16,
}
const titleStyle: React.CSSProperties = {
  fontSize: '0.88rem', fontWeight: 700, color: '#475569',
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0',
  borderRadius: 8, padding: '8px 12px', fontSize: '0.85rem', color: '#0f172a',
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
const btnStyle: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 8, border: 'none', background: '#3182f6',
  color: '#fff', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
}
