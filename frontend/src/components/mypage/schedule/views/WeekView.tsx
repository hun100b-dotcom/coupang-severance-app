// 🗓️ 주간 뷰 — 시간축 세로 타임라인
// 기획서 §2-3, §5-2 스펙 구현:
//   - 세로축: 05:00 ~ 26:00 (21시간, 시간당 40px → 총 840px)
//   - 가로축: 일~토 7일
//   - 일정 블록: 시작-종료 시간을 세로 막대로 표시 (겹치면 너비 분할)
//   - 오늘 컬럼 배경 강조 + 현재 시각 빨간 가로선
//
// ⚠️ 주의 (step 3 한계)
//   - DB 에 work_start_time / work_end_time 이 아직 없다 (step 4 마이그레이션 예정).
//   - 따라서 이 단계에서는 모든 일정 블록을 "기본값 08:00~18:00" 으로 그린다.
//   - 야간 근무(예: 22:00~06:00) 분할 렌더링 코드는 "장래 스캐폴딩" 으로 포함하되
//     실제 데이터 검증은 step 5 이후에 한다 (TODO step 5 검증 주석 표기).
import { useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { JobApplication } from '../../../../types/supabase'
import { useWeekNavigation, isSameDay } from '../hooks/useWeekNavigation'

// ── 시간축 설정 ──
const HOUR_START = 5   // 05:00 부터 표시
const HOUR_END = 26    // 새벽 2시(26시)까지 표시 → 야간 근무 커버
const HOUR_HEIGHT = 40 // 1시간 = 40px
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * HOUR_HEIGHT // 21 * 40 = 840px

// ── 기본 출퇴근 시간 (step 3 임시값) ──
// step 4 마이그레이션 후에는 app.work_start_time / app.work_end_time 를 읽는다.
const DEFAULT_START_HOUR = 8
const DEFAULT_END_HOUR = 18

// ── 상태별 블록 스타일 ──
// 기획서 §2-3 + ListView 와 톤 맞춤 (취소는 회색+취소선)
const STATUS_STYLE: Record<JobApplication['status'], string> = {
  applied:   'bg-slate-100 border-slate-200 text-slate-700',
  reviewing: 'bg-amber-100 border-amber-200 text-amber-700',
  confirmed: 'bg-blue-100 border-blue-300 text-blue-800',
  completed: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  cancelled: 'bg-gray-50 border-gray-200 text-gray-400 line-through opacity-60',
  rejected:  'bg-red-50 border-red-200 text-red-500 opacity-70',
}

// ── 요일 라벨 (일~토) ──
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

// ── YYYY-MM-DD 문자열을 Date(자정) 로 파싱 ──
function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ── 내부 타입: 타임라인에 그릴 한 개의 블록 ──
// 야간 근무가 날짜를 넘길 경우 하나의 application 이 2개 블록(A: 전날말, B: 다음날시작)으로 나뉜다.
interface TimeBlock {
  id: string                  // React key (app.id + 분할 여부)
  app: JobApplication
  dayIndex: number            // 0=일 ~ 6=토 (주간 그리드 내 몇 번째 칼럼인가)
  startHour: number           // 블록 상단 시각 (HOUR_START 이상)
  endHour: number             // 블록 하단 시각 (HOUR_END 이하)
  isNightSplit: boolean       // 야간근무가 날짜 경계를 넘어 분할된 조각인지 여부
}

interface Props {
  applications: JobApplication[]
  initialDate?: Date
  // TimeBlock 클릭 시 상세 시트 열기 (step 5 — 선택)
  onApplicationClick?: (app: JobApplication) => void
}

export default function WeekView({ applications, initialDate, onApplicationClick }: Props) {
  const { weekStart, weekEnd, weekDays, prevWeek, nextWeek, thisWeek } =
    useWeekNavigation(initialDate)

  // ── 오늘 기준값 (현재 시각 선 + 오늘 컬럼 강조 용) ──
  const now = new Date()
  const todayIndexInWeek = weekDays.findIndex(d => isSameDay(d, now))
  // 현재 시각을 타임라인 y 좌표로 변환 (HOUR_START 이전이면 null)
  const nowY = useMemo(() => {
    const hour = now.getHours() + now.getMinutes() / 60
    if (hour < HOUR_START || hour > HOUR_END) return null
    return (hour - HOUR_START) * HOUR_HEIGHT
  }, [now])

  // ── 이번 주에 해당하는 일정을 TimeBlock 배열로 변환 ──
  const blocks = useMemo<TimeBlock[]>(() => {
    const result: TimeBlock[] = []

    for (const app of applications) {
      if (!app.work_date) continue
      const workDate = parseYMD(app.work_date.slice(0, 10))

      // 주 범위 밖이면 스킵 (하지만 야간근무는 전날에서 넘어올 수 있어 하루 버퍼를 둔다)
      const prevDay = new Date(weekStart)
      prevDay.setDate(weekStart.getDate() - 1)
      if (workDate < prevDay || workDate > weekEnd) continue

      // step 4 이후: const startHour = app.work_start_time ? parseTime(app.work_start_time) : DEFAULT_START_HOUR
      const startHour = DEFAULT_START_HOUR
      const endHour = DEFAULT_END_HOUR

      // 이 일정이 주 그리드에서 몇 번째 칼럼인지 찾기 (-1 이면 범위 밖)
      const dayIndex = weekDays.findIndex(d => isSameDay(d, workDate))

      if (startHour < endHour) {
        // ── 일반 케이스: 같은 날 안에서 시작-종료 ──
        if (dayIndex === -1) continue
        result.push({
          id: app.id,
          app,
          dayIndex,
          startHour: Math.max(startHour, HOUR_START),
          endHour: Math.min(endHour, HOUR_END),
          isNightSplit: false,
        })
      } else {
        // ── 야간 근무: 날짜 경계 분할 ──
        // TODO step 5 검증: DB 에 work_start_time / work_end_time 이 들어간 뒤
        // 실제 야간 데이터(예: 22~06)로 시각적 분할을 검증해야 한다.
        // 블록 A: 시작일 startHour → HOUR_END (26시, 즉 새벽 2시)
        if (dayIndex !== -1) {
          result.push({
            id: `${app.id}__A`,
            app,
            dayIndex,
            startHour: Math.max(startHour, HOUR_START),
            endHour: HOUR_END,
            isNightSplit: true,
          })
        }
        // 블록 B: 다음날 HOUR_START → endHour+24 (예: 06시 → 30시지만 HOUR_END로 캡)
        const nextDayIndex = dayIndex + 1
        if (nextDayIndex >= 0 && nextDayIndex <= 6) {
          // 다음날이 주 범위 안일 때만 B 블록 그림
          const bEnd = endHour + 24 // 6 + 24 = 30
          result.push({
            id: `${app.id}__B`,
            app,
            dayIndex: nextDayIndex,
            startHour: HOUR_START,
            endHour: Math.min(bEnd, HOUR_END),
            isNightSplit: true,
          })
        }
      }
    }

    return result
  }, [applications, weekDays, weekStart, weekEnd])

  // ── 같은 날짜에 겹치는 블록은 가로 너비를 분할 ──
  // (dayIndex 별로 그룹핑 후 인덱스/총개수를 부여)
  const blocksByDay = useMemo(() => {
    const map: Record<number, TimeBlock[]> = {}
    for (const b of blocks) {
      if (!map[b.dayIndex]) map[b.dayIndex] = []
      map[b.dayIndex].push(b)
    }
    return map
  }, [blocks])

  // ── 헤더에 표시할 주 라벨 ──
  // 예: "2026년 4월 19일 ~ 4월 25일"
  const weekLabel = useMemo(() => {
    const y = weekStart.getFullYear()
    const m1 = weekStart.getMonth() + 1
    const d1 = weekStart.getDate()
    const m2 = weekEnd.getMonth() + 1
    const d2 = weekEnd.getDate()
    return `${y}년 ${m1}월 ${d1}일 ~ ${m2}월 ${d2}일`
  }, [weekStart, weekEnd])

  return (
    <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_16px_rgba(49,130,246,0.04)] overflow-hidden">
      {/* ── 헤더: 이전/다음 주 + 주 라벨 + 이번주 이동 ── */}
      <div className="flex items-center justify-between gap-2 px-3 py-3 border-b border-slate-100">
        <button
          onClick={prevWeek}
          className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
          aria-label="이전 주"
        >
          <ChevronLeft className="w-4 h-4 text-[#4e5968]" />
        </button>
        <p className="text-[13px] font-extrabold text-[#191f28] text-center flex-1 min-w-0 truncate">
          {weekLabel}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={thisWeek}
            className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors text-[11px] font-bold text-[#3182f6]"
          >
            이번 주
          </button>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
            aria-label="다음 주"
          >
            <ChevronRight className="w-4 h-4 text-[#4e5968]" />
          </button>
        </div>
      </div>

      {/* ── 요일 헤더 (일~토) + 시간축 플레이스홀더 40px ── */}
      {/* grid-template-columns: 40px repeat(7, 1fr) — 첫 칼럼은 시간 라벨 폭 */}
      <div
        className="grid border-b border-slate-100 bg-slate-50/50"
        style={{ gridTemplateColumns: '40px repeat(7, minmax(0, 1fr))' }}
      >
        <div />
        {weekDays.map((d, i) => {
          const isToday = isSameDay(d, now)
          return (
            <div
              key={i}
              className={`
                text-center py-2
                ${isToday ? 'bg-blue-50/40' : ''}
              `}
            >
              <div
                className={`text-[10px] font-bold ${
                  i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-[#8b95a1]'
                }`}
              >
                {WEEKDAY_LABELS[i]}
              </div>
              <div
                className={`
                  text-[13px] font-extrabold mt-0.5
                  ${isToday ? 'text-[#3182f6]' : 'text-[#191f28]'}
                `}
              >
                {d.getDate()}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── 타임라인 본체 ── */}
      {/* 스크롤은 부모(탭 컨텐츠)에 맡기고 내부는 정적 높이로 그린다 */}
      <div
        className="grid relative"
        style={{
          gridTemplateColumns: '40px repeat(7, minmax(0, 1fr))',
          height: `${TOTAL_HEIGHT}px`,
        }}
      >
        {/* 1) 시간 라벨 칼럼 (좌측 40px) */}
        <div className="relative border-r border-slate-100">
          {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => {
            const hour = HOUR_START + i
            // 25, 26 은 "01", "02" 로 표시 (다음날 새벽)
            const label = hour >= 24 ? String(hour - 24).padStart(2, '0') : String(hour).padStart(2, '0')
            return (
              <div
                key={hour}
                className="absolute left-0 right-0 text-[9px] text-[#8b95a1] pr-1 text-right"
                style={{ top: `${i * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
              >
                {label}
              </div>
            )
          })}
        </div>

        {/* 2) 요일 칼럼 7개 */}
        {weekDays.map((d, dayIndex) => {
          const isToday = isSameDay(d, now)
          const dayBlocks = blocksByDay[dayIndex] ?? []

          // 3개 이상 겹치면 처음 2개만 너비 분할로 그리고 나머지는 "+N" 뱃지
          const visibleBlocks = dayBlocks.slice(0, 2)
          const overflowCount = Math.max(0, dayBlocks.length - 2)
          const splitCount = visibleBlocks.length // 1 또는 2

          return (
            <div
              key={dayIndex}
              className={`
                relative border-r border-slate-100 last:border-r-0
                ${isToday ? 'bg-blue-50/30' : ''}
              `}
            >
              {/* 시간당 가로 점선 */}
              {Array.from({ length: HOUR_END - HOUR_START }).map((_, i) => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-dashed border-slate-100"
                  style={{ top: `${i * HOUR_HEIGHT}px` }}
                />
              ))}

              {/* 일정 블록 */}
              {visibleBlocks.map((b, idx) => {
                const top = (b.startHour - HOUR_START) * HOUR_HEIGHT
                const height = Math.max(
                  20,
                  (b.endHour - b.startHour) * HOUR_HEIGHT - 2,
                )
                // 가로 너비 분할: 2개면 50% 씩, 1개면 100%
                const widthPct = 100 / splitCount
                const leftPct = idx * widthPct

                const job = b.app.job_postings
                const style = STATUS_STYLE[b.app.status] ?? STATUS_STYLE.applied

                return (
                  <button
                    type="button"
                    key={b.id}
                    onClick={() => onApplicationClick?.(b.app)}
                    className={`
                      absolute rounded-xl border px-2 py-1
                      text-[11px] font-bold overflow-hidden text-left
                      hover:brightness-95 transition
                      ${style}
                    `}
                    style={{
                      top: `${top}px`,
                      height: `${height}px`,
                      left: `calc(${leftPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                    }}
                    title={`${job?.company_name ?? '공고'} ${String(DEFAULT_START_HOUR).padStart(2, '0')}:00~${String(DEFAULT_END_HOUR).padStart(2, '0')}:00`}
                  >
                    {/* 회사명 1줄 (truncate) */}
                    <p className="truncate">
                      {job?.company_name ?? '공고'}
                      {b.isNightSplit && <span className="ml-1 opacity-60">(야간)</span>}
                    </p>
                    {/* 시간 1줄 */}
                    <p className="text-[10px] font-medium opacity-80 mt-0.5">
                      {String(DEFAULT_START_HOUR).padStart(2, '0')}:00~{String(DEFAULT_END_HOUR).padStart(2, '0')}:00
                    </p>
                  </button>
                )
              })}

              {/* +N 더보기 뱃지 (3개 이상 겹칠 때만) */}
              {overflowCount > 0 && (
                <button
                  // 이번 step 은 간단히 alert 로 처리. 다음 step 에서 BottomSheet 로 교체.
                  onClick={() => {
                    const names = dayBlocks
                      .slice(2)
                      .map(b => b.app.job_postings?.company_name ?? '공고')
                      .join('\n')
                    alert(`이 날 숨겨진 일정 ${overflowCount}개:\n${names}`)
                  }}
                  className="
                    absolute bottom-1 right-1
                    px-1.5 py-0.5 rounded-lg
                    bg-[#3182f6] text-white
                    text-[9px] font-bold
                    shadow
                  "
                >
                  +{overflowCount}
                </button>
              )}
            </div>
          )
        })}

        {/* 3) 현재 시각 빨간 가로선 (오늘이 이번 주에 포함될 때만) */}
        {todayIndexInWeek !== -1 && nowY !== null && (
          <div
            className="absolute left-0 right-0 pointer-events-none z-10"
            style={{ top: `${nowY}px` }}
          >
            <div className="flex items-center">
              {/* 좌측 40px 자리(시간 라벨 칼럼) 비우기 */}
              <div style={{ width: '40px' }} />
              {/* 빨간 선 + 왼쪽 점 */}
              <div className="relative flex-1">
                <span className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                <div className="border-t-2 border-red-500" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 빈 주 안내 ── */}
      {blocks.length === 0 && (
        <div className="px-4 py-4 text-center border-t border-slate-100">
          <p className="text-[12px] text-[#8b95a1]">
            이번 주에 등록된 출근 일정이 없어요
          </p>
        </div>
      )}
    </div>
  )
}
