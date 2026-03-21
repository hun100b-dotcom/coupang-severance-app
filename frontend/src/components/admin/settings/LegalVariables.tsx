import { useState } from 'react'
import type { SystemSettings } from '../../../types/admin'
import { patchSetting } from '../../../lib/api'

interface Props {
  settings: SystemSettings
  onRefresh: () => void
}

const VARS = [
  { key: 'minimum_wage_hourly', label: '법정 최저 시급 (원)', placeholder: '10030' },
  { key: 'minimum_wage_daily',  label: '법정 최저 일급 (원, 8시간 기준)', placeholder: '80240' },
]

export default function LegalVariables({ settings, onRefresh }: Props) {
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(VARS.map(v => [v.key, settings[v.key] ?? '']))
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      await Promise.all(VARS.map(v => patchSetting(v.key, vals[v.key])))
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
      <p style={titleStyle}>법정 변수 관리</p>
      {VARS.map(v => (
        <div key={v.key} style={{ marginBottom: 14 }}>
          <label style={labelStyle}>{v.label}</label>
          <input
            type="number"
            value={vals[v.key]}
            onChange={e => setVals(prev => ({ ...prev, [v.key]: e.target.value }))}
            placeholder={v.placeholder}
            style={inputStyle}
          />
        </div>
      ))}
      <button onClick={save} disabled={saving} style={btnStyle}>
        {saving ? '저장 중...' : '변수 저장'}
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
