import { useNavigate } from 'react-router-dom'
import GlassCard from '../components/GlassCard'
import { PrimaryButton, SecondaryButton } from '../components/Button'
import { UBResult } from '../lib/api'
import { fmt } from '../lib/constants'

interface Props {
  result: UBResult
  company: string
  onReset: () => void
}

export default function ResultUnemployment({ result, company, onReset }: Props) {
  const navigate = useNavigate()
  const { eligible_180, insured_days_in_18m, avg_daily_wage, daily_benefit, days, total_estimate, days_last_month } = result
  const eligible = eligible_180

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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PrimaryButton onClick={onReset}>다시 계산하기</PrimaryButton>
          <SecondaryButton onClick={() => navigate('/')}>← 홈으로</SecondaryButton>
        </div>
      </div>
    </div>
  )
}
