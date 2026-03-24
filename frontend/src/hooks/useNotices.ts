import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Notice } from '../types/supabase'

export function useNotices() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    const fetchNotices = async () => {
      try {
        const { data, error: sbError } = await supabase!
          .from('notices')
          .select('*')
          .eq('is_active', true)
          .order('priority', { ascending: false })

        if (sbError) {
          // 테이블이 없는 경우 등 graceful 처리
          setNotices([])
        } else {
          setNotices(data ?? [])
        }
      } catch {
        setNotices([])
        setError('공지사항을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    fetchNotices()
  }, [])

  return { notices, loading, error }
}
