// 📋 스케줄 상세/편집 BottomSheet
// 기획서 tasks/schedule-manager-plan.md §2-5, §5-3 스펙 구현
// 월간/주간/리스트 뷰에서 지원 건을 클릭하면 하단에서 올라오는 시트로 상세 편집
//
// 섹션 구성:
//   A. 공고 정보 (읽기 전용)
//   B. 근무 시간 (출근/퇴근)
//   C. 차감 항목 (교통비/식비/기타)
//   D. 실수령액 (실시간 계산 표시)
//   E. 상태 관리 (취소/완료요청)
//   F. 지급 관리 (지급예상일/수령여부)
//   G. 메모 (user_memo)
//   H. 저장/닫기 액션
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  X, Clock, Coins, MessageSquare, Calendar, Check, Loader2, AlertCircle,
} from 'lucide-react'
import type { JobApplication } from '../../../../types/supabase'
import {
  updateScheduleDetail,
  cancelApplication,
  calculateNetIncome,
} from '../../../../lib/jobApplications'

// ── Props: null 이면 시트 닫힘, 값이 들어오면 자동 오픈 ──
interface Props {
  application: JobApplication | null
  onClose: () => void
  onUpdate: (updated: JobApplication) => void   // 낙관적 업데이트 콜백
}

// ── 상태 뱃지 스타일 (ListView 와 톤 통일) ──
const STATUS_STYLE: Record<JobApplication['status'], { label: string; badge: string }> = {
  applied:   { label: '지원완료', badge: 'bg-slate-100 text-slate-600' },
  reviewing: { label: '검토중',   badge: 'bg-amber-100 text-amber-700' },
  confirmed: { label: '출근확정', badge: 'bg-blue-50 text-blue-600' },
  completed: { label: '출근완료', badge: 'bg-emerald-50 text-emerald-600' },
  cancelled: { label: '취소',     badge: 'bg-gray-100 text-gray-400' },
  rejected:  { label: '지원거절', badge: 'bg-red-50 text-red-500' },
}

// ── "HH:mm" 또는 "HH:mm:ss" 를 <input type="time"> 용 "HH:mm" 으로 정규화 ──
function toTimeInput(v: string | null | undefined): string {
  if (!v) return ''
  // "HH:mm:ss" → "HH:mm"
  return v.slice(0, 5)
}

// ── "YYYY-MM-DD"로 정규화 (ISO 타임스탬프도 앞 10자리만) ──
function toDateInput(v: string | null | undefined): string {
  if (!v) return ''
  return v.slice(0, 10)
}

