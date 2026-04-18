// 📦 스케줄 데이터 로드 훅
// 사용자 ID 기준으로 지원 내역(JobApplication[])을 불러와 상태로 관리한다.
// 기존 MyScheduleTab에 인라인으로 있던 useEffect 로직을 그대로 옮겨왔다.
import { useEffect, useState } from 'react'
import { listApplications } from '../../../../lib/jobApplications'
import type { JobApplication } from '../../../../types/supabase'

// 훅 반환 타입: 지원 내역 + 로딩 상태
export function useScheduleData(userId: string) {
  // 서버에서 받아온 지원 내역 목록
  const [applications, setApplications] = useState<JobApplication[]>([])
  // 초기 로딩 여부 (스피너 표시용)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // userId가 바뀔 때마다 다시 불러온다
    const load = async () => {
      setLoading(true)
      const data = await listApplications(userId)
      setApplications(data)
      setLoading(false)
    }
    load()
  }, [userId])

  return { applications, loading }
}
