// 📋 리스트 뷰 — 지원한 공고를 날짜별 그룹으로 나열
// 정렬: 미래 가까운 순 → 오늘 → 과거 (즉, 날짜 "내림차순" 이지만 기준은 "현재와의 거리")
// 구조: 그룹 헤더 (📅 4월 22일 (내일)) + 그룹 내 카드 나열
// cancelled 상태도 숨기지 않고 취소선으로 표시 (기획서 §2-4)
import { useMemo } from 'react'
import { MapPin } from 'lucide-react'
import type { JobApplication } from '../../../../types/supabase'

interface Props {
  applications: JobApplication[]
}

// ── 상태별 한글 라벨 + 뱃지 색상 ──
// 기획서 §2-4 색상 스펙 그대로 반영
const STATUS_STYLE: Record<JobApplication['status'], {
  label: string
  badge: string    // 뱃지 배경+글자 Tailwind 클래스
  strike?: boolean // true 면 카드 전체 취소선 적용
}> = {
  applied:   { label: '지원완료', badge: 'bg-slate-100 text-slate-600' },
  reviewing: { label: '검토중',   badge: 'bg-amber-100 text-amber-700' },
  confirmed: { label: '출근확정', badge: 'bg-blue-50 text-blue-600' },
  completed: { label: '출근완료', badge: 'bg-emerald-50 text-emerald-600' },
  cancelled: { label: '취소',     badge: 'bg-gray-100 text-gray-400', strike: true },
  rejected:  { label: '지원거절', badge: 'bg-red-50 text-red-500' },
}

