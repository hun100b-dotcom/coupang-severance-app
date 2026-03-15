/**
 * Supabase 테이블 타입 정의
 * - profiles: 유저 프로필 (입사일, 마케팅 수신 동의 등)
 * - reports: 진단 리포트 목록
 */

/** profiles 테이블 한 행 (RLS로 본인만 조회/수정 가능 권장) */
export interface Profile {
  id: string
  joined_at: string | null
  marketing_agreement: boolean
  updated_at?: string
}

/** reports 테이블 한 행 - 리스트/상세 공통 */
export interface ReportRow {
  id: string
  user_id: string
  title: string
  company_name: string | null
  created_at: string
  /** 상세 데이터(JSON) 등 추가 컬럼은 필요 시 확장 */
  payload?: unknown
}
