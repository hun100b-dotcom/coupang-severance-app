/**
 * OAuth 콜백 전용 페이지 (/auth/callback)
 * - Supabase가 리다이렉트한 뒤 URL의 해시/쿼리에서 세션을 복원하고 /mypage로 이동합니다.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabase/client'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'처리 중...' | '완료' | '오류'>('처리 중...')

  useEffect(() => {
    const client = supabase
    if (!client) {
      setStatus('오류')
      setTimeout(() => navigate('/mypage', { replace: true }), 1500)
      return
    }

    let mounted = true

    const run = async () => {
      try {
        // Supabase 클라이언트가 URL 해시/쿼리를 파싱할 시간을 줌
        await new Promise(r => setTimeout(r, 100))
        const { data: { session }, error } = await client.auth.getSession()
        if (!mounted) return
        if (error) {
          setStatus('오류')
          setTimeout(() => navigate('/mypage', { replace: true }), 1500)
          return
        }
        if (session?.user) {
          setStatus('완료')
          navigate('/mypage', { replace: true })
        } else {
          navigate('/mypage', { replace: true })
        }
      } catch {
        if (mounted) {
          setStatus('오류')
          setTimeout(() => navigate('/mypage', { replace: true }), 1500)
        }
      }
    }

    run()
    return () => { mounted = false }
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center p-4">
      <p className="text-[#191F28] font-medium">{status}</p>
      <p className="text-sm text-[#8B95A1] mt-2">잠시만 기다려 주세요.</p>
    </div>
  )
}
