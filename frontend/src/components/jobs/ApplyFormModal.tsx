// 채용 지원 폼 모달 — 전면 개편 버전 (2026-04-11)
// 섹션 1: 지원자 인적사항 (profiles 자동 prefill + 수정 가능)
// 섹션 2: 근무 관련 (업무선택 / 경험 / 시간대 / 교통 / 안전화 / 특이사항 / 비상연락처)
// 섹션 3: 동의 (제3자 제공 동의 1개만 — 수집·이용은 온보딩 포괄 동의로 대체)
// 주민번호 뒤 1자리(성별코드) 절대 미수집 — applicant_gender(남/여)로 대체
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronDown, ChevronUp, Phone, Check,
  Loader2, Sparkles, Briefcase, AlertCircle,
} from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// ── 기본 업무 옵션 (공고에 task_options 없을 때 fallback) ──
const DEFAULT_TASK_OPTIONS = ['상차', '하차', '분류', '피킹', '포장']

// ── 안전화 사이즈 옵션 (230~290mm, 5mm 단위) ──
const SHOE_SIZE_OPTIONS = ['230', '235', '240', '245', '250', '255', '260', '265', '270', '275', '280', '285', '290']

// ── 폼 데이터 타입 ──
interface ApplyFormData {
  // 섹션 1: 인적사항
  applicant_name: string
  birth_year: string
  birth_month: string
  birth_day: string
  applicant_gender: 'male' | 'female' | ''
  applicant_phone: string
  // 섹션 2: 근무 관련
  applied_task: string
  prior_experience_90d: boolean | null  // null = 미선택
  preferred_shift: 'morning' | 'afternoon' | 'night' | 'any' | ''
  transportation: 'car' | 'public' | 'shuttle' | ''
  shoe_size: string
  notes: string
  emergency_contact: string
  // 섹션 3: 동의
  consent_third_party: boolean
}

// ── Props 타입 ──
interface ApplyFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    applicant_name: string
    applicant_birth: string    // YYYY-MM-DD
    applicant_gender: 'male' | 'female'
    applicant_phone: string
    applied_task: string
    prior_experience_90d: boolean
    preferred_shift: 'morning' | 'afternoon' | 'night' | 'any'
    transportation: 'car' | 'public' | 'shuttle'
    shoe_size: string
    notes?: string
    emergency_contact?: string
    consent_third_party: boolean
    work_date?: string | null
  }) => Promise<void>
  jobTitle: string             // 공고 제목 (모달 상단 표시)
  isSubmitting: boolean
  taskOptions?: string[]       // 공고별 업무 옵션 (없으면 DEFAULT_TASK_OPTIONS 사용)
  shiftOptions?: string[]      // 공고별 모집 근무조 (없거나 빈 배열이면 전체 표시)
  workDate?: string | null     // 공고 근무 예정일 (중복 체크에 전달)
}

// ── 제3자 제공 상세 내용 ──
const THIRD_PARTY_DETAIL = `제공받는 자: 공고 등록사(채용 담당 기업 — 쿠팡풀필먼트서비스, CJ대한통운, 마켓컬리 등)
제공하는 항목: 성명, 생년월일, 성별, 휴대폰번호, 지원 업무, 센터 근무 경험, 안전화 사이즈, 특이사항
제공 목적: 채용 절차 진행 및 출근 확정 통보
보유 기간: 채용 종료 후 3개월
※ 정보를 제공받는 자가 달라질 경우 별도 동의를 받습니다.`.trim()

