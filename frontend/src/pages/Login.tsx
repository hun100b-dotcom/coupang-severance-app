// 카카오 / 구글 소셜 로그인 페이지
// Supabase OAuth를 통해 해당 제공자 로그인 화면으로 이동

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  return 'https://coupang-severance-app.vercel.app/auth/callback'
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { isLoggedIn, loading, needsOnboarding } = useAuth()
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
      setErrorMsg(`로그인 중 알 수 없는 오류가 발생했습니다.\n${message}`)
    } finally {
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
            {/* 카카오 로그인 */}
            <button
              type="button"
              onClick={() => handleLogin('kakao')}
              disabled={!!loadingProvider}
              className="w-full h-12 rounded-full bg-[#FEE500] text-[#191600] flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-60"
            >
              <span className="w-5 h-5 rounded-md bg-[#191600] text-[#FEE500] flex items-center justify-center text-[10px] font-bold">
                K
              </span>
              {loadingProvider === 'kakao' ? '카카오로 로그인 중...' : '카카오로 로그인'}
            </button>

            {/* 구글 로그인 */}
            <button
              type="button"
              onClick={() => handleLogin('google')}
              disabled={!!loadingProvider}
              className="w-full h-12 rounded-full bg-white text-[#191F28] border border-gray-200 flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-60"
            >
              <span className="w-5 h-5 rounded-md border border-gray-300 flex items-center justify-center text-[10px] font-bold">
                G
              </span>
              {loadingProvider === 'google' ? 'Google로 로그인 중...' : 'Google로 로그인'}
            </button>
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
