// 📅 월간 캘린더 네비게이션 훅
// 현재 보고 있는 연/월 상태 + 이전/다음 달 이동 함수 + 캘린더 날짜 배열(calendarDays) 제공
// 기존 MyScheduleTab에 인라인으로 있던 year/month/calendarDays 로직을 그대로 옮겼다.
import { useMemo, useState } from 'react'

export function useMonthNavigation() {
  // 현재 보고 있는 연/월 (기본: 이번 달)
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth()) // 0-indexed

  // ── 이번 달 캘린더 날짜 배열 계산 ──
  // 달력은 7열(일~토)이므로 앞쪽에 빈칸(null)을 먼저 채워 넣는다
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()  // 첫날 요일 (0=일)
    const daysInMonth = new Date(year, month + 1, 0).getDate()  // 이번 달 날짜 수
    const days: (number | null)[] = []

    // 앞쪽 빈칸
    for (let i = 0; i < firstDay; i++) days.push(null)
    // 실제 날짜
    for (let d = 1; d <= daysInMonth; d++) days.push(d)

    return days
  }, [year, month])

  // 이전 달로 이동 (1월이면 작년 12월로)
  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  // 다음 달로 이동 (12월이면 다음 해 1월로)
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  return { year, month, calendarDays, prevMonth, nextMonth }
}
