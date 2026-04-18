// 🗓️ 주간 뷰 (임시 플레이스홀더)
// 실제 주간 캘린더는 다음 커밋에서 구현 예정.
// 지금은 스위처에서 week 선택 시 "곧 출시됩니다" 안내만 표시한다.
import { CalendarClock } from 'lucide-react'

export default function WeekViewPlaceholder() {
  return (
    <div
      className="
        flex flex-col items-center justify-center
        gap-3 py-16
        bg-white
        rounded-[20px] border border-slate-100
        shadow-[0_4px_16px_rgba(49,130,246,0.04)]
        text-center
      "
    >
      {/* 큰 원형 아이콘 배경 — 빈 상태/준비중 UI에서 공통으로 쓰는 패턴 */}
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
        <CalendarClock className="w-8 h-8 text-blue-300" />
      </div>
      <p className="text-[15px] font-bold text-[#4e5968]">주간 뷰는 곧 출시됩니다</p>
      <p className="text-[12px] text-[#8b95a1] px-6">
        한 주를 한눈에 보는 스케줄 뷰를 준비 중이에요.
        <br />
        지금은 월간 또는 리스트 뷰를 이용해주세요.
      </p>
    </div>
  )
}