export default function ApplyFormModal({
  isOpen,
  onClose,
  onSubmit,
  jobTitle,
  isSubmitting,
  taskOptions,
  shiftOptions,
  workDate,
}: ApplyFormModalProps) {
  const { user } = useAuth()

  // 실제 사용할 업무 옵션 (공고별 또는 기본값)
  const effectiveTaskOptions =
    taskOptions && taskOptions.length > 0 ? taskOptions : DEFAULT_TASK_OPTIONS

  // 실제 표시할 근무조 버튼 목록
  // shift_options가 있으면 해당 조만 + 무관 항상 추가
  // 없거나 비어있으면 전체(오전/오후/야간/무관) 표시
  const ALL_SHIFTS = [
    { value: 'morning',   label: '오전' },
    { value: 'afternoon', label: '오후' },
    { value: 'night',     label: '야간' },
    { value: 'any',       label: '무관' },
  ] as const
  const effectiveShifts =
    shiftOptions && shiftOptions.length > 0
      ? [
          ...ALL_SHIFTS.filter(s => s.value !== 'any' && shiftOptions.includes(s.value)),
          { value: 'any' as const, label: '무관' },  // 무관은 항상 포함
        ]
      : [...ALL_SHIFTS]

  // 폼 초기 상태
  const emptyForm: ApplyFormData = {
    applicant_name: '',
    birth_year: '', birth_month: '', birth_day: '',
    applicant_gender: '',
    applicant_phone: '',
    applied_task: '',
    prior_experience_90d: null,
    preferred_shift: '',
    transportation: '',
    shoe_size: '',
    notes: '',
    emergency_contact: '',
    consent_third_party: false,
  }

  const [form, setForm] = useState<ApplyFormData>(emptyForm)
  const [thirdPartyOpen, setThirdPartyOpen] = useState(false)  // 제3자 상세 아코디언
  const [errors, setErrors] = useState<Partial<Record<keyof ApplyFormData, string>>>({})
  const [prefilled, setPrefilled] = useState(false)

  // ── 모달 열릴 때 profiles 에서 자동 prefill ──
  useEffect(() => {
    if (!isOpen) return

    // 리셋
    setErrors({})
    setThirdPartyOpen(false)
    setPrefilled(false)

    if (!user) {
      setForm(emptyForm)
      return
    }

    if (!supabase) return  // null 가드 — TS18047 방지

    supabase
      .from('profiles')
      .select('full_name, birthdate, phone_number, gender')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setForm(emptyForm)
          return
        }

        // birthdate "1990-05-03" → year/month/day 분리
        let birthYear = '', birthMonth = '', birthDay = ''
        if (data.birthdate) {
          const parts = (data.birthdate as string).split('-')
          birthYear  = parts[0] || ''
          birthMonth = parts[1] ? String(parseInt(parts[1], 10)) : ''
          birthDay   = parts[2] ? String(parseInt(parts[2], 10)) : ''
        }

        // profiles.gender → 성별 자동 선택
        const prefillGender = (data.gender === 'male' || data.gender === 'female')
          ? data.gender as 'male' | 'female'
          : ''

        const hasPrefillData = !!(data.full_name || data.birthdate || data.phone_number || data.gender)

        setForm({
          ...emptyForm,
          applicant_name: data.full_name || '',
          birth_year: birthYear,
          birth_month: birthMonth,
          birth_day: birthDay,
          applicant_gender: prefillGender,
          applicant_phone: data.phone_number || '',
        })
        setPrefilled(hasPrefillData)
      })
  }, [isOpen, user])  // eslint-disable-line react-hooks/exhaustive-deps

  // ── 휴대폰 번호 자동 포맷 (010-0000-0000) ──
  function formatPhone(raw: string): string {
    const nums = raw.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 3) return nums
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`
  }

  // ── 유효성 검사 ──
  function validate(): boolean {
    const newErrors: Partial<Record<keyof ApplyFormData, string>> = {}

    // 섹션 1 검증
    if (form.applicant_name.trim().length < 2) {
      newErrors.applicant_name = '이름은 2자 이상 입력해주세요.'
    }

    const year = parseInt(form.birth_year)
    const month = parseInt(form.birth_month)
    const day = parseInt(form.birth_day)

    if (!form.birth_year || !form.birth_month || !form.birth_day) {
      newErrors.birth_year = '생년월일을 모두 입력해주세요.'
    } else if (isNaN(year) || isNaN(month) || isNaN(day)) {
      newErrors.birth_year = '올바른 생년월일을 입력해주세요.'
    } else if (form.birth_year.length !== 4 || year < 1930) {
      newErrors.birth_year = '연도는 4자리로 입력해주세요. (예: 1990)'
    } else if (new Date().getFullYear() - year < 15) {
      newErrors.birth_year = '만 15세 미만은 지원할 수 없습니다.'
    }

    if (!form.applicant_gender) {
      newErrors.applicant_gender = '성별을 선택해주세요.'
    }

    const phoneRaw = form.applicant_phone.replace(/\D/g, '')
    if (phoneRaw.length < 10 || phoneRaw.length > 11) {
      newErrors.applicant_phone = '올바른 휴대폰 번호를 입력해주세요.'
    }

    // 섹션 2 검증
    if (!form.applied_task) {
      newErrors.applied_task = '지원 업무를 선택해주세요.'
    }
    if (form.prior_experience_90d === null) {
      newErrors.prior_experience_90d = '90일 이내 근무 경험 여부를 선택해주세요.'
    }
    if (!form.preferred_shift) {
      newErrors.preferred_shift = '희망 출근 시간대를 선택해주세요.'
    }
    if (!form.transportation) {
      newErrors.transportation = '교통 수단을 선택해주세요.'
    }
    if (!form.shoe_size) {
      newErrors.shoe_size = '안전화 사이즈를 선택해주세요.'
    }
    if (form.notes.length > 300) {
      newErrors.notes = '특이사항은 300자 이하로 입력해주세요.'
    }

    // 섹션 3 검증
    if (!form.consent_third_party) {
      newErrors.consent_third_party = '제3자 제공 동의는 필수입니다.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── 제출 처리 ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const year = form.birth_year
    const month = form.birth_month.padStart(2, '0')
    const day = form.birth_day.padStart(2, '0')

    await onSubmit({
      applicant_name: form.applicant_name.trim(),
      applicant_birth: `${year}-${month}-${day}`,
      applicant_gender: form.applicant_gender as 'male' | 'female',
      applicant_phone: form.applicant_phone.replace(/\D/g, ''),
      applied_task: form.applied_task,
      prior_experience_90d: form.prior_experience_90d as boolean,
      preferred_shift: form.preferred_shift as 'morning' | 'afternoon' | 'night' | 'any',
      transportation: form.transportation as 'car' | 'public' | 'shuttle',
      shoe_size: form.shoe_size,
      notes: form.notes.trim() || undefined,
      emergency_contact: form.emergency_contact.replace(/\D/g, '') || undefined,
      consent_third_party: form.consent_third_party,
      work_date: workDate ?? null,
    })
  }

  // 제출 버튼 활성 조건: 제3자 동의 체크 + 제출 중 아님
  // 동의 미체크 상태에서도 클릭 가능 — validate()에서 에러 메시지 표시
  const canSubmit = !isSubmitting

  // 섹션 공통 헤더 스타일
  const sectionHeader = 'text-[13px] font-bold text-gray-500 uppercase tracking-wide mb-3 mt-1'

  // 라디오 그룹 옵션 공통 버튼 스타일
  function radioBtn(selected: boolean) {
    return `flex-1 py-2 rounded-xl border text-sm font-medium transition-colors ${
      selected
        ? 'bg-blue-500 border-blue-500 text-white'
        : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-300'
    }`
  }

  return (
    <AnimatePresence>
      {isOpen && (
        // 배경 오버레이
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
        >
          {/* 모달 본체 — 풀스크린 모달로 넉넉한 스크롤 공간 확보 */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto"
          >
            {/* ── 헤더 (sticky) ── */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">지원하기</h2>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{jobTitle}</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* ── 폼 ── */}
            <form onSubmit={handleSubmit} className="px-5 py-6 space-y-5">

              {/* 안내 문구 */}
              <p className="text-xs text-gray-400 leading-relaxed">
                수집된 정보는 해당 공고 지원 및 안전보건교육 대상 판별 목적으로 사용됩니다.
              </p>

              {/* ─────────────────────────────────────
                  섹션 1 — 지원자 정보 (prefill 자동)
              ───────────────────────────────────── */}
              <div>
                <p className={sectionHeader}>지원자 정보</p>

                {/* 자동 연계 배너 */}
                {prefilled && (
                  <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
                    <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <p className="text-xs text-blue-700 leading-relaxed">
                      <span className="font-semibold">회원 정보에서 자동으로 불러왔어요.</span>
                      <br />내용이 다르다면 수정 후 제출하세요.
                    </p>
                  </div>
                )}

                {/* 성명 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <span className="text-red-500 mr-1">*</span>성명
                  </label>
                  <input
                    type="text"
                    placeholder="실명을 입력해주세요"
                    value={form.applicant_name}
                    onChange={(e) => setForm(f => ({ ...f, applicant_name: e.target.value }))}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.applicant_name ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                  {errors.applicant_name && (
                    <p className="text-xs text-red-500 mt-1">{errors.applicant_name}</p>
                  )}
                </div>

                {/* 생년월일 — 연/월/일 라벨 + 연도 필드 넉넉하게 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <span className="text-red-500 mr-1">*</span>생년월일
                  </label>
                  <div className="flex gap-2 items-end">
                    {/* 연도 — flex-[3] + min-w로 4자리가 충분히 표시되도록 */}
                    <div className="flex-[3] min-w-[90px]">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1990"
                        maxLength={4}
                        value={form.birth_year}
                        onChange={(e) => setForm(f => ({ ...f, birth_year: e.target.value.replace(/\D/g, '') }))}
                        className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.birth_year ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                      <span className="text-[10px] text-gray-400 mt-0.5 block text-center">년</span>
                    </div>
                    {/* 월 */}
                    <div className="min-w-[58px] w-[58px]">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1"
                        maxLength={2}
                        value={form.birth_month}
                        onChange={(e) => setForm(f => ({ ...f, birth_month: e.target.value.replace(/\D/g, '') }))}
                        className={`w-full text-center py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.birth_year ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                      <span className="text-[10px] text-gray-400 mt-0.5 block text-center">월</span>
                    </div>
                    {/* 일 */}
                    <div className="min-w-[58px] w-[58px]">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="1"
                        maxLength={2}
                        value={form.birth_day}
                        onChange={(e) => setForm(f => ({ ...f, birth_day: e.target.value.replace(/\D/g, '') }))}
                        className={`w-full text-center py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.birth_year ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                        }`}
                      />
                      <span className="text-[10px] text-gray-400 mt-0.5 block text-center">일</span>
                    </div>
                  </div>
                  {errors.birth_year && (
                    <p className="text-xs text-red-500 mt-1">{errors.birth_year}</p>
                  )}
                </div>

                {/* 성별 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <span className="text-red-500 mr-1">*</span>성별
                  </label>
                  <div className="flex gap-3">
                    {(['male', 'female'] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, applicant_gender: g }))}
                        className={radioBtn(form.applicant_gender === g)}
                      >
                        {g === 'male' ? '남성' : '여성'}
                      </button>
                    ))}
                  </div>
                  {errors.applicant_gender && (
                    <p className="text-xs text-red-500 mt-1">{errors.applicant_gender}</p>
                  )}
                </div>

                {/* 휴대폰 번호 */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <span className="text-red-500 mr-1">*</span>휴대폰 번호
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="010-0000-0000"
                      value={form.applicant_phone}
                      onChange={(e) => setForm(f => ({ ...f, applicant_phone: formatPhone(e.target.value) }))}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.applicant_phone ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>
                  {errors.applicant_phone && (
                    <p className="text-xs text-red-500 mt-1">{errors.applicant_phone}</p>
                  )}
                </div>
              </div>

              {/* 섹션 구분선 */}
              <div className="border-t border-gray-100" />

              {/* ─────────────────────────────────────
                  섹션 2 — 근무 관련
              ───────────────────────────────────── */}
              <div>
                <p className={sectionHeader}>근무 관련</p>

                {/* 5. 지원 업무 선택 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <span className="text-red-500 mr-1">*</span>지원 업무
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <select
                      value={form.applied_task}
                      onChange={(e) => setForm(f => ({ ...f, applied_task: e.target.value }))}
                      className={`w-full pl-9 pr-8 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-no-repeat ${
                        errors.applied_task ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <option value="">업무를 선택해주세요</option>
                      {effectiveTaskOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.applied_task && (
                    <p className="text-xs text-red-500 mt-1">{errors.applied_task}</p>
                  )}
                </div>

                {/* 6. 90일 이내 센터 근무 경험 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    <span className="text-red-500 mr-1">*</span>
                    해당 센터에서 지난 90일 이내 근무한 경험이 있나요?
                  </label>
                  <p className="text-xs text-gray-400 mb-2 leading-relaxed">
                    신규 근로자 안전보건교육 대상 판별을 위해 수집합니다.
                    (산업안전보건법 제29조)
                  </p>
                  <div className="flex gap-3">
                    {([true, false] as const).map((val) => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, prior_experience_90d: val }))}
                        className={radioBtn(form.prior_experience_90d === val)}
                      >
                        {val ? '네, 있어요' : '아니요, 없어요'}
                      </button>
                    ))}
                  </div>
                  {errors.prior_experience_90d && (
                    <p className="text-xs text-red-500 mt-1">{errors.prior_experience_90d}</p>
                  )}
                </div>

                {/* 7. 희망 출근 시간대 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <span className="text-red-500 mr-1">*</span>희망 출근 시간대
                  </label>
                  {/* 공고에 설정된 근무조만 표시 (미설정이면 전체) */}
                  <div className={`grid gap-2 ${effectiveShifts.length <= 2 ? 'grid-cols-2' : effectiveShifts.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
                    {effectiveShifts.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, preferred_shift: opt.value }))}
                        className={radioBtn(form.preferred_shift === opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {errors.preferred_shift && (
                    <p className="text-xs text-red-500 mt-1">{errors.preferred_shift}</p>
                  )}
                </div>

                {/* 8. 교통 수단 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <span className="text-red-500 mr-1">*</span>교통 수단
                  </label>
                  <div className="flex gap-2">
                    {([
                      { value: 'car', label: '자차' },
                      { value: 'public', label: '대중교통' },
                      { value: 'shuttle', label: '셔틀 필요' },
                    ] as const).map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, transportation: opt.value }))}
                        className={radioBtn(form.transportation === opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {errors.transportation && (
                    <p className="text-xs text-red-500 mt-1">{errors.transportation}</p>
                  )}
                </div>

                {/* 9. 안전화 사이즈 */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    <span className="text-red-500 mr-1">*</span>안전화 사이즈
                    <span className="text-xs font-normal text-gray-400 ml-2">(안전화 지급용)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={form.shoe_size}
                      onChange={(e) => setForm(f => ({ ...f, shoe_size: e.target.value }))}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none ${
                        errors.shoe_size ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <option value="">사이즈 선택 (mm)</option>
                      {SHOE_SIZE_OPTIONS.map(sz => (
                        <option key={sz} value={sz}>{sz}mm</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {errors.shoe_size && (
                    <p className="text-xs text-red-500 mt-1">{errors.shoe_size}</p>
                  )}
                </div>

                {/* 10. 특이사항 / 건강상 이슈 (선택) */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    특이사항 / 건강상 이슈
                    <span className="text-xs font-normal text-gray-400 ml-2">(선택, 최대 300자)</span>
                  </label>
                  <textarea
                    placeholder="작업 배치 시 참고할 특이사항이나 건강상 이슈를 입력해주세요 (예: 허리 디스크, 오른손 부상 중)"
                    value={form.notes}
                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    maxLength={300}
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                      errors.notes ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                  <p className="text-xs text-gray-400 text-right mt-0.5">{form.notes.length}/300자</p>
                  {errors.notes && (
                    <p className="text-xs text-red-500 mt-1">{errors.notes}</p>
                  )}
                </div>

                {/* 11. 비상 연락처 (선택) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    비상 연락처
                    <span className="text-xs font-normal text-gray-400 ml-2">(선택, 산재 대비)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      inputMode="tel"
                      placeholder="010-0000-0000"
                      value={form.emergency_contact}
                      onChange={(e) => setForm(f => ({ ...f, emergency_contact: formatPhone(e.target.value) }))}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 섹션 구분선 */}
              <div className="border-t border-gray-100" />

              {/* ─────────────────────────────────────
                  섹션 3 — 동의 (제3자 제공 1개)
              ───────────────────────────────────── */}
              <div>
                <p className={sectionHeader}>동의</p>

                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  {/* 제3자 제공 동의 */}
                  <div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, consent_third_party: !f.consent_third_party }))}
                        className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                          form.consent_third_party
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {form.consent_third_party && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </button>
                      <span className="text-sm text-gray-800 flex-1">
                        <span className="text-red-500 font-medium">[필수] </span>
                        위 정보를 공고 등록사(고객사)에게 제공하는 것에 동의합니다.{' '}
                        <span className="font-semibold text-blue-600">제3자 제공</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setThirdPartyOpen(!thirdPartyOpen)}
                        className="text-gray-400 hover:text-gray-600 flex items-center gap-0.5 text-xs flex-shrink-0"
                      >
                        상세
                        {thirdPartyOpen
                          ? <ChevronUp className="w-3.5 h-3.5" />
                          : <ChevronDown className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                    {/* 상세 아코디언 */}
                    <AnimatePresence>
                      {thirdPartyOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <pre className="text-xs text-gray-500 bg-gray-50 px-4 pb-3 whitespace-pre-wrap font-sans leading-relaxed">
                            {THIRD_PARTY_DETAIL}
                          </pre>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {errors.consent_third_party && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    <p className="text-xs text-red-500">{errors.consent_third_party}</p>
                  </div>
                )}
              </div>

              {/* ── 제출 버튼 ── */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all ${
                  canSubmit
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    지원 중...
                  </span>
                ) : (
                  '지원서 제출하기'
                )}
              </button>

              {/* 하단 안내 */}
              <p className="text-xs text-gray-400 text-center leading-relaxed pb-2">
                입력하신 정보는 채용 목적으로만 사용됩니다.
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
