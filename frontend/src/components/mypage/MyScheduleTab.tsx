// 📅 스케줄 탭 — 출근 일정 타임라인 리스트 뷰
// 달력 뷰 제거 → 타임라인 + 이번 달 요약 카드 + 수입 통계
// confirmed(출근확정): D-day 순 정렬, 날짜 미정 건 별도 섹션
// completed(출근완료): 최신순 기록 표시
// Empty State: 일정이 없을 때 안내 문구 + CTA
import { useEffect, useState, useMemo } from 'react'
import {
  Loader2, MapPin, Clock, Calendar, CheckCircle2,
  TrendingUp, ChevronRight,
} from 'lucide-react'
import { listApplications } from '../../lib/jobApplications'
import type { JobApplication } from '../../types/supabase'

interface Props {
  userId: string
}

// D-day 계산 (양수=미래, 0=오늘, 음수=지남)
function calcDday(workDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(workDate)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function MyScheduleTab({ userId }: Props) {
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const data = await listApplications(userId)
      setApplications(data)
      setLoading(false)
    }
    load()
  }, [userId])

  // 이번 달 기준 prefix (예: "2026-04")
  const now = new Date()
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // ── 확정된 출근 일정 (work_date 있는 것 D-day 순 정렬) ──
  const confirmedApps = useMemo(() =>
    applications
      .filter(a => a.status === 'confirmed' && a.work_date)
      .sort((a, b) => new Date(a.work_date!).getTime() - new Date(b.work_date!).getTime()),
    [applications]
  )

  // ── 날짜 미정 (confirmed but work_date 없음) ──
  const undatedConfirmed = useMemo(() =>
    applications.filter(a => a.status === 'confirmed' && !a.work_date),
    [applications]
  )

  // ── 완료된 출근 기록 (최신순) ──
  const completedApps = useMemo(() =>
    applications
      .filter(a => a.status === 'completed')
      .sort((a, b) => {
        const da = a.work_date ?? a.applied_at
        const db = b.work_date ?? b.applied_at
        return new Date(db).getTime() - new Date(da).getTime()
      }),
    [applications]
  )

  // ── 이번 달 요약 통계 ──
  const monthSummary = useMemo(() => {
    // 이번 달 확정 건수
    const confirmedThisMonth = applications.filter(a =>
      a.status === 'confirmed' &&
      (a.work_date?.startsWith(thisMonthPrefix) || a.applied_at.startsWith(thisMonthPrefix))
    ).length

    // 이번 달 완료 건 + 수입 합산
    const completedThisMonth = applications.filter(a =>
      a.status === 'completed' &&
      (a.work_date?.startsWith(thisMonthPrefix) || a.applied_at.startsWith(thisMonthPrefix))
    )
    const income = completedThisMonth.reduce((s, a) => s + (a.job_postings?.daily_wage ?? 0), 0)

    return {
      confirmedThisMonth,
      completedCount: completedThisMonth.length,
      income,
    }
  }, [applications, thisMonthPrefix])

  // 전체 누적 수입 (완료 건 합산)
  const totalIncome = useMemo(() =>
    completedApps.reduce((s, a) => s + (a.job_postings?.daily_wage ?? 0), 0),
    [completedApps]
  )

  // 날짜 포맷: "4월 5일(토)"
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', weekday: 'short' })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-5 h-5 animate-spin text-[#3182f6]" />
        <span className="ml-2 text-[13px] text-[#8b95a1]">불러오는 중...</span>
      </div>
    )
  }

  // ── Empty State: 확정/완료 일정이 전혀 없을 때 ──
  const hasAnySchedule = confirmedApps.length > 0 || undatedConfirmed.length > 0 || completedApps.length > 0

  if (!hasAnySchedule) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
          <Calendar className="w-10 h-10 text-blue-200" />
        </div>
        <div>
          <p className="text-[16px] font-extrabold text-[#191f28] mb-1.5">아직 일정이 없어요</p>
          <p className="text-[13px] text-[#8b95a1] leading-relaxed">
            지원 후 출근 확정이 되면<br />
            여기서 일정을 확인할 수 있어요
          </p>
        </div>
        <div
          className="mt-1 px-6 py-2.5 rounded-2xl text-white text-[13px] font-bold"
          style={{ background: 'linear-gradient(135deg, #3182f6, #6d28d9)' }}
        >
          채용정보 탭에서 지원하기
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── 이번 달 요약 카드 (그라데이션) ── */}
      <div
        className="rounded-[24px] p-4 text-white"
        style={{
          background: 'linear-gradient(135deg, #3182f6 0%, #6d28d9 100%)',
          boxShadow: '0 8px 32px rgba(49,130,246,0.25)',
        }}
      >
        <p className="text-[12px] font-bold opacity-70 mb-3">
          {now.getMonth() + 1}월 출근 현황
        </p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[24px] font-black leading-tight">
              {monthSummary.confirmedThisMonth}
              <span className="text-[13px] font-bold">건</span>
            </p>
            <p className="text-[11px] opacity-70 mt-0.5">출근 확정</p>
          </div>
          <div>
            <p className="text-[24px] font-black leading-tight">
              {monthSummary.completedCount}
              <span className="text-[13px] font-bold">건</span>
            </p>
            <p className="text-[11px] opacity-70 mt-0.5">출근 완료</p>
          </div>
          <div>
            <p className="text-[24px] font-black leading-tight">
              {monthSummary.income > 0 ? (monthSummary.income / 10000).toFixed(0) : '0'}
              <span className="text-[13px] font-bold">만원</span>
            </p>
            <p className="text-[11px] opacity-70 mt-0.5">예상 수입</p>
          </div>
        </div>
      </div>

      {/* ── 확정된 출근 일정 섹션 ── */}
      {(confirmedApps.length > 0 || undatedConfirmed.length > 0) && (
        <div>
          {/* 섹션 헤더 */}
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[#3182f6]" />
            <p className="text-[14px] font-extrabold text-[#191f28]">확정된 출근 일정</p>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#3182f6] text-[11px] font-black">
              {confirmedApps.length + undatedConfirmed.length}건
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {/* 날짜 있는 확정 건 (D-day 순) */}
            {confirmedApps.map(app => {
              const diff = calcDday(app.work_date!)
              const isToday = diff === 0
              const isSoon = diff > 0 && diff <= 3  // D-1~3 주황
              const isMid = diff > 3 && diff <= 7   // D-4~7 초록

              // 상태별 카드 색상
              const cardStyle = isToday
                ? { bg: '#fef2f2', border: '#fecaca' }
                : isSoon
                ? { bg: '#fffbeb', border: '#fcd34d' }
                : { bg: '#ecfdf5', border: '#6ee7b7' }

              // D-day 배지 색상
              const ddayBg = isToday ? '#ef4444' : isSoon ? '#f59e0b' : isMid ? '#10b981' : '#6b7280'
              const ddayLabel = isToday ? 'D-DAY' : `D-${diff}`

              return (
                <div
                  key={app.id}
                  className="rounded-[20px] p-4 border"
                  style={{ background: cardStyle.bg, borderColor: cardStyle.border }}
                >
                  {/* 헤더: 회사명 + D-day 배지 */}
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-[15px] font-extrabold text-[#191f28]">
                        {app.job_postings?.company_name ?? '공고 정보 없음'}
                      </p>
                      {app.job_postings?.center_name && (
                        <p className="text-[12px] text-[#8b95a1]">{app.job_postings.center_name}</p>
                      )}
                    </div>
                    <span
                      className="px-3 py-1 rounded-xl text-[13px] font-black text-white shrink-0"
                      style={{ background: ddayBg }}
                    >
                      {ddayLabel}
                    </span>
                  </div>

                  {/* 출근 예정일 */}
                  <div className="flex items-center gap-1.5 text-[13px] font-bold text-emerald-700 mb-2">
                    <Calendar className="w-3.5 h-3.5" />
                    {fmtDate(app.work_date!)}
                  </div>

                  {/* 위치 + 근무시간 */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-[#8b95a1]">
                    {app.job_postings?.region && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#3182f6] shrink-0" />
                        {app.job_postings.region}
                      </span>
                    )}
                    {app.job_postings?.work_hours && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 shrink-0" />
                        {app.job_postings.work_hours}
                      </span>
                    )}
                  </div>

                  {/* 일급 표시 */}
                  {(app.job_postings?.daily_wage ?? 0) > 0 && (
                    <div className="mt-2.5 flex items-baseline gap-1">
                      <span className="text-[11px] text-[#8b95a1]">일급</span>
                      <span className="text-[17px] font-black text-[#3182f6]">
                        {app.job_postings!.daily_wage.toLocaleString('ko-KR')}원
                      </span>
                    </div>
                  )}
                </div>
              )
            })}

            {/* 날짜 미정 섹션 */}
            {undatedConfirmed.length > 0 && (
              <div className="rounded-[20px] p-4 border border-dashed border-gray-300 bg-gray-50">
                <p className="text-[12px] font-bold text-[#8b95a1] mb-2">📅 날짜 미정</p>
                <div className="flex flex-col gap-2">
                  {undatedConfirmed.map(app => (
                    <div key={app.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-[14px] font-bold text-[#4e5968]">
                          {app.job_postings?.company_name ?? '공고 정보 없음'}
                        </p>
                        {app.job_postings?.region && (
                          <p className="text-[12px] text-[#8b95a1]">{app.job_postings.region}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#8b95a1]" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 완료된 출근 기록 섹션 ── */}
      {completedApps.length > 0 && (
        <div>
          {/* 섹션 헤더 */}
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <p className="text-[14px] font-extrabold text-[#191f28]">완료된 출근 기록</p>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-black">
              {completedApps.length}건
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {completedApps.map(app => (
              <div
                key={app.id}
                className="rounded-[20px] p-4 bg-[#f3f4f6] border border-[#e5e7eb] flex items-center gap-3"
              >
                {/* 완료 아이콘 */}
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                {/* 회사명 + 날짜/지역 */}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-[#191f28]">
                    {app.job_postings?.company_name ?? '공고 정보 없음'}
                  </p>
                  <p className="text-[12px] text-[#8b95a1]">
                    {app.work_date ? fmtDate(app.work_date) : fmtDate(app.applied_at)}
                    {app.job_postings?.region && ` · ${app.job_postings.region}`}
                  </p>
                </div>
                {/* 일급 (있을 때만) */}
                {(app.job_postings?.daily_wage ?? 0) > 0 && (
                  <span className="text-[14px] font-black text-[#3182f6] shrink-0">
                    +{app.job_postings!.daily_wage.toLocaleString('ko-KR')}원
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 수입 통계 (이번 달 + 전체 누적) ── */}
      {completedApps.length > 0 && (
        <div className="rounded-[24px] p-4 bg-white border border-slate-100 shadow-[0_4px_16px_rgba(49,130,246,0.04)]">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-violet-600" />
            <p className="text-[14px] font-extrabold text-[#191f28]">수입 통계</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* 이번 달 합계 */}
            <div className="bg-violet-50 rounded-2xl p-3 text-center">
              <p className="text-[11px] text-[#8b95a1] mb-1">이번 달 합계</p>
              <p className="text-[20px] font-black text-violet-600">
                {monthSummary.income > 0 ? (monthSummary.income / 10000).toFixed(1) : '0'}
                <span className="text-[12px] font-bold">만원</span>
              </p>
            </div>
            {/* 전체 누적 */}
            <div className="bg-emerald-50 rounded-2xl p-3 text-center">
              <p className="text-[11px] text-[#8b95a1] mb-1">전체 누적</p>
              <p className="text-[20px] font-black text-emerald-600">
                {totalIncome > 0 ? (totalIncome / 10000).toFixed(1) : '0'}
                <span className="text-[12px] font-bold">만원</span>
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
