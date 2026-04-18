// 📅 스케줄 탭 — 출근 일정 월간 캘린더 (컨테이너)
// 훅으로 데이터/월 이동을 관리하고, 3개 하위 컴포넌트를 조합해 렌더한다.
// UI 세부 구현은 schedule/ 폴더로 분리되어 있으며, 이 파일은 조립만 담당한다.
import { Loader2 } from 'lucide-react'
import {
  useScheduleData,
  useMonthNavigation,
  TotalStatsStrip,
  MonthView,
  MonthStats,
} from './schedule'

interface Props {
  userId: string
}

export default function MyScheduleTab({ userId }: Props) {
  // 지원 내역 로드 (loading 스피너용 플래그 포함)
  const { applications, loading } = useScheduleData(userId)

  // 월간 캘린더 네비게이션 (연/월 + 이전/다음)
  const { year, month, prevMonth, nextMonth } = useMonthNavigation()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#3182f6]" />
        <span className="ml-2 text-[13px] text-[#8b95a1]">불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 누적 통계 카드 3개 */}
      <TotalStatsStrip applications={applications} />

      {/* 월간 캘린더 + 선택 날짜 상세 */}
      <MonthView
        applications={applications}
        year={year}
        month={month}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
      />

      {/* 이번 달 통계 */}
      <MonthStats applications={applications} year={year} month={month} />
    </div>
  )
}