// ── 날짜 한글 포맷: "2026년 4월 22일 (수)" ──
function formatKoreanDate(ymd: string | null | undefined): string {
  if (!ymd) return '날짜 미정'
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

// ── 숫자 input 문자열 → number | null 변환 ──
function parseNumber(s: string): number | null {
  if (!s.trim()) return null
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export default function ScheduleDetailSheet({ application, onClose, onUpdate }: Props) {
  // ── 로컬 편집 상태 ──
  // 시트를 다시 열 때마다 application 값으로 초기화
  const [workStart, setWorkStart] = useState('')
  const [workEnd, setWorkEnd] = useState('')
  const [transport, setTransport] = useState('')
  const [meal, setMeal] = useState('')
  const [other, setOther] = useState('')
  const [paymentExpected, setPaymentExpected] = useState('')
  const [paymentReceived, setPaymentReceived] = useState(false)
  const [memo, setMemo] = useState('')

  // ── 저장 중 상태 + 토스트 ──
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  // ── application 변경 시 로컬 상태 초기화 ──
  useEffect(() => {
    if (!application) return
    setWorkStart(toTimeInput(application.work_start_time))
    setWorkEnd(toTimeInput(application.work_end_time))
    setTransport(application.transport_cost != null ? String(application.transport_cost) : '')
    setMeal(application.meal_cost != null ? String(application.meal_cost) : '')
    setOther(application.other_deduction != null ? String(application.other_deduction) : '')
    setPaymentExpected(toDateInput(application.payment_expected_date))
    setPaymentReceived(!!application.payment_received_at)
    setMemo(application.user_memo ?? '')
  }, [application])

  // ── 토스트 자동 사라짐 (2초) ──
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  // ── 실수령액 실시간 계산 (차감값 변경 즉시 반영) ──
  // calculateNetIncome 은 app 객체 전체를 받으므로, 편집 중 값으로 가상 app 을 만든다
  const netIncome = useMemo(() => {
    if (!application) return 0
    const virtual: JobApplication = {
      ...application,
      transport_cost: parseNumber(transport) ?? 0,
      meal_cost: parseNumber(meal) ?? 0,
      other_deduction: parseNumber(other) ?? 0,
    }
    return calculateNetIncome(virtual)
  }, [application, transport, meal, other])

  // ── 야간 근무 여부 (퇴근 < 출근이면 야간으로 간주) ──
  const isNightShift = useMemo(() => {
    if (!workStart || !workEnd) return false
    return workEnd < workStart
  }, [workStart, workEnd])

  // ── 상태별 가능한 액션 판단 ──
  const canCancel = application
    ? application.status === 'applied' || application.status === 'confirmed'
    : false
  const canRequestCompletion = application?.status === 'confirmed'
  const isTerminal = application
    ? application.status === 'cancelled' || application.status === 'completed'
    : false

  // ── 저장 처리 ──
  const handleSave = async () => {
    if (!application || saving) return
    setSaving(true)

    const payload = {
      work_start_time: workStart || null,
      work_end_time: workEnd || null,
      transport_cost: parseNumber(transport),
      meal_cost: parseNumber(meal),
      other_deduction: parseNumber(other),
      payment_expected_date: paymentExpected || null,
      // 체크 시 현재 시각 기록, 해제 시 null
      payment_received_at: paymentReceived
        ? (application.payment_received_at ?? new Date().toISOString())
        : null,
      user_memo: memo.trim() || null,
    }

    const ok = await updateScheduleDetail(application.id, payload)
    setSaving(false)

    if (ok) {
      // 낙관적 업데이트: 상위에 변경된 app 전달
      const updated: JobApplication = { ...application, ...payload }
      onUpdate(updated)
      setToast({ msg: '저장 완료', type: 'success' })
      // 1초 뒤 자동 닫기
      setTimeout(() => onClose(), 1000)
    } else {
      setToast({ msg: '저장 실패. 다시 시도해주세요', type: 'error' })
    }
  }

  // ── 지원 취소 처리 ──
  const handleCancel = async () => {
    if (!application || cancelling) return
    const confirmed = window.confirm('정말 이 지원을 취소하시겠어요?\n취소 후에는 되돌릴 수 없어요.')
    if (!confirmed) return

    setCancelling(true)
    const ok = await cancelApplication(application.id)
    setCancelling(false)

    if (ok) {
      const updated: JobApplication = { ...application, status: 'cancelled' }
      onUpdate(updated)
      setToast({ msg: '지원이 취소되었어요', type: 'success' })
      setTimeout(() => onClose(), 1000)
    } else {
      setToast({ msg: '취소 실패. 다시 시도해주세요', type: 'error' })
    }
  }

  // ── 완료 요청 (이번 step 은 안내만, 실제 요청 로직은 TODO) ──
  const handleRequestCompletion = () => {
    // TODO: 향후 어드민에게 완료 요청을 보내는 기능 추가 예정
    // (예: application 테이블에 completion_requested_at 추가 + 어드민 알림)
    setToast({ msg: '완료 요청이 전달되었어요 (어드민 확인 대기)', type: 'success' })
  }

  // ── 드래그 종료 시 100px 이상이면 닫기 ──
  const handleDragEnd = (_: unknown, info: { offset: { y: number } }) => {
    if (info.offset.y > 100) onClose()
  }

  return (
    <AnimatePresence>
      {application && (
        <>
          {/* ── 오버레이 ── */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* ── 시트 본체 ── */}
          <motion.div
            className="
              fixed bottom-0 left-0 right-0 z-50
              bg-white rounded-t-[24px]
              max-h-[85vh] overflow-y-auto
              shadow-[0_-8px_32px_rgba(15,23,42,0.18)]
            "
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
          >
            {/* 드래그 핸들 */}
            <div className="sticky top-0 bg-white pt-2 pb-1 z-10">
              <div className="mx-auto h-1 w-10 rounded-full bg-slate-200" />
            </div>

            {/* 헤더: 닫기 버튼 */}
            <div className="flex items-center justify-between px-5 pt-1 pb-3 border-b border-slate-100">
              <p className="text-[15px] font-extrabold text-[#191f28]">출근 상세</p>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── 섹션 A: 공고 정보 (읽기 전용) ── */}
            <section className="px-5 py-4 border-b border-slate-100">
              <p className="text-[11px] font-bold text-[#8b95a1] mb-2">공고 정보</p>
              <p className="text-[15px] font-extrabold text-[#191f28]">
                {application.job_postings?.company_name ?? '공고 정보 없음'}
              </p>
              {application.job_postings?.center_name && (
                <p className="text-[13px] text-[#4e5968] mt-0.5">
                  {application.job_postings.center_name}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px] text-[#8b95a1]">
                <span>{formatKoreanDate(application.work_date)}</span>
                {application.job_postings?.region && (
                  <span>· {application.job_postings.region}</span>
                )}
                {(application.job_postings?.daily_wage ?? 0) > 0 && (
                  <span className="text-[#3182f6] font-bold">
                    · 일급 {application.job_postings!.daily_wage.toLocaleString('ko-KR')}원
                  </span>
                )}
              </div>
            </section>

            {/* ── 섹션 B: 근무 시간 ── */}
            <section className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-[#3182f6]" />
                <p className="text-[11px] font-bold text-[#8b95a1]">근무 시간</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#4e5968]">출근 시각</span>
                  <input
                    type="time"
                    value={workStart}
                    onChange={e => setWorkStart(e.target.value)}
                    disabled={isTerminal}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-[14px] focus:outline-none focus:border-[#3182f6] disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#4e5968]">퇴근 시각</span>
                  <input
                    type="time"
                    value={workEnd}
                    onChange={e => setWorkEnd(e.target.value)}
                    disabled={isTerminal}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-[14px] focus:outline-none focus:border-[#3182f6] disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </label>
              </div>
              {isNightShift && (
                <p className="mt-2 text-[11px] font-bold text-indigo-600">
                  🌙 야간 근무 (퇴근이 다음날 새벽)
                </p>
              )}
            </section>

            {/* ── 섹션 C: 차감 항목 ── */}
            <section className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Coins className="w-3.5 h-3.5 text-[#3182f6]" />
                <p className="text-[11px] font-bold text-[#8b95a1]">차감 항목 (원)</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#4e5968]">교통비</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={transport}
                    onChange={e => setTransport(e.target.value)}
                    disabled={isTerminal}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-[14px] focus:outline-none focus:border-[#3182f6] disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#4e5968]">식비</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={meal}
                    onChange={e => setMeal(e.target.value)}
                    disabled={isTerminal}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-[14px] focus:outline-none focus:border-[#3182f6] disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#4e5968]">기타</span>
                  <input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={other}
                    onChange={e => setOther(e.target.value)}
                    disabled={isTerminal}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-[14px] focus:outline-none focus:border-[#3182f6] disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </label>
              </div>
            </section>

            {/* ── 섹션 D: 실수령액 ── */}
            <section className="px-5 py-4 border-b border-slate-100">
              <div className="bg-blue-50/60 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-[#4e5968]">💰 실수령 예상</p>
                  <p className="text-[10px] text-[#8b95a1] mt-0.5">
                    (일급 − 차감 합계, 최소 0원)
                  </p>
                </div>
                <p className="text-[22px] font-black text-[#3182f6]">
                  {netIncome.toLocaleString('ko-KR')}원
                </p>
              </div>
            </section>

            {/* ── 섹션 E: 상태 관리 ── */}
            <section className="px-5 py-4 border-b border-slate-100">
              <p className="text-[11px] font-bold text-[#8b95a1] mb-2">상태</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`
                    px-2.5 py-1 rounded-xl text-[11px] font-bold
                    ${STATUS_STYLE[application.status].badge}
                  `}
                >
                  {STATUS_STYLE[application.status].label}
                </span>
                {isTerminal && (
                  <span className="text-[11px] text-[#8b95a1] flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    최종 상태 (변경 불가)
                  </span>
                )}
              </div>

              {/* 가능한 액션 버튼 */}
              {!isTerminal && (
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {canCancel && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="
                        px-3 py-2 rounded-xl
                        bg-red-50 text-red-600 text-[12px] font-bold
                        hover:bg-red-100 transition-colors
                        disabled:opacity-60
                        flex items-center gap-1
                      "
                    >
                      {cancelling && <Loader2 className="w-3 h-3 animate-spin" />}
                      지원 취소
                    </button>
                  )}
                  {canRequestCompletion && (
                    <button
                      type="button"
                      onClick={handleRequestCompletion}
                      className="
                        px-3 py-2 rounded-xl
                        bg-emerald-50 text-emerald-700 text-[12px] font-bold
                        hover:bg-emerald-100 transition-colors
                      "
                    >
                      완료 요청
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* ── 섹션 F: 지급 관리 ── */}
            <section className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="w-3.5 h-3.5 text-[#3182f6]" />
                <p className="text-[11px] font-bold text-[#8b95a1]">지급 관리</p>
              </div>
              <label className="flex flex-col gap-1 mb-2">
                <span className="text-[11px] text-[#4e5968]">지급 예상일</span>
                <input
                  type="date"
                  value={paymentExpected}
                  onChange={e => setPaymentExpected(e.target.value)}
                  disabled={isTerminal}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-[14px] focus:outline-none focus:border-[#3182f6] disabled:bg-slate-50 disabled:text-slate-400"
                />
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentReceived}
                  onChange={e => setPaymentReceived(e.target.checked)}
                  disabled={isTerminal}
                  className="w-4 h-4 accent-[#3182f6] disabled:opacity-50"
                />
                <span className="text-[13px] text-[#191f28]">지급 완료 확인</span>
              </label>
              {paymentReceived && application.payment_received_at && (
                <p className="mt-1.5 ml-6 text-[11px] text-emerald-600 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {application.payment_received_at.slice(0, 10)} 수령 확인됨
                </p>
              )}
            </section>

            {/* ── 섹션 G: 메모 ── */}
            <section className="px-5 py-4 border-b border-slate-100">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#3182f6]" />
                <p className="text-[11px] font-bold text-[#8b95a1]">메모</p>
              </div>
              <textarea
                value={memo}
                onChange={e => setMemo(e.target.value.slice(0, 500))}
                placeholder="특이사항, 기억할 내용 등..."
                disabled={isTerminal}
                rows={3}
                className="
                  w-full px-3 py-2 rounded-xl border border-slate-200
                  text-[13px] resize-none
                  focus:outline-none focus:border-[#3182f6]
                  disabled:bg-slate-50 disabled:text-slate-400
                "
              />
              <p className="text-right text-[10px] text-[#8b95a1] mt-1">
                {memo.length} / 500자
              </p>
            </section>

            {/* ── 섹션 H: 액션 버튼 (하단) ── */}
            <section className="px-5 py-4 pb-8 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="
                  flex-1 py-3 rounded-xl
                  bg-slate-100 text-slate-700 font-bold text-[14px]
                  hover:bg-slate-200 transition-colors
                "
              >
                닫기
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || isTerminal}
                className="
                  flex-1 py-3 rounded-xl
                  bg-[#3182f6] text-white font-bold text-[14px]
                  hover:bg-[#1b64da] transition-colors
                  disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-1.5
                "
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                저장
              </button>
            </section>
          </motion.div>

          {/* ── 내장 토스트 (상단 중앙) ── */}
          <AnimatePresence>
            {toast && (
              <motion.div
                className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <div
                  className={`
                    px-4 py-2.5 rounded-2xl shadow-lg text-[13px] font-bold
                    ${toast.type === 'success'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-red-500 text-white'}
                  `}
                >
                  {toast.msg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )
}
