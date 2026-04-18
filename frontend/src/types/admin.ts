// Admin OS — 공통 타입 정의

// ── 어드민 메뉴 ID 유니온 타입 (AdminSidebar.tsx에도 동일하게 정의됨) ──
export type AdminMenu =
  | 'dashboard' | 'target'
  | 'job_postings' | 'applicants' | 'confirmed' | 'recruit_summary'
  | 'inquiries' | 'notices' | 'members' | 'accounts'
  | 'settings' | 'audit_logs' | 'server_logs'

// ── 대시보드 ────────────────────────────────────────────
export interface AdminStats {
  users: {
    total: number
    marketing_agreed: number
    new_today: number
    new_this_week: number
  }
  reports: {
    total: number
    eligible: number
    ineligible: number
    avg_severance: number
    by_company: { name: string; count: number }[]
  }
  inquiries: {
    total: number
    waiting: number
    reviewing: number
    answered: number
    closed: number
  }
  clicks: {
    total: number
    severance: number
    unemployment: number
  }
  jobs: {
    total: number   // 전체 채용공고 수
    active: number  // 활성(active) 공고 수
  }
}

export interface DailyAnalytics {
  date: string
  new_users: number
  new_reports: number
  new_inquiries: number
  clicks: number
}

export interface AnalyticsResponse {
  daily: DailyAnalytics[]
}

// ── 타겟 분석 ────────────────────────────────────────────
export interface CompanyTarget {
  name: string
  count: number
  pct: number
}

export interface SegmentItem {
  label: string
  count: number
}

export interface TargetSegments {
  by_duration: SegmentItem[]
  by_wage: SegmentItem[]
}

export interface TagItem {
  tag: string
  user_count: number
}

// ── 문의 CRM ─────────────────────────────────────────────
export interface AdminInquiry {
  id: string | number     // DB: bigint
  user_id: string
  user_email?: string     // DB 컬럼 — 작성자 이메일
  category: string
  content: string
  title?: string
  status: string          // 'waiting' | 'reviewing' | 'answered' | 'closed'
  status_detail?: string  // 확장 상태
  answer: string | null
  created_at: string
  answered_at?: string | null  // DB 컬럼 — 답변 등록 시각
  updated_at?: string
}

export interface InquiryTemplate {
  id: string
  title: string
  content: string
  category: string
  use_count: number
  created_at: string
}

// ── 설정 ──────────────────────────────────────────────────
export type SystemSettings = Record<string, string>

export interface BlockedIp {
  id: string
  ip_address: string
  reason: string | null
  created_at: string
  expires_at: string | null
}

// ── 타겟 인사이트 (통합 분석) ────────────────────────────
export interface TargetInsights {
  overview: {
    total_users: number
    active_users: number
    total_reports: number
    total_inquiries: number
    conversion_rate: number
    eligible_rate: number
    avg_severance: number
    total_severance: number
    marketing_rate: number
    onboarding_rate: number
  }
  funnel: {
    visitors: number
    signups: number
    calculations: number
    eligible: number
  }
  companies: CompanyTarget[]
  segments: {
    by_duration: SegmentItem[]
    by_wage: SegmentItem[]
    heatmap: number[][]
    duration_labels: string[]
    wage_labels: string[]
  }
  revenue: {
    total_eligible_severance: number
    avg_severance: number
    high_value_count: number
    segments: { label: string; count: number; total: number }[]
  }
  demographics: {
    by_provider: { label: string; count: number }[]
    marketing: { sms: number; email: number; phone: number; none: number }
    onboarding_completed: number
    onboarding_pending: number
  }
  service_usage: {
    total: number
    severance: number
    unemployment: number
  }
  inquiry_analysis: {
    by_category: { label: string; count: number }[]
    by_status: { label: string; count: number }[]
    avg_response_hours: number
    total: number
  }
  tags: { tag: string; count: number }[]
  growth: { month: string; count: number }[]
}

// ── 감사 로그 ────────────────────────────────────────────
export interface AuditLog {
  id: string
  admin_email: string
  action: string
  target_type: string | null
  target_id: string | null
  before_val: unknown
  after_val: unknown
  ip_address: string | null
  created_at: string
}
