/**
 * KakaoShareButton.tsx
 * 카카오톡 공유 버튼 공통 컴포넌트
 *
 * - 카카오 공식 브랜드 가이드라인 색상 사용 (#FEE500 / #3C1E1E)
 * - Framer Motion whileTap 클릭 피드백 적용
 * - onClick 핸들러는 useKakaoShare 훅에서 전달받아 사용
 */

import { motion } from 'framer-motion'

interface Props {
  /** 클릭 시 실행할 공유 함수 */
  onClick: () => void
  /** 버튼 레이블 텍스트 (기본값: "카카오톡 공유") */
  label?: string
  /** 추가 CSS 클래스 */
  className?: string
  /** 버튼 비활성화 여부 */
  disabled?: boolean
}

/**
 * 카카오 로고 SVG 아이콘 (공식 가이드라인 기반)
 * 카카오 브랜드 색상인 #3C1E1E로 렌더링
 */
function KakaoIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="#3C1E1E"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* 카카오톡 말풍선 형태 아이콘 */}
      <path
        d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.557 5.076 3.92 6.542l-1 3.658 4.28-2.834A11.73 11.73 0 0012 18.6c5.523 0 10-3.477 10-7.8S17.523 3 12 3z"
      />
    </svg>
  )
}

export default function KakaoShareButton({
  onClick,
  label = '카카오톡 공유',
  className = '',
  disabled = false,
}: Props) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      // 클릭 시 살짝 눌리는 햅틱 피드백 효과
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      whileHover={{ opacity: disabled ? 1 : 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={className}
      style={{
        // 카카오 공식 브랜드 가이드라인 색상
        backgroundColor: '#FEE500',
        color: '#3C1E1E',
        border: 'none',
        borderRadius: 16,
        padding: '13px 20px',
        fontSize: '0.92rem',
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        letterSpacing: '-0.01em',
        // 카카오 노란색 기반 그림자
        boxShadow: disabled ? 'none' : '0 4px 14px rgba(254, 229, 0, 0.35)',
      }}
      aria-label={`${label} 버튼`}
    >
      {/* 카카오 로고 아이콘 */}
      <KakaoIcon />
      {label}
    </motion.button>
  )
}
