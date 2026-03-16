// 소셜 로그인 이후 Supabase가 redirect 시키는 콜백 페이지입니다.
// 이 페이지에서 Supabase 코드(authorization code)를 세션으로 교환한 뒤 마이페이지 또는 로그인 페이지로 보내 줍니다.

import { useEffect, useState } from 'react' // React의 훅을 사용하기 위해 가져옵니다.
import { supabase } from '../../lib/supabase' // 공용 Supabase 클라이언트를 불러옵니다.

type StatusText = '처리 중...' | '로그인 완료, 이동 중...' | '로그인에 실패했어요' // 화면에 표시할 상태 메시지 타입을 정의합니다.

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<StatusText>('처리 중...') // 현재 진행 상태를 저장하는 상태 변수입니다.

  useEffect(() => {
    // 컴포넌트가 처음 렌더링될 때 한 번만 실행되도록 useEffect를 사용합니다.
    const run = async () => {
      if (!supabase) {
        // Supabase 클라이언트가 생성되지 않았다면 더 진행할 수 없습니다.
        setStatus('로그인에 실패했어요') // 오류 상태 메시지를 보여줍니다.
        window.location.href = '/login' // 로그인 페이지로 이동시켜 재시도를 유도합니다.
        return // 함수 실행을 종료합니다.
      }

      try {
        // Supabase JS v2에서는 exchangeCodeForSession으로 URL 속 코드를 세션으로 교환할 수 있습니다.
        const { data, error } = await supabase.auth.exchangeCodeForSession(window.location.href) // 현재 페이지 URL에 포함된 코드를 세션으로 교환합니다.

        if (error || !data.session) {
          // 에러가 발생했거나 세션이 없다면 로그인에 실패한 것으로 간주합니다.
          setStatus('로그인에 실패했어요') // 실패 상태 메시지를 설정합니다.
          window.location.href = '/login' // 다시 로그인 페이지로 보내 사용자가 재시도하게 합니다.
          return // 더 이상 진행하지 않습니다.
        }

        // 여기까지 왔다면 세션이 정상적으로 생성된 상태입니다.
        setStatus('로그인 완료, 이동 중...') // 성공 상태 메시지를 잠시 보여줍니다.
        window.location.href = '/mypage' // 마이페이지로 전체 페이지 리다이렉트를 수행합니다.
      } catch {
        // 예기치 못한 오류가 발생한 경우입니다.
        setStatus('로그인에 실패했어요') // 에러 메시지를 화면에 표시합니다.
        window.location.href = '/login' // 안전하게 로그인 페이지로 돌려보냅니다.
      }
    }

    run() // 위에서 정의한 비동기 함수를 바로 실행합니다.
  }, []) // 의존성 배열을 빈 배열로 주어 최초 마운트 시에만 실행되게 합니다.

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center p-4">
      {/* 현재 상태를 사용자에게 보여주는 텍스트입니다. */}
      <p className="text-[#191F28] font-medium">{status}</p>
      {/* 약간의 안내 문구를 추가로 표시합니다. */}
      <p className="text-sm text-[#8B95A1] mt-2">잠시만 기다려 주세요.</p>
    </div>
  ) // 콜백 처리 중에는 간단한 로딩 화면만 보여줍니다.
}

