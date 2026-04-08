// 카카오 / 구글 소셜 로그인 페이지
// Supabase OAuth를 통해 해당 제공자 로그인 화면으로 이동
// Google: @react-oauth/google + supabase.auth.signInWithIdToken 사용 (Supabase URL 노출 없음)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleLogin, CredentialResponse } from '@react-oauth/google'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Provider = 'kakao' | 'google'

// 배포 환경과 로컬 개발 환경 모두 지원하는 콜백 URL
function getRedirectUrl(): string {
  if (typeof window !== 'undefined') {
    // 로컬 개발 환경에서는 localhost 사용
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `${window.location.origin}/auth/callback`
    }
  }
  // 프로덕션 환경
  return 'https://catch-daily-worker.vercel.app/auth/callback'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { isLoggedIn, loading, needsOnboarding } = useAuth()
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // ── 약관 동의 상태 ──
  const [terms, setTerms] = useState(false)       // [필수] 이용약관
  const [privacy, setPrivacy] = useState(false)   // [필수] 개인정보처리방침 + 국외이전
  const [marketing, setMarketing] = useState(false) // [선택] 마케팅 정보 수신

  // 전체 동의 여부 (3개 모두 동의된 경우)
  const allAgreed = terms && privacy && marketing

  // 전체 동의 토글: 체크 시 3개 모두 true, 해제 시 3개 모두 false
  const handleAllAgree = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTerms(e.target.checked)
    setPrivacy(e.target.checked)
    setMarketing(e.target.checked)
  }

  // 이미 로그인된 사용자는 적절한 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && isLoggedIn) {
      if (needsOnboarding) {
        navigate('/onboarding', { replace: true })
      } else {
        navigate('/home', { replace: true })
      }
    }
  }, [loading, isLoggedIn, needsOnboarding, navigate])

  const handleLogin = async (provider: Provider) => {
    if (!supabase) {
      setErrorMsg('로그인 설정(Supabase URL/Key)이 올바르지 않습니다.')
      return
    }

    // 필수 약관 미동의 시 버튼 비활성화로 이미 막혀있지만 방어적으로 한번 더 확인
    if (!terms || !privacy) {
      setErrorMsg('필수 약관에 동의해 주세요.')
      return
    }

    // OAuth 리다이렉트 후 콜백 페이지에서 마케팅 동의 여부를 저장할 수 있도록
    // localStorage에 임시 보관 (콜백 완료 후 삭제됨)
    localStorage.setItem('pending_marketing_agreed', marketing ? 'true' : 'false')

    setLoadingProvider(provider)
    setErrorMsg(null)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: getRedirectUrl(),
          queryParams: provider === 'google'
            ? { prompt: 'select_account' }
            : { prompt: 'login' },
        },
      })

      if (error) {
        console.error('[로그인 오류]', provider, error)
        // 오류 시 localStorage 정리
        localStorage.removeItem('pending_marketing_agreed')
        if (error.message.includes('provider is not enabled')) {
          setErrorMsg(`${provider === 'kakao' ? '카카오' : 'Google'} 로그인이 현재 비활성화되어 있습니다. 관리자에게 문의해주세요.`)
        } else {
          setErrorMsg(`로그인 중 오류가 발생했습니다.\n${error.message}`)
        }
        return
      }

      if (data?.url) {
        window.location.href = data.url
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      localStorage.removeItem('pending_marketing_agreed')
      setErrorMsg(`로그인 중 알 수 없는 오류가 발생했습니다.\n${message}`)
    } finally {
      setLoadingProvider(null)
    }
  }

  // Google Identity Services 콜백: ID 토큰을 Supabase signInWithIdToken으로 처리
  const handleGoogleCredential = async (credentialResponse: CredentialResponse) => {
    if (!supabase) {
      setErrorMsg('로그인 설정(Supabase URL/Key)이 올바르지 않습니다.')
      return
    }

    // 필수 약관 미동의 시 방어적으로 한번 더 확인
    if (!terms || !privacy) {
      setErrorMsg('필수 약관에 동의해 주세요.')
      return
    }

    // 마케팅 동의 여부를 localStorage에 임시 보관 (콜백 페이지에서 저장)
    localStorage.setItem('pending_marketing_agreed', marketing ? 'true' : 'false')

    setLoadingProvider('google')
    setErrorMsg(null)

    try {
      if (!credentialResponse.credential) {
        setErrorMsg('Google 인증이 실패했습니다. 다시 시도해 주세요.')
        setLoadingProvider(null)
        localStorage.removeItem('pending_marketing_agreed')
        return
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: credentialResponse.credential,
      })

      if (error) {
        console.error('[Google IdToken 로그인 오류]', error)
        localStorage.removeItem('pending_marketing_agreed')
        setErrorMsg(`Google 로그인 중 오류가 발생했습니다.\n${error.message}`)
        setLoadingProvider(null)
        return
      }

      // 성공 시 콜백 페이지로 이동 (onboarding 체크는 콜백 페이지에서 수행)
      window.location.href = '/auth/callback'
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      localStorage.removeItem('pending_marketing_agreed')
      setErrorMsg(`Google 로그인 중 알 수 없는 오류가 발생했습니다.\n${message}`)
      setLoadingProvider(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4 py-8 relative z-10">
      <div className="w-full max-w-[400px]">
        {/* 상단 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#3182F6] overflow-hidden mb-3 shadow-lg shadow-blue-500/30">
            <img src="/catch-logo.png" alt="CATCH" className="w-full h-full object-contain p-1.5" />
          </div>
          <h1 className="text-xl font-bold text-[#191F28] mb-2">간편 로그인</h1>
          <p className="text-sm text-[#4E5968]">카카오 또는 Google 계정으로 빠르게 시작해 보세요.</p>
        </div>

        {/* ── 약관 동의 섹션 ── */}
        <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">

          {/* 전체 동의 토글 (3개 동시 체크/해제) */}
          <label className="flex items-center gap-3 cursor-pointer mb-3 pb-3 border-b border-gray-200">
            <input
              type="checkbox"
              checked={allAgreed}
              onChange={handleAllAgree}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm font-semibold text-gray-800">전체 동의</span>
          </label>

          {/* 필수 1: 이용약관 동의 */}
          <label className="flex items-center gap-3 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={terms}
              onChange={e => setTerms(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">[필수] 이용약관 동의</span>
            {/* 이용약관 페이지로 이동 (label 버블링 방지) */}
            <button
              type="button"
              onClick={e => { e.preventDefault(); navigate('/terms-of-service') }}
              className="ml-auto text-xs text-blue-500 underline whitespace-nowrap"
            >
              보기
            </button>
          </label>

          {/* 필수 2: 개인정보 수집·이용 및 국외이전 동의 */}
          <label className="flex items-center gap-3 cursor-pointer mb-2">
            <input
              type="checkbox"
              checked={privacy}
              onChange={e => setPrivacy(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700 leading-tight">[필수] 개인정보 수집·이용 및 국외이전 동의</span>
            {/* 개인정보처리방침 페이지로 이동 */}
            <button
              type="button"
              onClick={e => { e.preventDefault(); navigate('/privacy-policy') }}
              className="ml-auto text-xs text-blue-500 underline whitespace-nowrap"
            >
              보기
            </button>
          </label>

          {/* 선택: 마케팅 정보 수신 동의 */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={marketing}
              onChange={e => setMarketing(e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-700">[선택] 마케팅 정보 수신 동의</span>
          </label>
        </div>

        {/* 소셜 로그인 버튼 */}
        <div className="bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-gray-100/50 p-6">
          <p className="text-sm font-semibold text-[#191F28] mb-4">소셜 계정 선택</p>

          {/* 에러 메시지 */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 whitespace-pre-line">{errorMsg}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* 카카오 로그인 — 필수 약관 미동의 시 비활성화 */}
            <button
              type="button"
              onClick={() => handleLogin('kakao')}
              disabled={!!loadingProvider || !terms || !privacy}
              className={`w-full h-12 rounded-full bg-[#FEE500] text-[#191600] flex items-center justify-center gap-2 text-sm font-semibold transition-opacity ${
                !terms || !privacy ? 'opacity-50 cursor-not-allowed' : 'disabled:opacity-60'
              }`}
            >
              <span className="w-5 h-5 rounded-md bg-[#191600] text-[#FEE500] flex items-center justify-center text-[10px] font-bold">
                K
              </span>
              {loadingProvider === 'kakao' ? '카카오로 로그인 중...' : '카카오로 시작하기'}
            </button>

            {/* Google 로그인 — Google Identity Services 사용 (Supabase URL 노출 없음) */}
            <div className={`w-full flex justify-center ${!terms || !privacy ? 'opacity-50 pointer-events-none' : ''}`}>
              {loadingProvider === 'google' ? (
                <div className="w-full h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm text-gray-500">
                  Google로 로그인 중...
                </div>
              ) : (
                <GoogleLogin
                  onSuccess={handleGoogleCredential}
                  onError={() => setErrorMsg('Google 로그인에 실패했습니다. 다시 시도해 주세요.')}
                  size="large"
                  width={360}
                  shape="pill"
                  text="continue_with"
                  theme="outline"
                />
              )}
            </div>
          </div>

          {/* 구글 액세스 차단 안내 */}
          <p className="text-[11px] text-[#8B95A1] text-center mt-4 leading-relaxed">
            Google 로그인이 차단되는 경우, 카카오 로그인을 이용해 주세요.
          </p>
        </div>

        {/* 홈으로 돌아가기 */}
        <button
          type="button"
          onClick={() => navigate('/home')}
          className="mt-4 w-full text-sm text-[#8B95A1]"
        >
          &larr; 홈으로
        </button>
      </div>
    </div>
  )
}
