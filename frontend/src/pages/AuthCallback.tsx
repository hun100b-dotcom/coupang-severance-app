/**
 * OAuth 콜백 전용 페이지 (redirectTo: https://coupang-severance-app.vercel.app/auth/callback)
 * - Supabase가 이 URL로 리다이렉트한 뒤, URL 해시/쿼리에서 세션을 복원합니다.
 * - 세션이 확실히 잡힌 뒤 full-page redirect로 /mypage 이동 → 앱 재로드 시 AuthProvider가 storage에서 세션을 읽어 로그인 UI 유지.
 */

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../utils/supabase/client'

const RETRY_DELAYS_MS = [0, 150, 400, 800, 1500]
const GIVE_UP_MS = 4000

export default function AuthCallback() {
  const [status, setStatus] = useState<'처리 중...' | '완료' | '오류'>('처리 중...')
  const doneRef = useRef(false)

  const goToMyPage = () => {
    if (doneRef.current) return
    doneRef.current = true
    setStatus('완료')
    // full-page 이동으로 앱을 다시 띄워 AuthProvider가 storage에서 세션을 읽고 마이페이지 UI 표시
    window.location.replace('/mypage')
  }

  useEffect(() => {
    const client = supabase
    if (!client) {
      setStatus('오류')
      setTimeout(() => window.location.replace('/mypage'), 1500)
      return
    }

    let timeoutId: ReturnType<typeof setTimeout>
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
    }

    // 1) onAuthStateChange: 세션이 잡히면 마이페이지로
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          goToMyPage()
          subscription.unsubscribe()
        }
      }
    })

    // 2) getSession 재시도: 해시 파싱이 비동기일 수 있음
    const tryGetSession = async () => {
      for (const delay of RETRY_DELAYS_MS) {
        if (doneRef.current) return
        if (delay > 0) await new Promise(r => setTimeout(r, delay))
        const { data: { session }, error } = await client.auth.getSession()
        if (doneRef.current) return
        if (!error && session?.user) {
          goToMyPage()
          return
        }
      }
    }
    tryGetSession()

    // 3) 최대 대기 후에도 세션 없으면 마이페이지로 (무한 대기 방지)
    timeoutId = setTimeout(() => {
      if (doneRef.current) return
      doneRef.current = true
      setStatus('오류')
      window.location.replace('/mypage')
    }, GIVE_UP_MS)

    return () => {
      subscription.unsubscribe()
      cleanup()
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center p-4">
      <p className="text-[#191F28] font-medium">{status}</p>
      <p className="text-sm text-[#8B95A1] mt-2">잠시만 기다려 주세요.</p>
    </div>
  )
}
