// 카카오 / 구글 소셜 로그인을 위한 전용 로그인 페이지입니다.
// 각 버튼은 Supabase OAuth를 통해 해당 제공자 로그인 화면으로 이동합니다.

import { useState } from 'react' // 버튼 클릭 시 로딩 상태를 관리하기 위해 useState를 가져옵니다.
import { useNavigate } from 'react-router-dom' // 로그인 후 다른 페이지로 이동하기 위해 useNavigate를 사용합니다.
import { supabase } from '../lib/supabase' // 공용 Supabase 클라이언트를 가져옵니다.

type Provider = 'kakao' | 'google' // 지원하는 소셜 로그인 제공자 타입을 정의합니다.

const REDIRECT_URL = 'https://coupang-severance-app.vercel.app/auth/callback' // 로그인 완료 후 돌아올 배포 주소의 콜백 URL입니다.

export default function LoginPage() {
  const navigate = useNavigate() // 뒤로 가기(홈 이동) 버튼에서 사용할 네비게이트 훅입니다.
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null) // 어떤 제공자 로그인 중인지 저장하는 상태입니다.

  const handleLogin = async (provider: Provider) => {
    // 카카오/구글 버튼 클릭 시 호출되는 함수입니다.
    if (!supabase) {
      // Supabase 클라이언트가 준비되지 않은 경우입니다.
      alert('로그인 설정(Supabase URL/Key)이 올바르지 않습니다.') // 환경 변수 문제 가능성을 알립니다.
      return // 더 이상 진행하지 않습니다.
    }

    setLoadingProvider(provider) // 사용자가 어떤 버튼을 눌렀는지 기록해 버튼에 로딩 표시를 합니다.

    try {
      // Supabase OAuth를 이용해 해당 제공자 로그인 페이지로 이동할 URL을 요청합니다.
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider, // kakao 또는 google을 그대로 전달합니다.
        options: {
          redirectTo: REDIRECT_URL, // 소셜 로그인 완료 후 돌아올 콜백 주소입니다.
        },
      })

      if (error) {
        // Supabase가 에러를 반환한 경우입니다.
        alert(`로그인 중 오류가 발생했습니다.\n\n${error.message}`) // 에러 메시지를 사용자에게 보여줍니다.
        return // 더 이상 진행하지 않습니다.
      }

      if (data?.url) {
        // 정상적으로 로그인 URL이 생성된 경우입니다.
        window.location.href = data.url // 브라우저 전체를 해당 URL로 이동시켜 소셜 로그인 화면을 띄웁니다.
      }
    } catch (e) {
      // 네트워크 오류 등 예기치 못한 문제가 발생했을 때입니다.
      const message = e instanceof Error ? e.message : String(e) // 에러 객체를 사람이 읽을 수 있는 문자열로 변환합니다.
      alert(`로그인 중 알 수 없는 오류가 발생했습니다.\n\n${message}`) // 상세 오류를 사용자에게 보여줍니다.
    } finally {
      setLoadingProvider(null) // 어떤 경우든 로딩 상태를 해제해 버튼을 다시 활성화합니다.
    }
  }

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4 py-8">
      {/* 가운데 카드 레이아웃을 위한 래퍼입니다. */}
      <div className="w-full max-w-[400px]">
        {/* 상단 로고와 간단한 설명 영역입니다. */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#3182F6] overflow-hidden mb-3 shadow-lg shadow-blue-500/30">
            <img src="/catch-logo.png" alt="CATCH" className="w-full h-full object-contain p-1.5" />
          </div>
          <h1 className="text-xl font-bold text-[#191F28] mb-2">간편 로그인</h1>
          <p className="text-sm text-[#4E5968]">카카오 또는 Google 계정으로 빠르게 시작해 보세요.</p>
        </div>

        {/* 소셜 로그인 버튼들을 담는 카드 영역입니다. */}
        <div className="bg-white rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.04)] border border-gray-100/50 p-6">
          <p className="text-sm font-semibold text-[#191F28] mb-4">소셜 계정 선택</p>
          <div className="flex flex-col gap-3">
            {/* 카카오 로그인 버튼입니다. */}
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

            {/* 구글 로그인 버튼입니다. */}
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
        </div>

        {/* 하단에 홈으로 돌아가는 보조 버튼입니다. */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-4 w-full text-sm text-[#8B95A1]"
        >
          ← 홈으로
        </button>
      </div>
    </div>
  ) // 전체 로그인 페이지 레이아웃을 반환합니다.
}

