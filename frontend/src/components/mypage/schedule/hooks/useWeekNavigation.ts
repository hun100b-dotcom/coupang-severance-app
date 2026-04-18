// 🗓️ 주간 뷰 네비게이션 훅
// 현재 보고 있는 주의 "시작일(일요일 자정)" 상태 + 이전/다음/이번주 이동 함수 제공.
// 주의 시작을 일요일로 고정한 이유: 한국 달력 관습(캘린더 UI 첫 칼럼이 일요일)과
// MonthView 요일 헤더(WEEKDAYS = ['일', '월', ...])와 정렬 일관성을 맞추기 위함.
import { useCallback, useMemo, useState } from 'react'

// ── 입력 Date 를 해당 주의 일요일 자정으로 정규화 ──
// 예: 2026-04-22(수) 오후 → 2026-04-19(일) 00:00:00
// (getDay(): 0=일,1=월,...,6=토)
function toWeekStart(input: Date): Date {
  const d = new Date(input.getFullYear(), input.getMonth(), input.getDate())
  const day = d.getDay() // 0~6
  d.setDate(d.getDate() - day) // 일요일로 되감기
  return d
}

// ── 두 날짜가 같은 날(연/월/일)인지 비교 ──
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// ── weekStart 기준으로 일~토 7일 Date 배열 생성 ──
// 시간축과 함께 쓸 때는 각 날짜에 "해당 날의 자정"이 들어있는 게 편리
export function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    days.push(d)
  }
  return days
}

export function useWeekNavigation(initialDate?: Date) {
  // 초기값: 전달된 날짜(없으면 오늘)가 속한 주의 일요일
  const [weekStart, setWeekStart] = useState<Date>(() =>
    toWeekStart(initialDate ?? new Date()),
  )

  // 주의 마지막 날(토요일)
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + 6)
    return d
  }, [weekStart])

  // 일~토 7일 배열 (각 뷰에서 그리드 컬럼 렌더에 사용)
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

  // 이전 주로 이동
  const prevWeek = useCallback(() => {
    setWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(prev.getDate() - 7)
      return d
    })
  }, [])

  // 다음 주로 이동
  const nextWeek = useCallback(() => {
    setWeekStart(prev => {
      const d = new Date(prev)
      d.setDate(prev.getDate() + 7)
      return d
    })
  }, [])

  // "이번 주로 이동" — 오늘이 속한 주의 일요일
  const thisWeek = useCallback(() => {
    setWeekStart(toWeekStart(new Date()))
  }, [])

  return { weekStart, weekEnd, weekDays, prevWeek, nextWeek, thisWeek }
}
