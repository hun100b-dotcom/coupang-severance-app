// 최초 로그인 후 추가 정보 입력 페이지
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

export default function OnboardingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    if (!agreeTerms || !agreePrivacy) {
      setError('필수 약관에 동의해 주세요.')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[480px]">
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

          {/* 약관 동의 */}
          <div className="mb-6 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 mt-0.5"
              />
              <span className="text-sm text-[#191F28]">
                <span className="font-semibold text-red-500">[필수]</span> 서비스 이용약관에 동의합니다.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 mt-0.5"
              />
              <span className="text-sm text-[#191F28]">
                <span className="font-semibold text-red-500">[필수]</span> 개인정보 처리방침에 동의합니다.
              </span>
            </label>
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
            className="w-full h-12 rounded-full bg-[#3182F6] text-white font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
          >
            {loading ? '저장 중...' : '시작하기'}
          </button>

          {/* 안내 문구 */}
          <p className="text-xs text-gray-400 text-center mt-4">
            입력하신 개인정보는 안전하게 암호화되어 저장됩니다.
          </p>
        </form>
      </div>
    </div>
  )
}
