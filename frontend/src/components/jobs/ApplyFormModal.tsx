// 채용 지원 폼 모달 — 회원 프로필 자동 연계 + 개인정보 동의 (D-NEW-4)
// 로그인한 사용자가 "지원하기" 클릭 시 표시되는 모달
// 주민번호 뒤 1자리(성별코드) 절대 미수집 — applicant_gender(남/여)로 대체
// profiles 테이블(온보딩 시 저장)에서 이름/생년월일/전화번호 자동 prefill
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronDown, ChevronUp, Calendar, Phone, User, Check, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// 지원 폼 데이터 타입
interface ApplyFormData {
  applicant_name: string
  birth_year: string   // 6자리 생년월일: 연도
  birth_month: string
  birth_day: string
  applicant_gender: 'male' | 'female' | ''
  applicant_phone: string
  consent_collect: boolean
  consent_third_party: boolean
}

// 모달 Props 타입
interface ApplyFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    applicant_name: string
    applicant_birth: string  // YYYY-MM-DD
    applicant_gender: 'male' | 'female'
    applicant_phone: string
    consent_collect: boolean
    consent_third_party: boolean
  }) => Promise<void>
  jobTitle: string     // 공고 제목 (모달 상단 표시용)
  isSubmitting: boolean
}

// ── 개인정보 동의 전문 텍스트 ──
const COLLECT_POLICY_TEXT = `
수집 항목: 성명, 생년월일, 성별, 휴대폰번호
수집·이용 목적: 채용 지원 접수 및 전형 진행, 지원 현황 안내
보유 및 이용 기간: 채용 종료 후 6개월 (당선·불합격 관계없이)
※ 위 기간 이후 즉시 파기됩니다.
※ 개인정보 제공에 동의하지 않으실 수 있으나, 동의하지 않을 경우 지원 서비스 이용이 제한됩니다.
`.trim()

const THIRD_PARTY_POLICY_TEXT = `
제공받는 자: 지원한 공고의 채용 담당 기업(쿠팡풀필먼트서비스, CJ대한통운, 마켓컬리 등)
제공하는 항목: 성명, 생년월일, 성별, 휴대폰번호
제공 목적: 채용 절차 진행 및 합격 통보
보유 기간: 채용 종료 후 6개월
※ 정보를 제공받는 자가 달라질 경우 별도 동의를 받습니다.
`.trim()

