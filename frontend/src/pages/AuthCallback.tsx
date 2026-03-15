/**
 * OAuth 콜백 전용 페이지 (/auth/callback)
 * - Supabase 리다이렉트 후 URL 해시/쿼리에서 세션 복원을 기다린 뒤 /mypage로 이동합니다.
 * - onAuthStateChange + getSession 재시도로 세션이 확실히 잡힌 다음에만 이동해 구글 "다시 로그인 창" 현상 방지.
 */

import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase/client'

const RETRY_DELAYS = [0, 200, 500, 1000, 1800]
const GIVE_UP_MS = 3500

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'처리 중...' | '완료' | '오류'>('처리 중...')
  const doneRef = useRef(false)

  useEffect(() => {
    const client = supabase
    if (!client) {
      setStatus('오류')
      setTimeout(() => navigate('/mypage', { replace: true }), 1500)
      return
    }

    const goToMyPage = () => {
      if (doneRef.current) return
      doneRef.current = true
      setStatus('완료')
      // URL에 남은 해시 제거 후 이동 (보안·가독성)
      navigate('/mypage', { replace: true })
    }

    let timeoutId: ReturnType<typeof setTimeout>
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
    }

    // 1) onAuthStateChange: 세션이 잡히면 바로 마이페이지로
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          goToMyPage()
          subscription.unsubscribe()
        }
      }
    })

    // 2) getSession 재시도: 해시 파싱이 비동기일 수 있어 여러 번 시도
    const tryGetSession = async () => {
      for (const delay of RETRY_DELAYS) {
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
      navigate('/mypage', { replace: true })
    }, GIVE_UP_MS)

    return () => {
      subscription.unsubscribe()
      cleanup()
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center p-4">
      <p className="text-[#191F28] font-medium">{status}</p>
      <p className="text-sm text-[#8B95A1] mt-2">잠시만 기다려 주세요.</p>
    </div>
  )
}
