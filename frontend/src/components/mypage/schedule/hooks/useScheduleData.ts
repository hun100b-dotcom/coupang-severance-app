// 📦 스케줄 데이터 로드 훅
// 사용자 ID 기준으로 지원 내역(JobApplication[])을 불러와 상태로 관리한다.
// 기존 MyScheduleTab에 인라인으로 있던 useEffect 로직을 그대로 옮겨왔다.
import { useCallback, useEffect, useState } from 'react'
import { listApplications } from '../../../../lib/jobApplications'
import type { JobApplication } from '../../../../types/supabase'

// 훅 반환 타입: 지원 내역 + 로딩 상태 + 낙관적 업데이트 + 재조회
export function useScheduleData(userId: string) {
  // 서버에서 받아온 지원 내역 목록
  const [applications, setApplications] = useState<JobApplication[]>([])
  // 초기 로딩 여부 (스피너 표시용)
  const [loading, setLoading] = useState(true)

  // ── 데이터 재조회 함수 ──
  // ScheduleDetailSheet 등에서 저장 후 최신 상태 재조회할 때 사용
  const refresh = useCallback(async () => {
    const data = await listApplications(userId)
    setApplications(data)
  }, [userId])

  // ── 낙관적 업데이트 ──
  // 단일 application 수정을 DB 재조회 없이 로컬 배열에 즉시 반영
  // ScheduleDetailSheet 의 onUpdate 콜백에서 사용
  const applyLocalUpdate = useCallback((updated: JobApplication) => {
    setApplications(prev =>
      prev.map(a => (a.id === updated.id ? { ...a, ...updated } : a)),
    )
  }, [])

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

  return { applications, loading, refresh, applyLocalUpdate }
}
