// 📊 누적 통계 스트립 — 3개 카드 (전체 지원 / 출근 완료 / 총 수입)
// 기존 MyScheduleTab L130~151 영역을 그대로 분리했다.
import { useMemo } from 'react'
import type { JobApplication } from '../../../../types/supabase'

interface Props {
  applications: JobApplication[]
}

export default function TotalStatsStrip({ applications }: Props) {
  // ── 전체 누적 통계 ──
  // cancelled(취소) 제외한 전체 지원 수 / 출근 완료 수 / 총 수입(완료 공고의 일급 합)
  const totalStats = useMemo(() => {
    const total = applications.filter(a => a.status !== 'cancelled').length
    const completed = applications.filter(a => a.status === 'completed').length
    const totalIncome = applications
      .filter(a => a.status === 'completed')
      .reduce((sum, a) => sum + (a.job_postings?.daily_wage ?? 0), 0)
    return { total, completed, totalIncome }
  }, [applications])

  return (
    <div className="grid grid-cols-3 gap-2">
      {[
        { label: '전체 지원', value: totalStats.total, unit: '건', color: 'text-[#3182f6]' },
        { label: '출근 완료', value: totalStats.completed, unit: '건', color: 'text-emerald-600' },
        {
          label: '총 수입',
          value: totalStats.totalIncome > 0
            ? (totalStats.totalIncome / 10000).toFixed(0)
            : '0',
          unit: '만원',
          color: 'text-violet-600',
        },
      ].map(stat => (
        <div key={stat.label}
          className="bg-white rounded-[20px] p-3 text-center border border-slate-100 shadow-[0_4px_12px_rgba(49,130,246,0.04)]">
          <p className={`text-[22px] font-black ${stat.color} leading-tight`}>
            {stat.value}<span className="text-[11px] font-bold">{stat.unit}</span>
          </p>
          <p className="text-[11px] text-[#8b95a1] mt-0.5">{stat.label}</p>
        </div>
      ))}
    </div>
  )
}