export default function ApplyFormModal({
  isOpen,
  onClose,
  onSubmit,
  jobTitle,
  isSubmitting,
}: ApplyFormModalProps) {
  // 로그인된 사용자 정보 (프로필 prefill용)
  const { user } = useAuth()

  // 폼 데이터 상태
  const [form, setForm] = useState<ApplyFormData>({
    applicant_name: '',
    birth_year: '',
    birth_month: '',
    birth_day: '',
    applicant_gender: '',
    applicant_phone: '',
    consent_collect: false,
    consent_third_party: false,
  })

  // 각 동의 아코디언 열림 여부
  const [collectOpen, setCollectOpen] = useState(false)
  const [thirdPartyOpen, setThirdPartyOpen] = useState(false)

  // 유효성 검사 오류 메시지
  const [errors, setErrors] = useState<Partial<Record<keyof ApplyFormData, string>>>({})

  // 프로필 자동 연계 여부 (배너 표시용)
  const [prefilled, setPrefilled] = useState(false)

  // 모달이 열릴 때 profiles 테이블에서 회원 정보를 자동으로 불러옴
  useEffect(() => {
    if (!isOpen) return

    setErrors({})
    setCollectOpen(false)
    setThirdPartyOpen(false)
    setPrefilled(false)

    if (!user) {
      // 비로그인 상태면 빈 폼으로 시작
      setForm({
        applicant_name: '',
        birth_year: '',
        birth_month: '',
        birth_day: '',
        applicant_gender: '',
        applicant_phone: '',
        consent_collect: false,
        consent_third_party: false,
      })
      return
    }

    // 온보딩 시 저장한 프로필 값을 불러와서 자동 채움
    // gender 컬럼 추가됨 (2026-04-11) — 온보딩에서 입력한 성별도 prefill
    if (!supabase) return // supabase 클라이언트가 초기화되지 않은 경우 방어 처리
    supabase
      .from('profiles')
      .select('full_name, birthdate, phone_number, gender')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          // 프로필 조회 실패 시 빈 폼으로 (기존 동작 유지)
          setForm({
            applicant_name: '',
            birth_year: '',
            birth_month: '',
            birth_day: '',
            applicant_gender: '',
            applicant_phone: '',
            consent_collect: false,
            consent_third_party: false,
          })
          return
        }

        // birthdate "1990-05-03" → year:"1990", month:"5", day:"3"
        let birthYear = '', birthMonth = '', birthDay = ''
        if (data.birthdate) {
          const parts = (data.birthdate as string).split('-')
          birthYear  = parts[0] || ''
          birthMonth = parts[1] ? String(parseInt(parts[1], 10)) : ''
          birthDay   = parts[2] ? String(parseInt(parts[2], 10)) : ''
        }

        // profiles.gender 가 있으면 자동 선택, 없으면 빈 상태 (기존 회원 등)
        const prefillGender = (data.gender === 'male' || data.gender === 'female')
          ? data.gender
          : ''

        const hasPrefillData = !!(data.full_name || data.birthdate || data.phone_number || data.gender)

        setForm({
          applicant_name: data.full_name || '',
          birth_year:     birthYear,
          birth_month:    birthMonth,
          birth_day:      birthDay,
          applicant_gender: prefillGender,   // 성별 자동 prefill (온보딩 입력값)
          applicant_phone: data.phone_number || '',
          consent_collect: false,
          consent_third_party: false,
        })
        setPrefilled(hasPrefillData)
      })
  }, [isOpen, user])

  // ── 휴대폰 번호 자동 포맷 (010-0000-0000) ──
  function formatPhone(raw: string): string {
    // 숫자만 추출
    const nums = raw.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 3) return nums
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`
  }

  // ── 유효성 검사 ──
  function validate(): boolean {
    const newErrors: Partial<Record<keyof ApplyFormData, string>> = {}

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
      // 연도는 반드시 4자리 (1930~현재 사이)
      // padStart("85" → "2085") 우회 방지 — 직접 4자리 입력 강제
      newErrors.birth_year = '연도는 4자리로 입력해주세요. (예: 1990)'
    } else {
      // 만 15세 미만 차단
      const currentYear = new Date().getFullYear()
      const age = currentYear - year
      if (age < 15) {
        newErrors.birth_year = '만 15세 미만은 지원할 수 없습니다.'
      }
    }

    if (!form.applicant_gender) {
      newErrors.applicant_gender = '성별을 선택해주세요.'
    }

    const phoneRaw = form.applicant_phone.replace(/\D/g, '')
    if (phoneRaw.length < 10 || phoneRaw.length > 11) {
      newErrors.applicant_phone = '올바른 휴대폰 번호를 입력해주세요.'
    }

    if (!form.consent_collect) {
      newErrors.consent_collect = '개인정보 수집·이용에 동의해주세요.'
    }

    if (!form.consent_third_party) {
      newErrors.consent_third_party = '제3자 제공에 동의해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ── 제출 처리 ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    // validate()에서 4자리 강제 검증 통과 후 도달 — padStart 불필요
    const year = form.birth_year                     // 이미 4자리 확정
    const month = form.birth_month.padStart(2, '0')
    const day = form.birth_day.padStart(2, '0')

    await onSubmit({
      applicant_name: form.applicant_name.trim(),
      applicant_birth: `${year}-${month}-${day}`,
      applicant_gender: form.applicant_gender as 'male' | 'female',
      applicant_phone: form.applicant_phone.replace(/\D/g, ''),
      consent_collect: form.consent_collect,
      consent_third_party: form.consent_third_party,
    })
  }

  // 두 동의가 모두 체크되었는지 (제출 버튼 활성 조건)
  const canSubmit = form.consent_collect && form.consent_third_party && !isSubmitting

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
          {/* 모달 본체 */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto"
          >
            {/* 헤더 */}
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

            {/* 폼 */}
            <form onSubmit={handleSubmit} className="px-5 py-6 space-y-5">

              {/* ─ 회원 정보 자동 연계 안내 배너 ─ */}
              {prefilled && (
                <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <span className="font-semibold">회원 정보에서 자동으로 불러왔어요.</span>
                    <br />내용이 다르다면 수정 후 제출하세요.
                  </p>
                </div>
              )}

              {/* ─ 성명 ─ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <span className="text-red-500 mr-1">*</span>성명
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="실명을 입력해주세요"
                    value={form.applicant_name}
                    onChange={(e) => setForm(f => ({ ...f, applicant_name: e.target.value }))}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      errors.applicant_name ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>
                {errors.applicant_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.applicant_name}</p>
                )}
              </div>

              {/* ─ 생년월일 ─ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <span className="text-red-500 mr-1">*</span>생년월일
                  <span className="text-xs font-normal text-gray-400 ml-2">(주민번호 아님, 6자리 생년월일)</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="연도(4자리)"
                      maxLength={4}
                      value={form.birth_year}
                      onChange={(e) => setForm(f => ({ ...f, birth_year: e.target.value.replace(/\D/g, '') }))}
                      className={`w-full pl-8 pr-2 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.birth_year ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                      }`}
                    />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="월"
                    maxLength={2}
                    value={form.birth_month}
                    onChange={(e) => setForm(f => ({ ...f, birth_month: e.target.value.replace(/\D/g, '') }))}
                    className={`w-16 text-center py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.birth_year ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="일"
                    maxLength={2}
                    value={form.birth_day}
                    onChange={(e) => setForm(f => ({ ...f, birth_day: e.target.value.replace(/\D/g, '') }))}
                    className={`w-16 text-center py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.birth_year ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  />
                </div>
                {errors.birth_year && (
                  <p className="text-xs text-red-500 mt-1">{errors.birth_year}</p>
                )}
              </div>

              {/* ─ 성별 ─ */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  <span className="text-red-500 mr-1">*</span>성별
                </label>
                <div className="flex gap-3">
                  {(['male', 'female'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, applicant_gender: g }))}
                      className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                        form.applicant_gender === g
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-blue-300'
                      }`}
                    >
                      {g === 'male' ? '남성' : '여성'}
                    </button>
                  ))}
                </div>
                {errors.applicant_gender && (
                  <p className="text-xs text-red-500 mt-1">{errors.applicant_gender}</p>
                )}
              </div>

              {/* ─ 휴대폰 번호 ─ */}
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

              {/* ─ 개인정보 동의 영역 ─ */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <p className="px-4 py-3 text-xs font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
                  개인정보 동의 (필수)
                </p>

                {/* 수집·이용 동의 */}
                <div className="border-b border-gray-100">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, consent_collect: !f.consent_collect }))}
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${
                        form.consent_collect
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {form.consent_collect && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </button>
                    <span className="text-sm text-gray-800 flex-1">
                      <span className="text-red-500 font-medium">[필수] </span>
                      개인정보 수집·이용에 동의합니다.
                    </span>
                    <button
                      type="button"
                      onClick={() => setCollectOpen(!collectOpen)}
                      className="text-gray-400 hover:text-gray-600 flex items-center gap-0.5 text-xs"
                    >
                      상세
                      {collectOpen
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                  {/* 상세 아코디언 */}
                  <AnimatePresence>
                    {collectOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <pre className="text-xs text-gray-500 bg-gray-50 px-4 pb-3 whitespace-pre-wrap font-sans leading-relaxed">
                          {COLLECT_POLICY_TEXT}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

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
                      개인정보를 제3자에게 제공하는 것에 동의합니다.
                    </span>
                    <button
                      type="button"
                      onClick={() => setThirdPartyOpen(!thirdPartyOpen)}
                      className="text-gray-400 hover:text-gray-600 flex items-center gap-0.5 text-xs"
                    >
                      상세
                      {thirdPartyOpen
                        ? <ChevronUp className="w-3.5 h-3.5" />
                        : <ChevronDown className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                  <AnimatePresence>
                    {thirdPartyOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <pre className="text-xs text-gray-500 bg-gray-50 px-4 pb-3 whitespace-pre-wrap font-sans leading-relaxed">
                          {THIRD_PARTY_POLICY_TEXT}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* 동의 오류 메시지 */}
              {(errors.consent_collect || errors.consent_third_party) && (
                <p className="text-xs text-red-500">
                  {errors.consent_collect || errors.consent_third_party}
                </p>
              )}

              {/* 제출 버튼 */}
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

              {/* 안내 문구 */}
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                입력하신 정보는 채용 목적으로만 사용되며<br />
                채용 종료 후 6개월 이내 파기됩니다.
              </p>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
