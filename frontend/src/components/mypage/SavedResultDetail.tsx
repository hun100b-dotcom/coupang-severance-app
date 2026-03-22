// 저장된 계산결과 상세 모달 — 타입별 포맷으로 표시
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ReportRow, AnyPayload, SeverancePayload, WeeklyAllowancePayload, AnnualLeavePayload, UnemploymentPayload } from '../../types/supabase'

interface Props {
  report: ReportRow | null
  onClose: () => void
}

function fmt(n: number) {
  return n.toLocaleString('ko-KR') + '원'
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  } catch { return iso }
}

// payload type 판별 헬퍼
function getPayloadType(payload: AnyPayload | null | undefined): string {
  if (!payload) return 'unknown'
  if ('type' in payload) return (payload as { type: string }).type
  // SeverancePayload (type 필드 없음, severance 필드 있음)
  if ('severance' in payload) return 'severance'
  return 'unknown'
}

// 퇴직금 결과 섹션
function SeveranceDetail({ p }: { p: SeverancePayload }) {
  const rows = [
    { label: '예상 퇴직금', value: fmt(Math.round(p.severance)), highlight: true },
    { label: '평균 일급', value: fmt(Math.round(p.average_wage)) },
    { label: '총 근무일수', value: `${p.work_days.toLocaleString()}일` },
    { label: '인정 근속기간', value: `${p.qualifying_days}일` },
    { label: '적격 여부', value: p.eligible ? '수급 가능 ✓' : '요건 미충족' },
  ]
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
          <span className="text-lg">💼</span>
        </div>
        <p className="font-extrabold text-[#191f28]">퇴직금 계산 결과</p>
      </div>
      {rows.map(r => (
        <div key={r.label} className={`flex justify-between items-center px-4 py-2.5 rounded-xl ${r.highlight ? 'bg-blue-50 border border-blue-100' : 'bg-slate-50 border border-slate-100'}`}>
          <span className="text-[12px] text-[#4e5968]">{r.label}</span>
          <span className={`text-sm font-bold ${r.highlight ? 'text-[#3182f6]' : 'text-[#191f28]'}`}>{r.value}</span>
        </div>
      ))}
      {p.eligibility_message && (
        <div className={`mt-1 px-4 py-3 rounded-xl text-[12px] font-semibold leading-relaxed flex gap-2 ${
          p.eligible ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
        }`}>
          {p.eligible ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <span>{p.eligibility_message}</span>
        </div>
      )}
    </div>
  )
}

