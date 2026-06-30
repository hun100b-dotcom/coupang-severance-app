// 마이페이지 — 탭 기반 구조
// 탭: 홈(기본 정보) / 즐겨찾기 / 지원현황 / 스케줄 / 설정
// C-4: 지원현황 탭에 미읽음 알림 빨간 점 배지 (Supabase Realtime)
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Home, Star, ClipboardList, CalendarDays, Settings } from 'lucide-react'
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

  // ── C-4: 미읽음 알림 카운트 (지원현황 탭 빨간 점 배지용) ──
  // notifications 테이블에서 read=false 건 수를 실시간으로 구독
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)

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
    } catch (err) {
      console.error('[마이페이지] 문의 내역 조회 실패:', err)
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
      } catch (err) {
        console.error('[마이페이지] 계산 기록 조회 실패:', err)
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

  // ── C-4: 미읽음 알림 초기 카운트 로드 + Realtime 구독 ──
  // notifications 테이블에서 read=false 건수를 실시간 감지
  useEffect(() => {
    if (!supabase || !isLoggedIn || !user) return
    const sb = supabase
    const userId = user.raw.id

    // 미읽음 알림 카운트 로드
    const loadUnread = async () => {
      const { count } = await sb
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
      setUnreadNotifCount(count ?? 0)
    }
    loadUnread()

    // Realtime 구독: 새 알림 INSERT 시 카운트 갱신
    const channel = sb
      .channel(`mypage_notif_${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { loadUnread() }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => { loadUnread() }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [isLoggedIn, user])

  // ── C-4: 지원현황 탭 클릭 시 모든 알림 read=true 처리 ──
  const markNotificationsRead = async () => {
    if (!supabase || !isLoggedIn || !user) return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.raw.id)
      .eq('read', false)
    setUnreadNotifCount(0)
  }

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-up-page flex flex-col items-center justify-center px-4 relative z-[1]">
        <p className="text-sm text-up-sub">로그인 정보를 확인하는 중입니다...</p>
      </div>
    )
  }

  // 로그인 안 됨
  if (!isLoggedIn || !user) {
    return (
      <div className="min-h-screen bg-up-page flex flex-col items-center justify-center px-4 relative z-[1]">
        <p className="text-sm text-up-sub">로그인이 필요합니다. 이동 중...</p>
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

  return (
    <div className="relative z-[1] min-h-screen bg-up-page pb-10">

      <div className="w-full max-w-[1120px] mx-auto px-4 md:px-6 lg:px-8 pt-5">

        {/* ── 페이지 헤더 (TopNav가 상단 내비를 제공하므로 뒤로가기 중복 제거) ── */}
        <div className="flex items-end justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-[24px] md:text-[30px] font-black text-up-navy tracking-tight">마이페이지</h1>
            <p className="text-[14px] md:text-[15px] text-up-sub mt-1.5 truncate">
              <span className="font-bold text-up-navy">{displayName}</span>님, 반가워요
              {daysWithCatch != null && <span className="text-up-sub"> · CATCH와 <span className="font-mono tabular-nums">{daysWithCatch}</span>일째</span>}
            </p>
          </div>
          <button type="button" onClick={() => logout()}
            className="shrink-0 flex items-center gap-1.5 min-h-[40px] px-3 rounded-lg text-[13px] font-semibold text-up-sub hover:text-up-navy hover:bg-up-sunken transition-colors">
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>

        {/* ── 데스크톱 2단(좌 세로메뉴 + 우 콘텐츠) / 모바일 적층 ── */}
        <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-8 lg:items-start">

          {/* ── 좌측 메뉴 (데스크톱 sticky 세로 / 모바일 가로 스크롤) — C-4: 지원현황 미읽음 배지 ── */}
          <nav className="sticky top-14 lg:top-[72px] z-20 -mx-4 px-4 md:-mx-6 md:px-6 lg:mx-0 lg:px-0 py-2 lg:py-0">
            <div className="flex lg:flex-col gap-1 lg:gap-1.5 overflow-x-auto hide-scrollbar p-1.5 lg:p-2 bg-white border border-up-hair rounded-2xl shadow-card">
              {TABS.map(tab => {
                const Icon = tab.icon
                const isActive = activeTab === tab.key
                const hasBadge = tab.key === 'applications' && unreadNotifCount > 0
                return (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key)
                      if (tab.key === 'applications') markNotificationsRead()
                    }}
                    className={`relative flex-1 lg:flex-none lg:w-full flex items-center justify-center lg:justify-start gap-1.5 lg:gap-2.5 px-3 lg:px-3.5 min-h-[44px] lg:min-h-[48px] text-[13px] lg:text-[14px] font-bold whitespace-nowrap rounded-xl transition-colors shrink-0 ${
                      isActive ? 'bg-brand-strong text-white' : 'text-up-sub hover:text-up-navy hover:bg-up-sunken'
                    }`}
                    aria-label={tab.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="relative inline-flex">
                      <Icon className="w-4 h-4 lg:w-[18px] lg:h-[18px]" />
                      {hasBadge && (
                        <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full bg-danger ring-1 ${isActive ? 'ring-brand-strong' : 'ring-white'}`} />
                      )}
                    </span>
                    <span>{tab.label}</span>
                    {hasBadge && unreadNotifCount <= 9 && (
                      <span className="ml-0.5 lg:ml-auto w-4 h-4 rounded-full bg-danger text-white text-[9px] font-black flex items-center justify-center tabular-nums">
                        {unreadNotifCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </nav>

          {/* ── 우측 탭 콘텐츠 ── */}
          <main className="mt-4 lg:mt-0 min-w-0 pb-6">

            {/* ① 홈 탭 — 기존 마이페이지 내용 */}
            {activeTab === 'home' && (
              <div className="space-y-3 md:space-y-4">
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
        </div>
      </div>

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
