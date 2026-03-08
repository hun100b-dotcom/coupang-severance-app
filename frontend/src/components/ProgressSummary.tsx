interface Step {
  label: string
  done?: boolean
  current?: boolean
}

interface Props {
  steps: Step[]
  totalSteps?: number
  currentStep?: number
}

export default function ProgressSummary({ steps, totalSteps, currentStep }: Props) {
  const pct = totalSteps && currentStep ? (currentStep / totalSteps) * 100 : null

  return (
    <div style={{ marginBottom: 24 }}>
      {/* 진행바 */}
      {pct !== null && (
        <div className="progress-bar-track" style={{ marginBottom: 12 }}>
          <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
        </div>
      )}

      {/* 스텝 라벨 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          flexWrap: 'wrap',
          fontSize: '0.8rem',
          fontWeight: 600,
        }}
      >
        {steps.map((step, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {i > 0 && (
              <span style={{ color: 'rgba(120,130,150,0.5)', fontSize: '0.75rem' }}>›</span>
            )}
            <span
              style={{
                color: step.current
                  ? 'var(--toss-blue)'
                  : step.done
                  ? 'var(--toss-text-2)'
                  : 'rgba(150,160,175,0.7)',
                fontWeight: step.current ? 800 : step.done ? 600 : 500,
                padding: '2px 8px',
                borderRadius: 100,
                background: step.current ? 'rgba(49,130,246,0.1)' : 'transparent',
              }}
            >
              {step.label}
              {step.done && !step.current && ' ✓'}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
