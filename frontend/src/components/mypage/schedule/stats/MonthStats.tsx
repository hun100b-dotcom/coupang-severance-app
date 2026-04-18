// 📈 이번 달 통계 박스 — 출근 확정/출근 완료/예상 수입 3개 지표
// 기존 MyScheduleTab L283~308 영역을 그대로 분리했다.
import { useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import type { JobApplication } from '../../../../types/supabase'

interface Props {
  applications: JobApplication[]
  year: number
  month: number // 0-indexed
}

export default function MonthStats({ applications, year, month }: Props) {
  // ── 이번 달 통계 계산 ──
  // 근무일 또는 지원일이 "YYYY-MM"으로 시작하는 건을 이번 달로 본다
  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`
    const thisMonthApps = applications.filter(app =>
      app.work_date?.startsWith(prefix) || app.applied_at.startsWith(prefix)
    )
    const confirmedCount = thisMonthApps.filter(a => a.status === 'confirmed').length
    const completedCount = thisMonthApps.filter(a => a.status === 'completed').length

    // 예상 수입: 출근 완료된 공고의 일급 합산
    const expectedIncome = thisMonthApps
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.job_postings?.daily_wage ?? 0), 0)

    return { confirmedCount, completedCount, expectedIncome }
  }, [applications, year, month])

  return (
    <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-[0_4px_16px_rgba(49,130,246,0.04)]">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-[#3182f6]" />
        <p className="text-[14px] font-extrabold text-[#191f28]">이번 달 통계</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[20px] font-black text-blue-600">{monthStats.confirmedCount}<span className="text-[11px] font-bold">건</span></p>
          <p className="text-[11px] text-[#8b95a1]">출근 확정</p>
        </div>
        <div>
          <p className="text-[20px] font-black text-emerald-600">{monthStats.completedCount}<span className="text-[11px] font-bold">건</span></p>
          <p className="text-[11px] text-[#8b95a1]">출근 완료</p>
        </div>
        <div>
          <p className="text-[20px] font-black text-violet-600">
            {monthStats.expectedIncome > 0
              ? (monthStats.expectedIncome / 10000).toFixed(0)
              : '0'}
            <span className="text-[11px] font-bold">만원</span>
          </p>
          <p className="text-[11px] text-[#8b95a1]">예상 수입</p>
        </div>
      </div>
    </div>
  )
}
