// 최초 로그인 후 추가 정보 입력 페이지 — 개인정보보호법 준수 버전
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function OnboardingPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [agreePersonalInfo, setAgreePersonalInfo] = useState(false) // 개인정보 수집·이용 동의 (필수)
  const [agreeTerms, setAgreeTerms] = useState(false) // 서비스 이용약관 (필수)
  const [agreePrivacy, setAgreePrivacy] = useState(false) // 개인정보 처리방침 (필수)
  const [agreeMarketingSMS, setAgreeMarketingSMS] = useState(false) // 마케팅 SMS (선택)
  const [agreeMarketingEmail, setAgreeMarketingEmail] = useState(false) // 마케팅 이메일 (선택)
  const [agreeMarketingPhone, setAgreeMarketingPhone] = useState(false) // 마케팅 전화 (선택)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 로그인 안 된 사용자는 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [authLoading, user, navigate])

  // 핸드폰 번호 자동 포맷팅 (010-1234-5678)
  const handlePhoneChange = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, '')
    let formatted = numbers

    if (numbers.length <= 3) {
      formatted = numbers
    } else if (numbers.length <= 7) {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    } else {
      formatted = `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
    }

    setPhoneNumber(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // 유효성 검사
    if (!fullName.trim()) {
      setError('이름을 입력해 주세요.')
      return
    }
    if (!birthdate) {
      setError('생년월일을 입력해 주세요.')
      return
    }
    if (!phoneNumber.trim()) {
      setError('핸드폰 번호를 입력해 주세요.')
      return
    }
    if (!agreePersonalInfo || !agreeTerms || !agreePrivacy) {
      setError('필수 약관에 모두 동의해 주세요.')
      return
    }

    // 핸드폰 번호 형식 검증 (010-XXXX-XXXX)
    const phoneRegex = /^01[016789]-\d{3,4}-\d{4}$/
    if (!phoneRegex.test(phoneNumber)) {
      setError('올바른 핸드폰 번호 형식이 아닙니다. (예: 010-1234-5678)')
      return
    }

    // 만 18세 이상 검증
    const birthDate = new Date(birthdate)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    const dayDiff = today.getDate() - birthDate.getDate()
    const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age

    if (actualAge < 18) {
      setError('만 18세 이상만 가입 가능합니다.')
      return
    }

    setLoading(true)

    try {
      if (!user || !supabase) throw new Error('로그인 정보를 확인할 수 없습니다.')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          birthdate,
          phone_number: phoneNumber,
          display_name: fullName.trim(),
          terms_agreed_at: new Date().toISOString(),
          // 정보통신망법 제50조: 전화/SMS/이메일 각각 별도 동의
          marketing_sms: agreeMarketingSMS,
          marketing_email: agreeMarketingEmail,
          marketing_phone: agreeMarketingPhone,
          marketing_agreed_at: (agreeMarketingSMS || agreeMarketingEmail || agreeMarketingPhone) ? new Date().toISOString() : null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // 홈으로 이동
      navigate('/home')
    } catch (err) {
      console.error('온보딩 저장 실패:', err)
      setError(err instanceof Error ? err.message : '정보 저장에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 로딩 중일 때 표시
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <p className="text-[#191F28] font-medium">로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[520px]">
        {/* 상단 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#3182F6] overflow-hidden mb-4 shadow-lg shadow-blue-500/30">
            <img src="/catch-logo.png" alt="CATCH" className="w-full h-full object-contain p-2" />
          </div>
          <h1 className="text-2xl font-bold text-[#191F28] mb-2">환영합니다! 👋</h1>
          <p className="text-sm text-[#4E5968]">서비스 이용을 위해 추가 정보를 입력해 주세요.</p>
        </div>

        {/* 폼 카드 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-gray-100/50 p-8">
          {/* 이름 */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-[#191F28] mb-2">
              이름 (실명) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="홍길동"
              maxLength={50}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[#191F28] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 생년월일 */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-[#191F28] mb-2">
              생년월일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={birthdate}
              onChange={(e) => setBirthdate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[#191F28] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 핸드폰 번호 */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-[#191F28] mb-2">
              핸드폰 번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="010-1234-5678"
              maxLength={13}
              className="w-full h-12 px-4 rounded-xl border border-gray-200 text-[#191F28] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* 개인정보 수집·이용 고지 (개인정보보호법 제15조, 제22조 준수) */}
          <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <p className="font-semibold text-sm text-[#191F28] mb-3">📋 개인정보 수집·이용 안내</p>
            <ul className="text-xs text-gray-700 space-y-1.5 leading-relaxed">
              <li>• <span className="font-semibold">수집 목적:</span> 퇴직금·실업급여 계산 결과 저장 및 1:1 상담 제공</li>
              <li>• <span className="font-semibold">수집 항목:</span> 이메일, 실명, 생년월일, 핸드폰번호</li>
              <li>• <span className="font-semibold">보유 기간:</span> 회원 탈퇴 시까지 (탈퇴 후 즉시 파기)</li>
              <li>• <span className="font-semibold">거부 권리:</span> 동의를 거부할 수 있으나, 서비스 이용이 제한됩니다.</li>
            </ul>
          </div>

          {/* 약관 동의 */}
          <div className="mb-6 space-y-3">
            {/* 필수 동의 */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreePersonalInfo}
                onChange={(e) => setAgreePersonalInfo(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 mt-0.5"
              />
              <span className="text-sm text-[#191F28] group-hover:text-blue-600 transition-colors">
                <span className="font-semibold text-red-500">[필수]</span> 개인정보 수집·이용에 동의합니다.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 mt-0.5"
              />
              <span className="text-sm text-[#191F28] group-hover:text-blue-600 transition-colors">
                <span className="font-semibold text-red-500">[필수]</span> <a href="/terms/service" target="_blank" className="underline">서비스 이용약관</a>에 동의합니다.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 mt-0.5"
              />
              <span className="text-sm text-[#191F28] group-hover:text-blue-600 transition-colors">
                <span className="font-semibold text-red-500">[필수]</span> <a href="/terms/privacy" target="_blank" className="underline">개인정보 처리방침</a>에 동의합니다.
              </span>
            </label>

            <div className="border-t border-gray-200 pt-3 mt-4">
              <p className="text-xs text-gray-500 mb-2">선택 동의 (마케팅 정보 수신)</p>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={agreeMarketingSMS}
                  onChange={(e) => setAgreeMarketingSMS(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 mt-0.5"
                />
                <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                  [선택] SMS/문자 마케팅 수신 동의
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group mt-2">
                <input
                  type="checkbox"
                  checked={agreeMarketingEmail}
                  onChange={(e) => setAgreeMarketingEmail(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 mt-0.5"
                />
                <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                  [선택] 이메일 마케팅 수신 동의
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group mt-2">
                <input
                  type="checkbox"
                  checked={agreeMarketingPhone}
                  onChange={(e) => setAgreeMarketingPhone(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 mt-0.5"
                />
                <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                  [선택] 전화(음성) 마케팅 수신 동의
                </span>
              </label>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">⚠️ {error}</p>
            </div>
          )}

          {/* 제출 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-[#3182F6] text-white font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/30"
          >
            {loading ? '저장 중...' : '시작하기'}
          </button>

          {/* 안내 문구 */}
          <p className="text-xs text-gray-400 text-center mt-4">
            입력하신 개인정보는 Supabase RLS로 보호되며, 관리자 접근 로그가 기록됩니다.
          </p>
        </form>
      </div>
    </div>
  )
}