// ── YYYY-MM-DD 문자열 → Date 객체 (한국 시간 기준, 자정 고정) ──
// ISO "2026-04-22" 만 사용하므로 new Date(Y, M-1, D) 로 파싱 (UTC 변환 방지)
function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ── "오늘"의 자정 Date (하루 단위 비교용) ──
function todayMidnight(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// ── 두 날짜 사이 일수 차이 (b - a) ──
function diffDays(a: Date, b: Date): number {
  const MS = 24 * 60 * 60 * 1000
  return Math.round((b.getTime() - a.getTime()) / MS)
}

// ── 그룹 헤더용 라벨 생성 ──
// 예: "📅 2026년 4월 22일 (내일)" / "(오늘)" / "(어제)" / "(수)"
function buildGroupLabel(ymd: string): string {
  const d = parseYMD(ymd)
  const today = todayMidnight()
  const diff = diffDays(today, d)

  let suffix: string
  if (diff === 0)       suffix = '오늘'
  else if (diff === 1)  suffix = '내일'
  else if (diff === -1) suffix = '어제'
  else {
    // ±2일 이상: 요일 표시 (월/화/수/목/금/토/일)
    suffix = d.toLocaleDateString('ko-KR', { weekday: 'short' })
  }

  // "2026년 4월 22일" 형태
  const main = d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  return `📅 ${main} (${suffix})`
}

export default function ListView({ applications }: Props) {
  // ── 날짜별 그룹 정렬 로직 ──
  // 1) work_date 가 있는 건만 대상 (null 이면 날짜 그룹을 만들 수 없음)
  // 2) work_date 기준 그룹핑
  // 3) 정렬 기준: "오늘과의 거리가 작은 순"
  //    - 미래(가까운 순) → 오늘 → 과거(최근 순)
  //    - 예: 오늘=4/19 라면 4/20, 4/19, 4/18, 4/17 ... 순
  const groups = useMemo(() => {
    // work_date 없는 지원은 리스트뷰에서 제외
    // (스케줄 탭의 핵심은 출근 예정일이므로 날짜 없는 건 표시할 기준이 없다)
    const withDate = applications.filter(a => !!a.work_date)

    // 그룹핑: { "YYYY-MM-DD": JobApplication[] }
    const map = new Map<string, JobApplication[]>()
    for (const app of withDate) {
      const key = (app.work_date as string).slice(0, 10)
      const list = map.get(key) ?? []
      list.push(app)
      map.set(key, list)
    }

    // 정렬: 오늘 기준 가까운 미래부터 → 오늘 → 먼 과거
    const today = todayMidnight()
    return Array.from(map.entries())
      .map(([ymd, apps]) => ({
        ymd,
        apps,
        distance: diffDays(today, parseYMD(ymd)), // 양수=미래, 0=오늘, 음수=과거
      }))
      .sort((a, b) => {
        // 1차: 미래(>=0) 가 과거(<0) 보다 먼저
        const aFuture = a.distance >= 0
        const bFuture = b.distance >= 0
        if (aFuture !== bFuture) return aFuture ? -1 : 1
        // 2차(미래끼리): 가까운 날짜부터 (오름차순)
        if (aFuture) return a.distance - b.distance
        // 2차(과거끼리): 최근부터 (거리 절대값 작은 순 = 큰 음수부터)
        return b.distance - a.distance
      })
  }, [applications])

  // 빈 상태 — 날짜가 있는 지원건이 하나도 없을 때
  if (groups.length === 0) {
    return (
      <div
        className="
          flex flex-col items-center justify-center
          gap-2 py-16
          bg-white
          rounded-[20px] border border-slate-100
          shadow-[0_4px_16px_rgba(49,130,246,0.04)]
          text-center
        "
      >
        <p className="text-[15px] font-bold text-[#4e5968]">아직 지원한 공고가 없어요</p>
        <p className="text-[12px] text-[#8b95a1]">채용정보 탭에서 관심 공고에 지원해보세요</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(({ ymd, apps }) => (
        <section key={ymd} className="flex flex-col gap-2">
          {/* ── 그룹 헤더 ── */}
          <h3 className="text-[13px] font-extrabold text-[#191f28] px-1">
            {buildGroupLabel(ymd)}
          </h3>

          {/* ── 그룹 내 카드들 ── */}
          {apps.map(app => {
            const style = STATUS_STYLE[app.status] ?? STATUS_STYLE.applied
            const job = app.job_postings
            return (
              <div
                key={app.id}
                className={`
                  bg-white
                  rounded-[20px] border border-slate-100
                  shadow-[0_4px_16px_rgba(49,130,246,0.04)]
                  p-4
                  ${style.strike ? 'opacity-70' : ''}
                `}
              >
                {/* 상단: 회사명 + 상태 뱃지 */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex-1 min-w-0">
                    <p
                      className={`
                        text-[15px] font-extrabold text-[#191f28] break-words
                        ${style.strike ? 'line-through' : ''}
                      `}
                    >
                      {job?.company_name ?? '공고 정보 없음'}
                    </p>
                    {job?.center_name && (
                      <p className="text-[12px] text-[#8b95a1] mt-0.5 break-words">
                        {job.center_name}
                      </p>
                    )}
                  </div>
                  <span
                    className={`
                      px-2.5 py-1 rounded-xl
                      text-[11px] font-bold
                      shrink-0
                      ${style.badge}
                    `}
                  >
                    {style.label}
                  </span>
                </div>

                {/* 중단: 근무일 + 지역 (보조 정보) */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#8b95a1] mb-2">
                  {/* 출근일 명시 — 그룹 헤더에도 있지만 카드 단위로도 한 번 더 */}
                  {app.work_date && (
                    <span className={style.strike ? 'line-through' : ''}>
                      근무일 {new Date(app.work_date).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                  {job?.region && (
                    <span className="flex items-center gap-1 min-w-0 break-words">
                      <MapPin className="w-3 h-3 text-[#3182f6] shrink-0" />
                      {job.region}
                    </span>
                  )}
                </div>

                {/* 하단: 일급 (있을 때만) */}
                {job && job.daily_wage > 0 && (
                  <div className="flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-xl w-fit">
                    <span className="text-[11px] text-[#8b95a1]">일급</span>
                    <span
                      className={`
                        text-[14px] font-black text-[#3182f6]
                        ${style.strike ? 'line-through' : ''}
                      `}
                    >
                      {job.daily_wage.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      ))}
    </div>
  )
}
