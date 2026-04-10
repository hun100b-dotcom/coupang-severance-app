// 마이페이지 — 탭 기반 구조
// 탭: 홈(기본 정보) / 즐겨찾기 / 지원현황 / 스케줄 / 설정
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, LogOut, Home, Star, ClipboardList, CalendarDays, Settings } from 'lucide-react'
// Trash2는 계정관리 섹션 제거로 사용하지 않음 (설정 탭으로 이동)
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { notifyNewInquiry } from '../lib/api'
import { logAccess } from '../lib/accessLog'
import { ProfileCard } from '../components/mypage/ProfileCard'
import { SavedResultsList } from '../components/mypage/SavedResultsList'
import { SavedResultDetail } from '../components/mypage/SavedResultDetail'
import { QuickActions } from '../components/mypage/QuickActions'
import SavedPdfList from '../components/mypage/SavedPdfList'
import { SupportSection } from '../components/mypage/SupportSection'
import { InquiryModal } from '../components/mypage/InquiryModal'
import MyFavoritesTab from '../components/mypage/MyFavoritesTab'
import MyApplicationsTab from '../components/mypage/MyApplicationsTab'
import MyScheduleTab from '../components/mypage/MyScheduleTab'
import MySettingsTab from '../components/mypage/MySettingsTab'
import type { InquiryItem } from '../components/mypage/InquiryHistory'
import type { ReportRow } from '../types/supabase'

