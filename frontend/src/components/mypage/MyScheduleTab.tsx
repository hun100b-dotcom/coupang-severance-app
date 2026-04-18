// 📅 스케줄 탭 — 출근 일정 (월간 / 주간 / 리스트 3가지 뷰)
// 훅으로 데이터/월 이동을 관리하고, 상단 스위처 선택에 따라 하위 뷰를 바꿔 렌더한다.
// UI 세부 구현은 schedule/ 폴더로 분리되어 있으며, 이 파일은 조립만 담당한다.
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  useScheduleData,
  useMonthNavigation,
  TotalStatsStrip,
  MonthView,
  MonthStats,
  ViewSwitcher,
  ListView,
  WeekViewPlaceholder,
} from './schedule'
import type { ViewKey } from './schedule'

interface Props {
  userId: string
}

export default function MyScheduleTab({ userId }: Props) {
  // 지원 내역 로드 (loading 스피너용 플래그 포함)
  const { applications, loading } = useScheduleData(userId)

  // 월간 캘린더 네비게이션 (연/월 + 이전/다음)
  const { year, month, prevMonth, nextMonth } = useMonthNavigation()

  // ── 현재 뷰 상태 ──
  // 기본값 'month' (기존 동작 유지). 스위처를 통해 week/list 로 전환.
  const [view, setView] = useState<ViewKey>('month')

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
      {/* 누적 통계 카드 3개 (모든 뷰 공통 상단) */}
      <TotalStatsStrip applications={applications} />

      {/* 뷰 스위처: 월간 / 주간 / 리스트 */}
      <ViewSwitcher value={view} onChange={setView} />

      {/* 선택한 뷰 렌더링 */}
      {view === 'month' && (
        <MonthView
          applications={applications}
          year={year}
          month={month}
          onPrevMonth={prevMonth}
          onNextMonth={nextMonth}
        />
      )}
      {view === 'week' && <WeekViewPlaceholder />}
      {view === 'list' && <ListView applications={applications} />}

      {/* 이번 달 통계 (모든 뷰 공통 하단) */}
      <MonthStats applications={applications} year={year} month={month} />
    </div>
  )
}
