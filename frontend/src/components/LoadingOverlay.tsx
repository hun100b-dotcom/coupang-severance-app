interface Props {
  message?: string
}

export default function LoadingOverlay({ message = '데이터를 분석 중이에요' }: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      {/* 원형 스피너 */}
      <div style={{ position: 'relative', width: 80, height: 80 }}>
        <div className="loading-ring" style={{ width: 80, height: 80, borderWidth: 5 }} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
          }}
        >
          💵
        </div>
      </div>

      {/* 텍스트 */}
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontSize: '1.25rem',
            fontWeight: 800,
            color: 'var(--toss-text)',
            letterSpacing: '-0.02em',
            marginBottom: 8,
          }}
        >
          {message}
        </p>
        <div className="loading-dots" style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}
