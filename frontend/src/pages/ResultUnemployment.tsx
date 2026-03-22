import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import { PrimaryButton, SecondaryButton } from '../components/Button'
import { UBResult } from '../lib/api'
import { fmt } from '../lib/constants'
import { supabase } from '../lib/supabase'
import type { UnemploymentPayload } from '../types/supabase'

interface Props {
  result: UBResult
  company: string
  onReset: () => void
}

type SaveState = 'idle' | 'saving' | 'saved' | 'login_required' | 'error'

export default function ResultUnemployment({ result, company, onReset }: Props) {
  const navigate = useNavigate()
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const { eligible_180, insured_days_in_18m, avg_daily_wage, daily_benefit, days, total_estimate, days_last_month } = result
  const eligible = eligible_180

  // ── 계산결과 저장 핸들러
  const handleSave = async () => {
    if (!supabase) { setSaveState('login_required'); return }
    setSaveState('saving')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setSaveState('login_required'); return }
      const payload: UnemploymentPayload = {
        type: 'unemployment',
        eligible: eligible_180,
        insured_days: insured_days_in_18m,
        avg_daily_wage: Math.round(avg_daily_wage),
        daily_benefit: Math.round(daily_benefit),
        benefit_days: days,
        total_estimate: Math.round(total_estimate),
      }
      const { error } = await supabase.from('reports').insert({
        user_id: user.id,
        title: '실업급여 계산 결과',
        company_name: company || null,
        payload,
      })
      setSaveState(error ? 'error' : 'saved')
    } catch {
      setSaveState('error')
    }
  }

  return (
    <div
      style={{
        position: 'relative', zIndex: 1,
        minHeight: '100vh',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px 48px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>
        {/* 헤더 */}
        <GlassCard className="p-8" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--toss-text-3)' }}>{company} · 실업급여</span>
            <span className={eligible ? 'badge-eligible' : 'badge-ineligible'}>
              {eligible ? '✓ 수급 가능' : '✗ 요건 미충족'}
            </span>
          </div>

          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
              <p className="label-sm">예상 실업급여 총액</p>
              {eligible && <span style={{ fontSize: '0.72rem', color: 'var(--toss-text-3)', fontWeight: 500 }}>세전</span>}
            </div>
            <p className="num-hero" style={{ color: eligible ? 'var(--toss-blue)' : '#cc2233' }}>
              {eligible ? fmt(Math.round(total_estimate)) : '수급 불가'}
            </p>
          </div>

          {!eligible && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(240,68,82,0.06)', borderRadius: 10, fontSize: '0.85rem', color: '#cc2233', fontWeight: 600 }}>
              최근 18개월 내 고용보험 가입일수가 {insured_days_in_18m}일로 180일 미만이에요.
            </div>
          )}
        </GlassCard>

        {/* 상세 내역 */}
        <GlassCard className="p-6" style={{ marginBottom: 16 }}>
          <h3 className="heading-md" style={{ marginBottom: 16 }}>상세 내역</h3>
          {[
            { label: '평균 일당 (세전)', value: fmt(Math.round(avg_daily_wage)) },
            { label: '실업급여 일당 약 60% (세전)', value: fmt(Math.round(daily_benefit)) },
            { label: '수급 가능 일수', value: `${days}일` },
            { label: '18개월 내 가입일수', value: `${insured_days_in_18m}일` },
            ...(days_last_month !== undefined ? [{ label: '최근 1개월 근로일수', value: `${days_last_month}일` }] : []),
          ].map(row => (
            <div key={row.label} className="stat-row">
              <span style={{ fontSize: '0.9rem', color: 'var(--toss-text-2)', fontWeight: 500 }}>{row.label}</span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--toss-text)' }}>{row.value}</span>
            </div>
          ))}
        </GlassCard>

        {/* 수급 기간 시각화 */}
        {eligible && days > 0 && (
          <GlassCard className="p-6" style={{ marginBottom: 16 }}>
            <h3 className="heading-md" style={{ marginBottom: 12 }}>📅 수급 기간</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div className="progress-bar-track" style={{ height: 12, borderRadius: 6 }}>
                  <div className="progress-bar-fill" style={{ width: `${Math.min((days / 270) * 100, 100)}%`, height: '100%', borderRadius: 6 }} />
                </div>
              </div>
              <span style={{ fontWeight: 800, color: 'var(--toss-blue)', fontFamily: "'Inter', sans-serif", fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
                {days}일
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--toss-text-3)' }}>
              하루 {fmt(Math.round(daily_benefit))}씩, 총 {days}일 동안 수급 가능해요.
            </p>
          </GlassCard>
        )}

        {/* 안내 */}
        <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.5)', borderRadius: 14, marginBottom: 20, fontSize: '0.82rem', color: 'var(--toss-text-3)', lineHeight: 1.6, backdropFilter: 'blur(10px)' }}>
          ℹ️ 이 결과는 참고용이에요. 정확한 실업급여는 고용센터에서 확인해 주세요.
        </div>

        {/* ── 저장 버튼 */}
        <div style={{
          background: saveState === 'saved' ? 'linear-gradient(135deg,#ecfdf5,#d1fae5)' : 'linear-gradient(135deg,#eff6ff,#dbeafe)',
          border: `1.5px solid ${saveState === 'saved' ? '#6ee7b7' : '#93c5fd'}`,
          borderRadius: 20, padding: '16px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          marginBottom: 10,
        }}>
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 800, color: saveState === 'saved' ? '#065f46' : '#1e3a5f', letterSpacing: '-0.01em' }}>
              {saveState === 'saved' ? '✅ 마이페이지에 저장됐어요' : '📌 계산결과 저장하기'}
            </p>
            <p style={{ fontSize: '0.72rem', color: saveState === 'saved' ? '#059669' : '#3b82f6', marginTop: 2 }}>
              {saveState === 'saved' ? '마이페이지에서 다시 확인하세요' :
               saveState === 'login_required' ? '로그인 후 저장할 수 있어요' :
               saveState === 'error' ? '저장 중 오류가 발생했어요. 다시 시도해 주세요' :
               '로그인 필요 · 마이페이지에서 다시 볼 수 있어요'}
            </p>
          </div>
          {saveState !== 'saved' && (
            <button type="button" disabled={saveState === 'saving'} onClick={handleSave}
              style={{
                flexShrink: 0, padding: '9px 16px', borderRadius: 14,
                background: saveState === 'saving' ? '#93c5fd' : '#3182f6',
                color: '#fff', fontSize: '0.82rem', fontWeight: 700, border: 'none',
                cursor: saveState === 'saving' ? 'not-allowed' : 'pointer',
              }}>
              {saveState === 'saving' ? '저장중...' :
               saveState === 'login_required' ? '로그인 필요' : '💾 저장하기'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryButton onClick={onReset}>다시 계산하기</PrimaryButton>
          <SecondaryButton onClick={() => navigate('/home')}>← 홈으로</SecondaryButton>
        </div>
      </div>
    </div>
  )
}
