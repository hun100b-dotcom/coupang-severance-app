/**
 * CATCH PRO - 전문가(노무사) 매칭 및 결제 안내 페이지
 * - 배너에서 "전문가 매칭 및 결제" 클릭 시 이동
 * - 결제 버튼 클릭 시 임시 알림창 표시
 * - 2026 리디자인: 골드(비팔레트)→온팔레트(다크 프리미엄 + 연한 브랜드 블루 액센트), 토큰·반응형
 */

import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import Container from '../components/ui/Container'

export default function PaymentGuide() {
  const navigate = useNavigate()

  const handlePaymentClick = () => {
    window.alert('결제 기능은 준비 중입니다. 곧 만나요!')
  }

  return (
    <div className="relative z-[1] min-h-screen pb-8">
      {/* 헤더 — TopNav 아래 sticky */}
      <header className="sticky top-14 z-40 bg-page border-b border-line">
        <Container size="narrow" className="h-12 flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-11 h-11 -ml-2 rounded-md text-ink-700 hover:bg-[#F2F4F6] transition-colors"
            aria-label="뒤로"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[17px] font-extrabold text-ink-900">CATCH PRO</h1>
        </Container>
      </header>

      <Container size="narrow" className="pt-4">
        {/* 프리미엄 카드 — 다크(중립) + 연한 브랜드 블루 액센트 */}
        <div className="rounded-xl shadow-float border border-ink-800 overflow-hidden bg-gradient-to-br from-[#1c1c1e] via-[#2c2c2e] to-[#1c1c1e] p-6">
          <p className="text-brand-200 text-xs font-bold mb-2 tracking-wide">★ CATCH PRO</p>
          <p className="text-white font-bold text-[18px] mb-1 break-keep">퇴직금 청구, 막막하신가요?</p>
          <p className="text-white/90 text-sm mb-2 break-keep">전문 노무사가 도와드립니다.</p>
          <p className="text-white/70 text-sm mb-4 break-keep">서류 준비부터 진정 접수까지 한 번에</p>
          <p className="text-brand-200 font-black text-[20px] mb-4 tabular-nums">월 2,900원</p>
          <button
            type="button"
            onClick={handlePaymentClick}
            className="w-full min-h-[48px] rounded-md bg-brand-strong text-white font-bold text-[15px] hover:bg-brand-700 transition-colors active:scale-[0.98]"
          >
            결제하기
          </button>
        </div>
      </Container>
    </div>
  )
}
