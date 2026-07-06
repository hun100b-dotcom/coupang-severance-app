import { useEffect, useState } from 'react'
import { UP, RADIUS, btnPrimary } from '../shared/adminTheme'
import { getLegalVariables, patchLegalVariable, adminErrorMessage } from '../../../lib/api'
import type { LegalVariable } from '../../../lib/api'
import { supabase } from '../../../lib/supabase'

// 법정 변수 관리 — legal_variables 테이블(계산기 실소비 값) 직접 편집
//
// ⚠️ 2026-07-04 연동 전수조사에서 발견된 미연동 수리:
//   과거 이 위젯은 system_settings의 minimum_wage_* 키에 저장했지만,
//   4개 계산기(퇴직금/실업급여/주휴/연차)는 legal_variables 테이블
//   (key + effective_year)을 읽는다 → 어드민이 값을 바꿔도 계산기에
//   전혀 반영되지 않는 "죽은 위젯"이었다.
//   이제 백엔드 /admin/legal-variables (service-role) 경유로 실소비
//   테이블을 직접 편집한다. 저장 성공 시 사용자 계산기에는 최대 5분
//   (프론트 legalVariables.ts 캐시 TTL) 안에 반영된다.

// key별 한국어 설명 (label 컬럼이 비어있을 때의 폴백)
const KEY_LABEL: Record<string, string> = {
  min_hourly_wage: '법정 최저 시급',
  unemployment_max_daily: '실업급여 1일 상한액',
}

export default function LegalVariables() {
  const [vars, setVars] = useState<LegalVariable[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // 행별 편집값 (id → 입력 문자열)
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [adminEmail, setAdminEmail] = useState('')

  // 감사기록용 현재 관리자 이메일 (실패해도 저장 자체는 진행)
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => setAdminEmail(data.user?.email ?? ''))
  }, [])

  const load = async () => {
    setLoading(true); setError('')
    try {
      const data = await getLegalVariables()
      setVars(data.variables)
      setEdits(Object.fromEntries(data.variables.map(v => [v.id, String(v.value)])))
    } catch (e) {
      setError(adminErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const save = async (v: LegalVariable) => {
    const raw = (edits[v.id] ?? '').trim()
    const num = Number(raw)
    if (!raw || !Number.isFinite(num) || num <= 0) {
      setMsg({ text: '올바른 숫자(원)를 입력해주세요.', ok: false })
      return
    }
    setSavingId(v.id); setMsg(null)
    try {
      await patchLegalVariable(v.key, v.effective_year, num, adminEmail)
      setMsg({ text: `✅ ${v.effective_year}년 ${KEY_LABEL[v.key] ?? v.key} 저장 완료 — 계산기에 최대 5분 내 반영됩니다.`, ok: true })
      await load()  // 저장 후 재조회로 화면-DB 동기화 (거짓 성공 방지)
    } catch (e) {
      setMsg({ text: `❌ 저장 실패: ${adminErrorMessage(e)}`, ok: false })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div style={cardStyle}>
      <p style={titleStyle}>법정 변수 관리</p>
      <p className="text-a11" style={{ color: UP.sub, marginBottom: 14, marginTop: -8 }}>
        계산기(퇴직금·실업급여·주휴·연차)가 실제로 읽는 값입니다. 저장 즉시 DB 반영, 사용자 화면엔 최대 5분 내 적용.
      </p>

      {loading && <p className="text-a12" style={{ color: UP.sub }}>불러오는 중...</p>}

      {!loading && error && (
        <div>
          <p className="text-a12" style={{ color: UP.danger, marginBottom: 8 }}>{error}</p>
          <button onClick={load} style={{ ...btnPrimary, padding: '6px 14px' }}>다시 시도</button>
        </div>
      )}

      {!loading && !error && vars.length === 0 && (
        <p className="text-a12" style={{ color: UP.sub }}>등록된 법정 변수가 없습니다.</p>
      )}

      {!loading && !error && vars.map(v => (
        <div key={v.id} style={{ marginBottom: 14 }}>
          <label style={labelStyle}>
            {v.label || `${v.effective_year}년 ${KEY_LABEL[v.key] ?? v.key}`}
            {v.unit ? ` (${v.unit})` : ''} — {v.effective_year}년 적용
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              value={edits[v.id] ?? ''}
              onChange={e => setEdits(prev => ({ ...prev, [v.id]: e.target.value }))}
              style={{ ...inputStyle, flex: 1 }}
            />
            <button
              onClick={() => save(v)}
              disabled={savingId !== null}
              style={{
                ...btnPrimary, padding: '8px 16px', whiteSpace: 'nowrap',
                opacity: savingId !== null && savingId !== v.id ? 0.5 : 1,
              }}
            >
              {savingId === v.id ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      ))}

      {msg && (
        <p className="text-a12" style={{ color: msg.ok ? UP.green : UP.danger, marginTop: 8 }}>
          {msg.text}
        </p>
      )}
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: UP.sunken,
  border: `1px solid ${UP.hair}`,
  borderRadius: RADIUS.card, padding: '20px', marginBottom: 16,
}
const titleStyle: React.CSSProperties = {
  fontSize: 14, fontWeight: 700, color: UP.body, marginBottom: 6,
}
const labelStyle: React.CSSProperties = {
  fontSize: 12, color: UP.sub, display: 'block', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', background: UP.sunken, border: `1px solid ${UP.hair}`,
  borderRadius: 8, padding: '8px 12px', fontSize: 13, color: UP.navy,
  outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
}
