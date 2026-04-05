// OAuth 콜백 전용 페이지
// 세션 확인 → 마케팅 동의 저장 → 온보딩 여부 체크 → 적절한 페이지로 이동

import { useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Status = '처리 중...' | '로그인 완료, 이동 중...' | '로그인에 실패했어요' | '추가 정보 입력 페이지로 이동 중...'

const GIVE_UP_MS = 8000 // 8초 안에 세션이 안 잡히면 실패

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<Status>('처리 중...')
  const doneRef = useRef(false)

  const goTo = (path: '/mypage' | '/login' | '/onboarding') => {
    if (doneRef.current) return
    doneRef.current = true

    if (path === '/login') {
      setStatus('로그인에 실패했어요')
    } else if (path === '/onboarding') {
      setStatus('추가 정보 입력 페이지로 이동 중...')
    } else {
      setStatus('로그인 완료, 이동 중...')
    }

    // 약간의 딜레이 후 이동 (상태 메시지 표시를 위해)
    setTimeout(() => {
      window.location.replace(path)
    }, path === '/login' ? 1500 : 300)
  }

  // 로그인 페이지에서 localStorage에 임시 저장된 마케팅 동의 여부를 profiles 테이블에 저장
  // 컬럼이 없으면 upsert가 해당 필드를 무시하므로 안전 (migration 전까지 오류 없음)
  const saveMarketingAgreed = async (userId: string) => {
    const pending = localStorage.getItem('pending_marketing_agreed')
    if (pending === null || !supabase) return // 값이 없으면 신규 동의 플로우 없음

    const marketingAgreed = pending === 'true'
    localStorage.removeItem('pending_marketing_agreed') // 저장 후 즉시 정리

    try {
      await supabase
        .from('profiles')
        .update({ marketing_agreed: marketingAgreed })
        .eq('id', userId)
      // 컬럼이 없으면 오류 발생 가능하지만 리다이렉트 흐름에 영향 없도록 catch에서 무시
    } catch (err) {
      console.warn('[콜백] marketing_agreed 저장 실패 (컬럼 미존재 가능):', err)
    }
  }

  useEffect(() => {
    // StrictMode에서 useEffect가 두 번 실행될 때 cleanup에서 true로 된 doneRef 리셋
    doneRef.current = false

    const client = supabase
    if (!client) {
      goTo('/login')
      return
    }

    // 온보딩 필요 여부 확인 + 마케팅 동의 저장 함수
    const checkOnboardingAndRedirect = async (userId: string) => {
      if (doneRef.current) return

      // 마케팅 동의 저장 (실패해도 리다이렉트 흐름 계속)
      await saveMarketingAgreed(userId)

      try {
        const { data: profile, error } = await client
          .from('profiles')
          .select('onboarding_completed, full_name')
          .eq('id', userId)
          .maybeSingle() // single() 대신 maybeSingle() 사용 - 행이 없어도 에러 안남

        if (error) {
          console.error('[콜백] 프로필 조회 오류:', error.message)
          // 프로필 조회 실패해도 온보딩으로 보내기 (프로필이 없으면 생성 필요)
          goTo('/onboarding')
          return
        }

        if (!profile || !profile.onboarding_completed || !profile.full_name) {
          goTo('/onboarding')
        } else {
          goTo('/mypage')
        }
      } catch (err) {
        console.error('[콜백] 프로필 확인 실패:', err)
        goTo('/onboarding')
      }
    }

    // 1) onAuthStateChange로 세션 감지
    const { data: { subscription } } = client.auth.onAuthStateChange(async (event, session) => {
      if (doneRef.current) return
      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
        await checkOnboardingAndRedirect(session.user.id)
      }
    })

    // 2) 폴링으로도 세션 확인 (onAuthStateChange가 놓칠 수 있는 경우 대비)
    const pollSession = async () => {
      const delays = [100, 300, 700, 1500, 3000]
      for (const delay of delays) {
        if (doneRef.current) return
        await new Promise(resolve => setTimeout(resolve, delay))
        if (doneRef.current) return

        try {
          const { data, error } = await client.auth.getSession()
          if (!error && data.session?.user) {
            await checkOnboardingAndRedirect(data.session.user.id)
            return
          }
        } catch {
          // 무시하고 다음 시도
        }
      }
    }
    pollSession()

    // 3) 타임아웃
    const timeoutId = window.setTimeout(() => {
      if (doneRef.current) return
      console.warn('[콜백] 세션 타임아웃 - 로그인 페이지로 이동')
      // 타임아웃 시 pending_marketing_agreed 정리
      localStorage.removeItem('pending_marketing_agreed')
      goTo('/login')
    }, GIVE_UP_MS)

    return () => {
      doneRef.current = true
      subscription.unsubscribe()
      window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center p-4 relative z-[1]">
      <div className="w-10 h-10 border-3 border-[#3182F6] border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-[#191F28] font-medium">{status}</p>
      <p className="text-sm text-[#8B95A1] mt-2">잠시만 기다려 주세요.</p>
    </div>
  )
}
