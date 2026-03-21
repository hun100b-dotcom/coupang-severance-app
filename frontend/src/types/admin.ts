// Admin OS — 공통 타입 정의

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
  id: string
  user_id: string
  category: string
  content: string
  title?: string
  status: string          // 'waiting' | 'reviewing' | 'answered' | 'closed'
  status_detail?: string  // 확장 상태
  answer: string | null
  created_at: string
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