// 가입일로부터 경과 일수 계산
function calcDaysFrom(iso: string | null | undefined): number | null {
  if (!iso) return null
  const start = new Date(iso)
  const today = new Date()
  start.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  const ms = today.getTime() - start.getTime()
  if (ms < 0) return null
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

// ── 탭 정의 ──
type TabKey = 'home' | 'favorites' | 'applications' | 'schedule' | 'settings'
const TABS: { key: TabKey; icon: typeof Home; label: string }[] = [
  { key: 'home',         icon: Home,          label: '홈' },
  { key: 'favorites',    icon: Star,          label: '즐겨찾기' },
  { key: 'applications', icon: ClipboardList, label: '지원현황' },
  { key: 'schedule',     icon: CalendarDays,  label: '스케줄' },
  { key: 'settings',     icon: Settings,      label: '설정' },
]

export default function MyPage() {
  const navigate = useNavigate()
  const { isLoggedIn, user, loading, logout, needsOnboarding } = useAuth()

  // ── 현재 활성 탭
  const [activeTab, setActiveTab] = useState<TabKey>('home')

  // ── 모달 상태
  const [inquiryModalOpen, setInquiryModalOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null)

  // ── 문의 내역
  const [inquiries, setInquiries] = useState<InquiryItem[]>([])
  const [loadingInquiries, setLoadingInquiries] = useState(true)

  // ── 저장된 계산 기록 (최대 50건)
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loadingReports, setLoadingReports] = useState(true)

  // 로그인되지 않으면 로그인 페이지로, 온보딩 미완료면 온보딩으로 이동
  useEffect(() => {
    if (!loading && !isLoggedIn) {
      navigate('/login', { replace: true })
    } else if (!loading && isLoggedIn && needsOnboarding) {
      navigate('/onboarding', { replace: true })
    }
  }, [loading, isLoggedIn, needsOnboarding, navigate])

  // ── 문의 내역 조회
  const refreshInquiries = useCallback(async () => {
    if (!supabase || !isLoggedIn || !user) {
      setInquiries([]); setLoadingInquiries(false); return
    }
    setLoadingInquiries(true)
    try {
      const { data, error } = await supabase
        .from('inquiries')
        .select('id, title, content, status, created_at, answer, category')
        .eq('user_id', user.raw.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setInquiries((data as InquiryItem[]) ?? [])
    } catch {
      setInquiries([])
    } finally {
      setLoadingInquiries(false)
    }
  }, [isLoggedIn, user])

  useEffect(() => { refreshInquiries() }, [refreshInquiries])

  // ── 저장된 계산 기록 조회 (최대 50건, 최신순)
  useEffect(() => {
    if (!supabase || !isLoggedIn || !user) { setReports([]); setLoadingReports(false); return }
    const fetch = async () => {
      try {
        const { data } = await supabase!
          .from('reports')
          .select('id, title, company_name, created_at, payload')
          .eq('user_id', user.raw.id)
          .order('created_at', { ascending: false })
          .limit(50)
        setReports((data as ReportRow[]) ?? [])
      } catch {
        setReports([])
      } finally {
        setLoadingReports(false)
      }
    }
    fetch()
  }, [isLoggedIn, user])

  // 프로필 조회 로그 기록 (페이지 진입 시)
  useEffect(() => {
    if (user) { logAccess('view_profile') }
  }, [user])

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4 relative z-[1]">
        <p className="text-sm text-[#8B95A1]">로그인 정보를 확인하는 중입니다...</p>
      </div>
    )
  }

  // 로그인 안 됨
  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-[#F2F4F6] flex flex-col items-center justify-center px-4 relative z-[1]">
        <p className="text-sm text-[#8B95A1]">로그인이 필요합니다. 이동 중...</p>
      </div>
    )
  }

  const rawMeta    = user.raw.user_metadata ?? {}
  const displayName: string = rawMeta.full_name ?? rawMeta.name ?? user.name ?? '사용자'
  const avatarUrl: string | undefined = rawMeta.avatar_url ?? rawMeta.picture ?? user.avatarUrl
  const joinedAt: string | null = (rawMeta.joined_at as string | undefined) ?? (user.raw.created_at ?? null)
  const daysWithCatch = calcDaysFrom(joinedAt)

  // ── 1:1 문의 저장 핸들러
  const handleCreateInquiry = async (payload: { title: string; content: string }) => {
    if (!supabase) return
    const { data, error } = await supabase.from('inquiries').insert({
      user_id: user.raw.id,
      title: payload.title,
      category: '기타',
      content: payload.content,
      status: '대기중',
    }).select('id').single()

    if (!error && data?.id) {
      logAccess('create_inquiry', data.id)
      notifyNewInquiry({
        inquiryId: data.id,
        title: payload.title,
        content: payload.content,
        userId: user.raw.id,
        userName: displayName
      })
    }
    await refreshInquiries()
  }

  // 회원 탈퇴 핸들러는 ⚙️ 설정 탭(MySettingsTab)으로 이동됨

  // 현재 탭의 헤더 타이틀
  const tabTitle = TABS.find(t => t.key === activeTab)?.label ?? '내 정보'

  return (
    <div className="min-h-screen bg-[#F2F4F6] pb-24 relative z-10">

      {/* ── 헤더 ── */}
      <header className="sticky top-0 z-30 bg-[#F2F4F6]/90 backdrop-blur-xl border-b border-gray-200/50">
        <div className="max-w-[460px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => navigate('/home')}
              className="p-1.5 rounded-xl hover:bg-black/5 transition-colors">
              <ChevronLeft className="w-5 h-5 text-[#191f28]" />
            </button>
            <h1 className="text-[17px] font-extrabold text-[#191f28] tracking-tight">{tabTitle}</h1>
          </div>
          <button type="button" onClick={() => logout()}
            className="flex items-center gap-1.5 text-[12px] text-[#8B95A1] hover:text-[#4e5968] transition-colors px-2 py-1 rounded-lg hover:bg-black/5">
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>

        {/* ── 탭 네비게이션 바 ── */}
        <div className="max-w-[460px] mx-auto px-4 flex gap-0 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-bold whitespace-nowrap border-b-2 transition-all shrink-0 ${
                  isActive
                    ? 'border-[#3182f6] text-[#3182f6]'
                    : 'border-transparent text-[#8b95a1] hover:text-[#4e5968]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* ── 탭 콘텐츠 ── */}
      <main className="max-w-[460px] mx-auto px-4 pt-4 pb-6">

        {/* ① 홈 탭 — 기존 마이페이지 내용 */}
        {activeTab === 'home' && (
          <div className="space-y-3">
            {/* 프로필 카드 */}
            <ProfileCard
              name={displayName}
              email={user.email}
              avatarUrl={avatarUrl}
              joinedAt={joinedAt}
              daysWithCatch={daysWithCatch}
            />

            {/* 계산 기록 */}
            <SavedResultsList
              reports={reports}
              loading={loadingReports}
              onSelectReport={r => setSelectedReport(r)}
              onGoCalculate={() => navigate('/severance')}
            />

            {/* 내 PDF 관리 */}
            <SavedPdfList />

            {/* 빠른 계산 바로가기 */}
            <QuickActions onOpenInquiry={() => setInquiryModalOpen(true)} />

            {/* 고객지원 */}
            <SupportSection
              inquiries={inquiries}
              loadingInquiries={loadingInquiries}
              onOpenInquiry={() => setInquiryModalOpen(true)}
            />

            {/* 계정 관리 섹션은 ⚙️ 설정 탭으로 이동됨 */}
          </div>
        )}

        {/* ② 즐겨찾기 탭 */}
        {activeTab === 'favorites' && (
          <MyFavoritesTab userId={user.raw.id} />
        )}

        {/* ③ 지원현황 탭 */}
        {activeTab === 'applications' && (
          <MyApplicationsTab userId={user.raw.id} />
        )}

        {/* ④ 스케줄 탭 */}
        {activeTab === 'schedule' && (
          <MyScheduleTab userId={user.raw.id} />
        )}

        {/* ⑤ 설정 탭 */}
        {activeTab === 'settings' && (
          <MySettingsTab />
        )}

      </main>

      {/* 계산결과 상세 모달 */}
      <SavedResultDetail
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />

      {/* 1:1 문의 모달 */}
      <InquiryModal
        open={inquiryModalOpen}
        onClose={() => setInquiryModalOpen(false)}
        onSubmit={handleCreateInquiry}
      />
    </div>
  )
}
