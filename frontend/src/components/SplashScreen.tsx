// 앱 최초 접속 시 표시되는 스플래시 로딩 화면입니다.
// 2초 동안 CATCH 로고와 프로그레스 바를 보여주고, onComplete 콜백을 호출합니다.
import { useState, useEffect } from 'react'

interface SplashScreenProps {
  onComplete: () => void
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  // 페이드 아웃 시작 여부 (1800ms 후 true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    // 1800ms 후 페이드 아웃 시작
    const fadeTimer = setTimeout(() => setFading(true), 1800)
    // 2300ms 후 완전히 사라지고 onComplete 호출
    const doneTimer = setTimeout(() => onComplete(), 2300)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(doneTimer)
    }
  }, [onComplete])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'linear-gradient(135deg, #f0f7ff 0%, #eaf2fe 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* CATCH 로고 텍스트 */}
      <div
        style={{
          fontSize: '3.5rem',
          fontWeight: 900,
          color: '#0f172a',
          letterSpacing: '-0.03em',
          fontFamily: 'Pretendard, sans-serif',
        }}
      >
        CATCH
      </div>

      {/* 슬로건 */}
      <div
        style={{
          fontSize: '1rem',
          color: '#2563eb',
          fontWeight: 600,
          marginTop: '8px',
          marginBottom: '40px',
          fontFamily: 'Pretendard, sans-serif',
        }}
      >
        일용직 근로의 동반자
      </div>

      {/* 프로그레스 바 */}
      <div
        style={{
          width: '160px',
          height: '3px',
          background: 'rgba(37, 99, 235, 0.15)',
          borderRadius: '999px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
            borderRadius: '999px',
            animation: 'catchProgress 1.8s ease-in-out forwards',
          }}
        />
      </div>

      {/* 프로그레스 바 애니메이션 키프레임 정의 */}
      <style>{`
        @keyframes catchProgress {
          from { width: 0%; }
          to   { width: 100%; }
        }
      `}</style>
    </div>
  )
}
