/**
 * CATCH PRO - 전문가(노무사) 매칭 및 결제 안내 페이지
 * - 배너에서 "전문가 매칭 및 결제" 클릭 시 이동
 * - 결제 버튼 클릭 시 임시 알림창 표시
 */

import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function PaymentGuide() {
  const navigate = useNavigate()

  const handlePaymentClick = () => {
    window.alert('결제 기능은 준비 중입니다. 곧 만나요!')
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] pb-8 relative z-10">
      <header className="sticky top-0 z-30 bg-[#F2F4F6]/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[460px] mx-auto px-4 h-14 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 text-[#4E5968]"
            aria-label="뒤로"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-[#191F28]">CATCH PRO</h1>
        </div>
      </header>

      <div className="max-w-[460px] mx-auto px-4 pt-4">
        <div className="rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-gray-100/50 overflow-hidden bg-gradient-to-br from-[#1c1c1e] via-[#2c2c2e] to-[#1c1c1e] p-6">
          <p className="text-[#E5D88A] text-xs font-bold mb-2">★ CATCH PRO</p>
          <p className="text-white font-bold text-lg mb-1">퇴직금 청구, 막막하신가요?</p>
          <p className="text-white/90 text-sm mb-2">전문 노무사가 도와드립니다.</p>
          <p className="text-white/70 text-sm mb-4">서류 준비부터 진정 접수까지 한 번에</p>
          <p className="text-[#E5D88A] font-bold text-lg mb-4">월 2,900원</p>
          <button
            type="button"
            onClick={handlePaymentClick}
            className="w-full py-3 rounded-xl bg-[#3182F6] text-white font-semibold text-sm hover:bg-blue-600"
          >
            결제하기
          </button>
        </div>
      </div>
    </div>
  )
}
