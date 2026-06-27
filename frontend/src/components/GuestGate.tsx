// 게스트(비로그인) 사용자가 로그인 필요 기능에 접근할 때 보여주는 모달
// 사용법:
//   const { showGuestGate, openGuestGate, GuestGateModal } = useGuestGate()
//   <button onClick={openGuestGate}>PDF 업로드</button>
//   <GuestGateModal />

import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// ── 타입 정의 ──────────────────────────────────────────────────────────────────

interface GuestGateModalProps {
  isOpen: boolean
  onClose: () => void
  featureName?: string  // "PDF 업로드 분석" 등 기능명 표시용
}

// ── 모달 컴포넌트 ──────────────────────────────────────────────────────────────

export function GuestGateModal({ isOpen, onClose, featureName }: GuestGateModalProps) {
  const navigate = useNavigate()

  return createPortal(
    // portal로 body 렌더 → 페이지 루트의 z-[1] 스태킹 컨텍스트 탈출(BottomNav 위 표시)
    <AnimatePresence>
      {isOpen && (
        // 배경 딤 처리 — 클릭하면 닫힘. 모바일 하단은 BottomNav(64px) 높이만큼 여백 확보
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center px-4 pb-[88px] sm:pb-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* 반투명 배경 */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* 모달 카드 */}
          <motion.div
            className="relative w-full max-w-sm bg-white rounded-[24px] shadow-2xl p-6 z-10"
            initial={{ y: 60, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={e => e.stopPropagation()} // 카드 클릭 시 닫힘 방지
          >
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              aria-label="닫기"
            >
              <X size={16} />
            </button>

            {/* 아이콘 */}
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 mb-4">
              <LogIn className="w-7 h-7 text-[#3182F6]" />
            </div>

            {/* 제목 & 설명 */}
            <h2 className="text-[18px] font-bold text-[#191F28] mb-2">
              로그인이 필요해요
            </h2>
            <p className="text-[14px] text-[#6B7684] leading-relaxed mb-6">
              {featureName
                ? <><strong className="text-[#191F28]">{featureName}</strong>은</>
                : '이 기능은'
              }{' '}
              로그인한 회원만 이용할 수 있어요.
              <br />
              카카오 또는 Google 계정으로 1분 안에 가입할 수 있어요.
            </p>

            {/* 버튼 영역 */}
            <div className="flex flex-col gap-2">
              {/* 로그인 버튼 (강조) */}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full h-12 rounded-full bg-[#3182F6] text-white text-[14px] font-semibold hover:bg-[#1a6cdf] transition-colors"
              >
                로그인 / 회원가입
              </button>
              {/* 닫기 버튼 (약조) */}
              <button
                type="button"
                onClick={onClose}
                className="w-full h-12 rounded-full bg-[#F2F4F6] text-[#6B7684] text-[14px] font-medium hover:bg-[#E8EAED] transition-colors"
              >
                나중에 하기
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// ── 편의 훅 ───────────────────────────────────────────────────────────────────
// 사용법:
//   const { openGuestGate, GuestGateModal } = useGuestGate()
//   onClick: isLoggedIn ? doAction() : openGuestGate('PDF 업로드 분석')

export function useGuestGate() {
  const { isLoggedIn } = useAuth()
  const [gateOpen, setGateOpen] = useState(false)
  const [gateFeatureName, setGateFeatureName] = useState<string | undefined>()

  // 게이트를 열면서 기능명을 전달 — 로그인 상태면 false 반환
  const openGuestGate = useCallback((featureName?: string) => {
    setGateFeatureName(featureName)
    setGateOpen(true)
  }, [])

  // 로그인 여부 확인 후 로그인 상태면 fn 실행, 비로그인이면 게이트 오픈
  // 사용 예: const proceed = requireLogin(() => doSomething(), 'PDF 업로드 분석')
  const requireLogin = useCallback((fn: () => void, featureName?: string) => {
    if (isLoggedIn) {
      fn()
    } else {
      openGuestGate(featureName)
    }
  }, [isLoggedIn, openGuestGate])

  const Modal = useCallback(() => (
    <GuestGateModal
      isOpen={gateOpen}
      onClose={() => setGateOpen(false)}
      featureName={gateFeatureName}
    />
  ), [gateOpen, gateFeatureName])

  return {
    gateOpen,
    openGuestGate,
    requireLogin,
    closeGuestGate: () => setGateOpen(false),
    GuestGateModal: Modal, // JSX 컴포넌트로 바로 사용: <GuestGateModal />
  }
}