// 주휴수당 결과 섹션
function WeeklyAllowanceDetail({ p }: { p: WeeklyAllowancePayload }) {
  const rows = [
    { label: '주휴수당', value: fmt(p.weekly_allowance), highlight: true },
    { label: '시급', value: fmt(p.hourly_wage) },
    { label: '주 근무일', value: `${p.work_days_per_week}일` },
    { label: '하루 근로시간', value: `${p.work_hours_per_day}시간` },
    { label: '개근 여부', value: p.is_full_attendance ? '개근 ✓' : '결근 있음' },
    { label: '수급 자격', value: p.is_eligible ? '발생 ✓' : '미발생' },
  ]
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
          <span className="text-lg">📅</span>
        </div>
        <p className="font-extrabold text-[#191f28]">주휴수당 계산 결과</p>
      </div>
      {rows.map(r => (
        <div key={r.label} className={`flex justify-between items-center px-4 py-2.5 rounded-xl ${r.highlight ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'}`}>
          <span className="text-[12px] text-[#4e5968]">{r.label}</span>
          <span className={`text-sm font-bold ${r.highlight ? 'text-emerald-700' : 'text-[#191f28]'}`}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

// 연차수당 결과 섹션
function AnnualLeaveDetail({ p }: { p: AnnualLeavePayload }) {
  const rows = [
    { label: '미지급 연차수당', value: fmt(p.annual_leave_allowance), highlight: p.annual_leave_allowance > 0 },
    { label: '총 발생 연차', value: `${p.annual_leave_days}일` },
    { label: '사용한 연차', value: `${p.used_days}일` },
    { label: '입사일', value: p.hire_date },
    ...(p.resign_date ? [{ label: '퇴직일', value: p.resign_date, highlight: false }] : []),
    { label: '재직 상태', value: p.is_employed ? '재직 중' : '퇴직', highlight: false },
  ]
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center">
          <span className="text-lg">📋</span>
        </div>
        <p className="font-extrabold text-[#191f28]">연차수당 계산 결과</p>
      </div>
      {rows.map(r => (
        <div key={r.label} className={`flex justify-between items-center px-4 py-2.5 rounded-xl ${r.highlight ? 'bg-amber-50 border border-amber-100' : 'bg-slate-50 border border-slate-100'}`}>
          <span className="text-[12px] text-[#4e5968]">{r.label}</span>
          <span className={`text-sm font-bold ${r.highlight ? 'text-amber-700' : 'text-[#191f28]'}`}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

// 실업급여 결과 섹션
function UnemploymentDetail({ p }: { p: UnemploymentPayload }) {
  const rows = [
    { label: '예상 총 실업급여', value: fmt(Math.round(p.total_estimate)), highlight: true },
    { label: '실업급여 일당', value: fmt(Math.round(p.daily_benefit)) },
    { label: '수급 가능 일수', value: `${p.benefit_days}일` },
    { label: '평균 일당', value: fmt(Math.round(p.avg_daily_wage)) },
    { label: '가입일수 (18개월 내)', value: `${p.insured_days}일` },
    { label: '수급 자격', value: p.eligible ? '수급 가능 ✓' : '요건 미충족' },
  ]
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
          <span className="text-lg">🛡️</span>
        </div>
        <p className="font-extrabold text-[#191f28]">실업급여 계산 결과</p>
      </div>
      {rows.map(r => (
        <div key={r.label} className={`flex justify-between items-center px-4 py-2.5 rounded-xl ${r.highlight ? 'bg-violet-50 border border-violet-100' : 'bg-slate-50 border border-slate-100'}`}>
          <span className="text-[12px] text-[#4e5968]">{r.label}</span>
          <span className={`text-sm font-bold ${r.highlight ? 'text-violet-700' : 'text-[#191f28]'}`}>{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function SavedResultDetail({ report, onClose }: Props) {
  const payloadType = getPayloadType(report?.payload)

  return (
    <AnimatePresence>
      {report && (
        <>
          {/* 배경 오버레이 */}
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 모달 시트 */}
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 60 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-[32px] shadow-[0_-8px_40px_rgba(15,23,42,0.2)] max-h-[85vh] overflow-y-auto"
          >
            {/* 드래그 핸들 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-slate-200" />
            </div>

            <div className="px-5 pb-8 pt-3">
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-[17px] font-extrabold text-[#191f28]">{report.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Calendar className="w-3 h-3 text-[#8b95a1]" />
                    <span className="text-[11px] text-[#8b95a1]">{formatDate(report.created_at)} 계산</span>
                  </div>
                </div>
                <button type="button" onClick={onClose}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
                  <X className="w-5 h-5 text-[#8b95a1]" />
                </button>
              </div>

              {/* 타입별 상세 */}
              {!report.payload && (
                <p className="text-sm text-[#8b95a1] text-center py-8">상세 데이터가 없어요</p>
              )}
              {report.payload && payloadType === 'severance' && (
                <SeveranceDetail p={report.payload as SeverancePayload} />
              )}
              {report.payload && payloadType === 'weekly_allowance' && (
                <WeeklyAllowanceDetail p={report.payload as WeeklyAllowancePayload} />
              )}
              {report.payload && payloadType === 'annual_leave' && (
                <AnnualLeaveDetail p={report.payload as AnnualLeavePayload} />
              )}
              {report.payload && payloadType === 'unemployment' && (
                <UnemploymentDetail p={report.payload as UnemploymentPayload} />
              )}

              <p className="text-[10px] text-[#8b95a1] text-center mt-5 leading-relaxed">
                이 결과는 참고용입니다. 정확한 금액은 노무사 상담을 받으세요.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
