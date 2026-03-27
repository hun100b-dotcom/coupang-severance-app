// 소셜 로그인 완료 후 Supabase가 토큰/코드를 붙여 되돌려주는 콜백 전용 페이지입니다.
// 이 페이지에서는 세션이 정상적으로 생성되었는지만 확인하고, 성공 시 /mypage, 실패 시 /login 으로 이동합니다.

import { useEffect, useRef, useState } from 'react' // React 훅을 사용하기 위해 가져옵니다.
import { supabase } from '../../lib/supabase' // 공용 Supabase 클라이언트를 불러옵니다.

type Status = '처리 중...' | '로그인 완료, 이동 중...' | '로그인에 실패했어요' | '추가 정보 입력 페이지로 이동 중...' // 화면에 표시할 상태 메시지 타입입니다.

const RETRY_DELAYS_MS = [0, 200, 500, 1000, 2000] // getSession 재시도 간격(밀리초) 배열입니다.
const GIVE_UP_MS = 5000 // 이 시간 안에 세션이 안 잡히면 실패로 간주합니다.

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<Status>('처리 중...') // 현재 진행 상태를 저장하는 상태입니다.
  const doneRef = useRef(false) // 한 번만 리다이렉트하도록 제어하는 플래그입니다.

  const goTo = async (path: '/mypage' | '/login' | '/onboarding') => {
    // 이미 이동 처리 중이라면 더 이상 실행하지 않습니다.
    if (doneRef.current) return
    doneRef.current = true // 이후 중복 호출을 막기 위해 플래그를 true 로 바꿉니다.

    if (path === '/login') {
      setStatus('로그인에 실패했어요')
    } else if (path === '/onboarding') {
      setStatus('추가 정보 입력 페이지로 이동 중...')
    } else {
      setStatus('로그인 완료, 이동 중...')
    }

    window.location.replace(path) // 히스토리에 남기지 않고 지정한 경로로 전체 페이지 이동을 수행합니다.
  }

  useEffect(() => {
    const client = supabase // Supabase 클라이언트를 로컬 변수에 담아 사용합니다.
    if (!client) {
      // 클라이언트가 준비되지 않았다면 더 진행할 수 없습니다.
      goTo('/login') // 바로 로그인 페이지로 돌려보냅니다.
      return // effect 실행을 종료합니다.
    }

    // 1) onAuthStateChange: SIGNED_IN / INITIAL_SESSION 이벤트에서 세션 확인 후 온보딩 여부 체크
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, session) => {
      if (doneRef.current) return // 이미 다른 경로로 이동 중이면 무시합니다.
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        // 온보딩 완료 여부 확인
        const { data: profile } = await client
          .from('profiles')
          .select('onboarding_completed, full_name')
          .eq('id', session.user.id)
          .single()

        if (!profile || !profile.onboarding_completed || !profile.full_name) {
          goTo('/onboarding') // 온보딩 미완료 시 온보딩 페이지로
        } else {
          goTo('/mypage') // 온보딩 완료 시 마이페이지로
        }
      }
    })

    // 2) getSession 재시도: 이미 세션이 잡혀 있는 경우를 위해 여러 번 확인합니다.
    const tryGetSession = async () => {
      for (const delay of RETRY_DELAYS_MS) {
        if (doneRef.current) return // 이미 이동이 끝났다면 더 이상 시도하지 않습니다.
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay)) // 각 딜레이만큼 대기합니다.
        }
        const { data, error } = await client.auth.getSession() // 현재 세션 정보를 가져옵니다.
        if (doneRef.current) return // 중간에 완료되었으면 즉시 중단합니다.
        if (!error && data.session?.user) {
          // 온보딩 완료 여부 확인
          const { data: profile } = await client
            .from('profiles')
            .select('onboarding_completed, full_name')
            .eq('id', data.session.user.id)
            .single()

          if (!profile || !profile.onboarding_completed || !profile.full_name) {
            goTo('/onboarding') // 온보딩 미완료
          } else {
            goTo('/mypage') // 온보딩 완료
          }
          return
        }
      }
    }
    tryGetSession() // 정의한 재시도 함수를 실행합니다.

    // 3) 일정 시간 안에 세션이 안 잡히면 실패로 판단하고 /login 으로 보냅니다.
    const timeoutId = window.setTimeout(() => {
      if (doneRef.current) return // 이미 이동이 완료되었으면 아무 것도 하지 않습니다.
      goTo('/login') // 로그인 실패로 보고 로그인 페이지로 이동합니다.
    }, GIVE_UP_MS)

    return () => {
      // 컴포넌트가 언마운트될 때 정리 작업을 수행합니다.
      doneRef.current = true // 더 이상의 이동을 막기 위해 플래그를 true 로 설정합니다.
      subscription.unsubscribe() // onAuthStateChange 구독을 해제합니다.
      window.clearTimeout(timeoutId) // 타임아웃 타이머를 정리합니다.
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center p-4">
      {/* 현재 상태를 사용자에게 보여주는 텍스트입니다. */}
      <p className="text-[#191F28] font-medium">{status}</p>
      {/* 약간의 안내 문구를 추가로 표시합니다. */}
      <p className="text-sm text-[#8B95A1] mt-2">잠시만 기다려 주세요.</p>
    </div>
  ) // 콜백 처리 중에는 간단한 로딩 화면만 보여줍니다.
}

