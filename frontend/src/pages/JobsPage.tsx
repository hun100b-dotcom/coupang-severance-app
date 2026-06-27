// 채용정보 피드 — 2026 리디자인 "B-fixed"
// - Layout 안 페이지(TopNav/BottomNav는 Layout 제공) → 콘텐츠만 렌더
// - 색: 블루 메인 + 그린(채용 보조) + 회색 중립 + 의미색(긴급=빨강/주황). 무지개(퍼플/인디고/스카이/틸) 제거
// - 반응형: 모바일 1열 / sm 2열 / lg 3열 카드 그리드 · 상세는 모바일 바텀시트 / 데스크톱 중앙 다이얼로그
// - 긴 회사명·주소·근무시간 텍스트 잘림(truncate) 보강
// - ⚠️ 기능 로직(즐겨찾기·지원 플로우·실시간 구독·토스트·모달)은 전부 보존, 스타일/구조만 개편
import { useEffect, useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageMeta from '../components/PageMeta'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin, Clock, Users, Phone, MessageSquare, ExternalLink,
  X, Loader2, Briefcase, ArrowUpDown, Search,
  Star, ChevronRight, ChevronDown, Send, Rocket, Map,
  CheckCircle2, LogIn,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { listFavorites, addFavorite, removeFavorite, isFavorited } from '../lib/jobFavorites'
import { applyToJob, getAppliedJobIds, checkConfirmedOnDate } from '../lib/jobApplications'
import { getCompanyLogoUrl } from '../lib/jobUtils'
import type { JobPosting } from '../types/supabase'
import type { JobFavorite } from '../types/supabase'
import KakaoShareButton from '../components/KakaoShareButton'
import { useKakaoShare } from '../hooks/useKakaoShare'
import Container from '../components/ui/Container'
// 지원 폼 모달: 인적사항 직접 입력 + 개인정보 동의 (D-NEW-4)
import ApplyFormModal from '../components/jobs/ApplyFormModal'

// ── 지원 방법 타입 ──
interface ApplyMethod {
  type: 'phone' | 'sms' | 'kakao' | 'landing' | 'catch'
  label: string
  value: string
}

// ── 프론트 확장 타입 ──
interface JobCardData extends JobPosting {
  logo_url: string        // 회사 로고 이미지 경로
  daily_wage: number
  recruit_type: 'urgent_today' | 'urgent_tomorrow' | 'regular'
  address_detail: string
  benefits: string[]
  apply_methods: ApplyMethod[]
  map_query: string  // 지도 검색어
}

// ── 히어로 로테이션 문구 (색은 통일 — 무지개 제거) ──
const HERO_COPIES = [
  '쿠팡 · CJ · 컬리 채용 정보를 한 곳에서',
  '채용팀에서 직접 보내주는 검증된 채용 정보',
  '알바몬에도 없는, 현장의 실시간 공고',
  '매일 새로 올라오는 채용 공고를 놓치지 마세요',
]

// 회사 로고 매핑은 lib/jobUtils.ts 에서 공유 (COMPANY_LOGOS, getCompanyLogoUrl)

// ── DB JobPosting → UI JobCardData 변환 함수 ──
function toCardData(job: JobPosting): JobCardData {
  let recruit_type: 'urgent_today' | 'urgent_tomorrow' | 'regular' = 'regular'
  if (job.section === 'today-urgent') {
    recruit_type = 'urgent_today'
  } else if (job.section === 'tomorrow-urgent') {
    recruit_type = 'urgent_tomorrow'
  } else if (job.is_urgent) {
    recruit_type = 'urgent_today'
  }

  const logo_url = getCompanyLogoUrl(job.company_name)
  const benefits: string[] = Array.isArray(job.benefits) ? job.benefits : []

  const apply_methods: ApplyMethod[] = []
  if (job.contact_phone) {
    apply_methods.push({ type: 'phone', label: '전화 지원', value: job.contact_phone })
    apply_methods.push({ type: 'sms', label: '문자 지원', value: job.contact_phone })
  }
  if (job.external_link) {
    apply_methods.push({ type: 'landing', label: '회사 정보 보기', value: job.external_link })
  }

  return {
    ...job,
    logo_url,
    recruit_type,
    address_detail: job.region,
    benefits,
    apply_methods,
    map_query: `${job.region} ${job.company_name} ${job.center_name}`,
  }
}

// ── 섹션 설정 (의미색: 오늘=danger, 내일=warning, 상시=accent) ──
const SECTIONS = [
  { type: 'urgent_today' as const,    label: '오늘 추가모집', color: '#C81E2E', bg: 'bg-danger/[0.07]',  border: 'border-danger/20',  icon: '🔥' },
  { type: 'urgent_tomorrow' as const, label: '내일 긴급모집', color: '#B45309', bg: 'bg-warning/[0.08]', border: 'border-warning/25', icon: '⚡' },
  { type: 'regular' as const,         label: '상시 모집',    color: '#047857', bg: 'bg-accent/[0.08]',  border: 'border-accent/25',  icon: '✅' },
]

// ── CTA 매핑 (무지개 제거: phone=브랜드 / sms=그린 / kakao=카카오 브랜드색 유지 / landing=중립 / catch=브랜드) ──
const CTA_MAP: Record<string, { icon: typeof Phone; bg: string; text: string }> = {
  phone:   { icon: Phone,          bg: 'bg-brand hover:bg-brand-strong', text: 'text-white' },
  sms:     { icon: MessageSquare,   bg: 'bg-accent hover:bg-accent-strong', text: 'text-white' },
  kakao:   { icon: Send,            bg: 'bg-[#FEE500]', text: 'text-[#3C1E1E]' },
  landing: { icon: ExternalLink,    bg: 'bg-[#F2F4F6] border border-line', text: 'text-ink-900' },
  catch:   { icon: Rocket,          bg: 'bg-brand hover:bg-brand-strong', text: 'text-white' },
}

type SortKey = 'latest' | 'wage'

export default function JobsPage() {
  useEffect(() => {
    return () => {}
  }, [])

  const navigate = useNavigate()
  const { user, isLoggedIn } = useAuth()

  const { shareJob } = useKakaoShare()

  const [loading, setLoading] = useState(true)
  const [allJobs, setAllJobs] = useState<JobCardData[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<JobCardData | null>(null)
  const [regionFilter, setRegionFilter] = useState('전체')
  const [regionOpen, setRegionOpen] = useState(false)
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('latest')
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState<JobFavorite[]>([])
  const [heroCopyIdx, setHeroCopyIdx] = useState(0)

  const [appliedMap, setAppliedMap] = useState<Record<string, string>>({})
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_applyingId, _setApplyingId] = useState<string | null>(null)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [pendingApplyJobId, setPendingApplyJobId] = useState<string | null>(null)
  const [isApplySubmitting, setIsApplySubmitting] = useState(false)

  const [searchParams, setSearchParams] = useSearchParams()

  // 히어로 문구 로테이션
  useEffect(() => {
    const timer = setInterval(() => setHeroCopyIdx(i => (i + 1) % HERO_COPIES.length), 3000)
    return () => clearInterval(timer)
  }, [])

  // ── Supabase job_postings 조회 ──
  const fetchJobs = async () => {
    if (!supabase) { setLoading(false); return }
    setFetchError(null)
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'active')
        .or(`expires_at.gte.${todayStr},expires_at.is.null`)
        .order('is_urgent', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      setAllJobs((data ?? []).map(job => toCardData(job as JobPosting)))
    } catch (err) {
      console.error('[공고 로드 오류]', err)
      setFetchError('공고를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  // ── Supabase Realtime 구독 ──
  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const channel = sb
      .channel('job_postings_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_postings' },
        () => { fetchJobs() }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [])

  // ── ?focus=<jobId>로 진입 시 해당 공고 상세 자동 오픈 ──
  useEffect(() => {
    const focusId = searchParams.get('focus')
    if (!focusId || loading || allJobs.length === 0) return
    const target = allJobs.find(j => j.id === focusId)
    if (target) {
      setSelectedJob(target)
      searchParams.delete('focus')
      setSearchParams(searchParams, { replace: true })
    }
  }, [loading, allJobs, searchParams, setSearchParams])

  // 즐겨찾기 + 지원 현황 로드
  useEffect(() => {
    if (!isLoggedIn || !user) return
    listFavorites(user.id).then(setFavorites)
    getAppliedJobIds(user.id).then(setAppliedMap)
  }, [isLoggedIn, user])

  // ── 지역 옵션 ──
  const REGION_OPTIONS = useMemo(
    () => ['전체', ...Array.from(new Set(allJobs.map(j => j.region))).sort()],
    [allJobs]
  )

  // 검색 + 필터 + 정렬
  const filtered = useMemo(() => {
    let result = [...allJobs]
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(j =>
        j.company_name.toLowerCase().includes(q) ||
        j.center_name.toLowerCase().includes(q) ||
        j.region.toLowerCase().includes(q) ||
        j.address_detail.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q)
      )
    }
    if (regionFilter !== '전체') result = result.filter(j => j.region === regionFilter)
    if (urgentOnly) result = result.filter(j => j.is_urgent)
    if (sortKey === 'wage') result.sort((a, b) => b.hourly_wage - a.hourly_wage)
    return result
  }, [allJobs, searchQuery, regionFilter, urgentOnly, sortKey])

  const sections = SECTIONS.map(s => ({ ...s, jobs: filtered.filter(j => j.recruit_type === s.type) })).filter(s => s.jobs.length > 0)

  // 즐겨찾기 토글
  const toggleFav = async (type: 'company' | 'center', value: string) => {
    if (!isLoggedIn || !user) { setLoginPromptOpen(true); return }
    if (isFavorited(favorites, type, value)) {
      await removeFavorite(user.id, type, value)
    } else {
      await addFavorite(user.id, type, value)
    }
    setFavorites(await listFavorites(user.id))
  }

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg)
    setToastType(type)
    setTimeout(() => setToastMsg(null), 2000)
  }

  // ── 지원하기 1단계: 게이트 체크 ──
  const handleApply = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation()
    if (!isLoggedIn || !user) {
      setLoginPromptOpen(true)
      return
    }
    if (appliedMap[jobId]) return

    const targetJob = allJobs.find(j => j.id === jobId)
    const jobWorkDate = targetJob?.work_date ?? null

    if (jobWorkDate) {
      const conflictDate = await checkConfirmedOnDate(user.id, jobWorkDate)
      if (conflictDate) {
        showToast(
          `해당 날짜(${conflictDate})에 이미 출근 확정된 지원이 있어 추가 지원이 불가능합니다.`,
          'error'
        )
        return
      }
    }

    setPendingApplyJobId(jobId)
    setApplyModalOpen(true)
  }

  // ── 지원하기 2단계: 폼 제출 ──
  const handleApplyModalSubmit = async (data: {
    applicant_name: string
    applicant_birth: string
    applicant_gender: 'male' | 'female'
    applicant_phone: string
    applied_task: string
    prior_experience_90d: boolean
    preferred_shift: 'morning' | 'afternoon' | 'night' | 'any'
    transportation: 'car' | 'public' | 'shuttle'
    shoe_size: string
    notes?: string
    emergency_contact?: string
    consent_third_party: boolean
    work_date?: string | null
  }) => {
    if (!user || !pendingApplyJobId) return
    setIsApplySubmitting(true)
    try {
      const appId = await applyToJob(user.id, pendingApplyJobId, data)
      if (appId) {
        setAppliedMap(prev => ({ ...prev, [pendingApplyJobId]: appId }))
        setApplyModalOpen(false)
        setPendingApplyJobId(null)
        showToast('지원 완료! 마이페이지 → 지원현황에서 확인하세요.', 'success')
      } else {
        showToast('지원 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error')
      }
    } finally {
      setIsApplySubmitting(false)
    }
  }

  const fmtWage = (w: number) => w.toLocaleString('ko-KR')
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

  return (
    <div className="relative z-[1]">
      {/* ── SEO 메타태그 ── */}
      <PageMeta
        title="쿠팡·컬리 일용직 채용정보 | CATCH"
        description="쿠팡, 쿠팡이츠, 마켓컬리, CJ대한통운 등 일용직 단기알바 최신 채용정보. 오늘 시작 가능한 급구 공고 확인하세요."
        canonical="https://catch-daily-worker.vercel.app/jobs"
        noIndex={true}
      />

      {/* ── 인라인 토스트 배너 ── */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed top-16 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-32px)] max-w-[428px]
              px-4 py-3 rounded-lg shadow-float text-sm font-semibold text-center text-white
              ${toastType === 'success' ? 'bg-brand' : 'bg-danger'}`}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <Container className="flex flex-col gap-5 md:gap-7 pt-4 pb-8">

        {/* ════════════ 히어로 (블루 그라데이션) ════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-xl border border-brand-700
            bg-gradient-to-br from-brand-strong to-brand-700 p-6 md:p-8 shadow-[0_10px_30px_rgba(27,100,218,0.22)]"
        >
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/[0.08] blur-3xl pointer-events-none" />

          <div className="relative z-10 md:flex md:items-center md:justify-between md:gap-8">
            <div className="md:flex-1">
              <h1 className="text-[22px] md:text-[26px] font-black text-white leading-tight tracking-tight mb-2 break-keep">
                우리 지역 채용 정보 캐치하기
              </h1>
              {/* 로테이션 서브타이틀 (색 통일) */}
              <div className="h-[26px] overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={heroCopyIdx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[13px] md:text-[14px] leading-relaxed font-medium text-white/90 break-keep"
                  >
                    {HERO_COPIES[heroCopyIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>

            {/* 요약 수치 (의미색 점만 사용, 숫자는 흰색) */}
            <div className="grid grid-cols-4 gap-2 mt-5 md:mt-0 md:w-[360px]">
              {[
                { n: allJobs.length, label: '전체', dot: 'bg-white' },
                { n: allJobs.filter(j => j.recruit_type === 'urgent_today').length, label: '오늘긴급', dot: 'bg-danger' },
                { n: allJobs.filter(j => j.recruit_type === 'urgent_tomorrow').length, label: '내일긴급', dot: 'bg-warning' },
                { n: allJobs.filter(j => j.recruit_type === 'regular').length, label: '상시', dot: 'bg-accent' },
              ].map(s => (
                <div key={s.label} className="px-1 py-2.5 rounded-md bg-white/[0.14] text-center">
                  <p className="text-[18px] font-black text-white leading-none tabular-nums">{s.n}</p>
                  <p className="text-[10px] text-white/80 font-medium leading-tight mt-1 flex items-center justify-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ════════════ 검색 + 필터 ════════════ */}
        <div className="flex flex-col gap-3">
          {/* 검색바
              ⚠️ index.css 전역 input[type=text]{padding:14px 16px}(특이도 0,1,1)가 Tailwind pl-10을 덮어써
                 아이콘과 placeholder가 겹쳤음 → important 수정자(!pl-12 !pr-4)로 좌측 패딩 강제 확보 */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="회사, 센터, 지역, 업무 검색"
              className="w-full !pl-12 !pr-4 min-h-[48px] rounded-lg bg-white border border-line
                text-[14px] text-ink-900 placeholder:text-ink-400 outline-none
                focus:ring-2 focus:ring-brand/30 focus:border-brand shadow-card transition-all"
            />
          </div>

          {/* 필터 바 */}
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar min-w-0">
            {/* 지역 드롭다운 */}
            <div className="relative shrink-0">
              <button onClick={() => setRegionOpen(v => !v)}
                className={`flex items-center gap-1.5 px-3.5 min-h-[44px] rounded-pill text-[13px] font-bold border transition-all ${
                  regionFilter !== '전체'
                    ? 'bg-brand text-white border-brand'
                    : 'bg-white text-ink-700 border-line'
                }`}>
                <MapPin className="w-3.5 h-3.5" />
                {regionFilter}
                <ChevronDown className={`w-3 h-3 transition-transform ${regionOpen ? 'rotate-180' : ''}`} />
              </button>
              {regionOpen && (
                <div className="absolute top-full left-0 mt-1.5 w-44 bg-white rounded-lg shadow-float border border-line z-30 overflow-hidden py-1 max-h-[280px] overflow-y-auto">
                  {REGION_OPTIONS.map(r => (
                    <button key={r} onClick={() => { setRegionFilter(r); setRegionOpen(false) }}
                      className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                        regionFilter === r ? 'bg-brand-bg text-brand font-bold' : 'text-ink-700 hover:bg-[#F2F4F6]'
                      }`}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 급구 토글 (의미색 danger) */}
            <button onClick={() => setUrgentOnly(v => !v)}
              className={`shrink-0 px-3.5 min-h-[44px] rounded-pill text-[13px] font-bold border transition-all ${
                urgentOnly ? 'bg-danger text-white border-danger' : 'bg-white text-ink-700 border-line'
              }`}>
              🔥 급구
            </button>

            <div className="flex-1 min-w-[8px]" />

            {/* 정렬 */}
            <button onClick={() => setSortKey(s => s === 'latest' ? 'wage' : 'latest')}
              className="shrink-0 flex items-center gap-1 px-3.5 min-h-[44px] rounded-pill bg-white border border-line text-[13px] font-bold text-ink-700">
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortKey === 'latest' ? '최신순' : '시급순'}
            </button>
          </div>
        </div>

        {/* ════════════ 섹션별 공고 (4상태) ════════════ */}
        {loading ? (
          // 로딩 — 스켈레톤 그리드
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-xl bg-white border border-line p-4 shadow-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-md bg-line animate-pulse shrink-0" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="h-3.5 w-28 rounded bg-line animate-pulse" />
                    <div className="h-3 w-20 rounded bg-line/70 animate-pulse" />
                  </div>
                </div>
                <div className="h-12 w-full rounded-md bg-line/60 animate-pulse mb-3" />
                <div className="h-10 w-full rounded-md bg-line/50 animate-pulse" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          // 에러
          <div className="rounded-xl p-10 bg-white border border-danger/20 text-center shadow-card">
            <p className="text-[15px] font-bold text-[#C81E2E] mb-2">⚠️ 오류</p>
            <p className="text-[13px] text-ink-600">{fetchError}</p>
            <button
              onClick={fetchJobs}
              className="mt-4 px-5 min-h-[44px] rounded-md bg-brand text-white text-[13px] font-bold hover:bg-brand-strong transition-colors"
            >
              다시 불러오기
            </button>
          </div>
        ) : sections.length === 0 ? (
          // 빈 상태
          <div className="rounded-xl p-12 bg-white border border-line text-center shadow-card">
            <Briefcase className="w-12 h-12 text-ink-400 mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[16px] font-bold text-ink-700">공고가 없어요</p>
            <p className="text-[13px] text-ink-500 mt-1">검색 조건을 변경해보세요</p>
          </div>
        ) : (
          // 목록 — 섹션별 + 반응형 그리드
          sections.map(section => (
            <section key={section.type}>
              {/* 섹션 헤더 */}
              <div className={`flex items-center gap-2 mb-3 px-4 py-2.5 rounded-lg ${section.bg} border ${section.border}`}>
                <span className="text-[15px]">{section.icon}</span>
                <span className="text-[14px] font-extrabold" style={{ color: section.color }}>{section.label}</span>
                <span className="ml-auto text-[12px] font-bold px-2.5 py-0.5 rounded-pill" style={{ background: section.color + '26', color: section.color }}>{section.jobs.length}건</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
                {section.jobs.map((job, i) => {
                  const centerKey = `${job.company_name}::${job.center_name}`
                  const isFav = isFavorited(favorites, 'company', job.company_name) || isFavorited(favorites, 'center', centerKey)

                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className={`flex flex-col h-full min-w-0 rounded-xl bg-white border transition-all shadow-card hover:shadow-float
                        ${isFav ? 'border-brand/40' : 'border-line'}`}
                    >
                      <div className="flex flex-col h-full p-4">
                        {/* 상단: 로고 + 회사명/센터 + 긴급배지 + 즐겨찾기 */}
                        <div className="flex items-start gap-3 mb-3">
                          <img src={job.logo_url} alt={job.company_name}
                            className="w-12 h-12 rounded-md object-contain bg-white p-1 border border-line shrink-0" />
                          <div className="flex-1 min-w-0">
                            {job.recruit_type !== 'regular' && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-bold mb-1 ${
                                job.recruit_type === 'urgent_today' ? 'bg-danger/10 text-[#C81E2E]' : 'bg-warning/10 text-[#B45309]'
                              }`}>
                                {job.recruit_type === 'urgent_today' ? '🔥 오늘 긴급' : '⚡ 내일 긴급'}
                              </span>
                            )}
                            <p className="text-[15px] font-extrabold text-ink-900 leading-tight truncate">{job.company_name}</p>
                            <p className="text-[12px] text-ink-600 leading-tight truncate">{job.center_name}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); toggleFav('center', centerKey) }}
                            className="flex items-center justify-center w-11 h-11 -mt-1 -mr-1 rounded-md hover:bg-brand-bg transition-colors shrink-0"
                            aria-label="즐겨찾기">
                            <Star className={`w-5 h-5 transition-all ${isFav ? 'fill-brand text-brand scale-110' : 'text-ink-400'}`} />
                          </button>
                        </div>

                        {/* 시급 블록 (브랜드 톤) */}
                        <div className="bg-brand-bg rounded-md px-4 py-3 mb-3">
                          <div className="flex items-baseline justify-between gap-2">
                            <div className="flex items-baseline gap-1 min-w-0">
                              <span className="text-[10px] text-ink-600 font-medium shrink-0">시급</span>
                              <span className="text-[24px] font-black text-brand tracking-tight leading-none tabular-nums truncate">{fmtWage(job.hourly_wage)}</span>
                              <span className="text-[13px] font-bold text-brand shrink-0">원</span>
                            </div>
                            <div className="flex items-baseline gap-1 shrink-0">
                              <span className="text-[10px] text-ink-600 font-medium">일급</span>
                              <span className="text-[15px] font-black text-ink-700 tracking-tight tabular-nums">{fmtWage(job.daily_wage)}</span>
                              <span className="text-[11px] font-semibold text-ink-500">원</span>
                            </div>
                          </div>
                        </div>

                        {/* 위치·시간·인원·마감 — 세로 스택 + 각 줄 truncate */}
                        <div className="flex flex-col gap-1 text-[12px] text-ink-600 mb-3">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                            <span className="truncate" style={{ wordBreak: 'keep-all' }}>{job.address_detail}</span>
                          </span>
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Clock className="w-3.5 h-3.5 text-ink-500 shrink-0" />
                            <span className="truncate">{job.work_hours}</span>
                          </span>
                          <span className="flex items-center gap-3">
                            <span className="flex items-center gap-1.5 shrink-0">
                              <Users className="w-3.5 h-3.5 text-ink-500 shrink-0" />{job.headcount}명
                            </span>
                            {job.expires_at && (
                              <span className="text-[#C81E2E] font-semibold shrink-0">~{fmtDate(job.expires_at)} 마감</span>
                            )}
                          </span>
                        </div>

                        {/* 혜택 (그린 칩) 최대 3개 */}
                        {job.benefits.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-4">
                            {job.benefits.slice(0, 3).map(b => (
                              <span key={b} className="flex items-center gap-1 px-2 py-0.5 rounded-sm bg-accent-bg text-[#047857] text-[11px] font-semibold">
                                <span className="text-[10px]">{getBenefitEmoji(b)}</span>{b}
                              </span>
                            ))}
                            {job.benefits.length > 3 && (
                              <span className="text-[11px] text-ink-500 font-medium">+{job.benefits.length - 3}개 더</span>
                            )}
                          </div>
                        )}

                        {/* 하단 버튼 — mt-auto로 카드 높이 통일 */}
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="flex-1 min-h-[44px] rounded-md border border-line text-ink-700
                              font-bold text-[13px] flex items-center justify-center gap-1
                              active:scale-[0.98] transition-all hover:bg-[#F2F4F6]"
                          >
                            상세보기
                          </button>
                          {appliedMap[job.id] ? (
                            <button
                              disabled
                              className="flex-1 min-h-[44px] rounded-md bg-accent-bg text-[#047857]
                                font-bold text-[13px] flex items-center justify-center gap-1 cursor-default"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              지원완료
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleApply(e, job.id)}
                              disabled={isApplySubmitting && pendingApplyJobId === job.id}
                              className="flex-1 min-h-[44px] rounded-md bg-brand hover:bg-brand-strong
                                text-white font-bold text-[13px] flex items-center justify-center gap-1
                                shadow-[0_4px_14px_rgba(49,130,246,0.28)] active:scale-[0.98] transition-all
                                disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              {isApplySubmitting && pendingApplyJobId === job.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>지원하기 <ChevronRight className="w-3.5 h-3.5" /></>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </section>
          ))
        )}
      </Container>

      {/* ════════════ 상세 — 모바일 바텀시트 / 데스크톱 중앙 다이얼로그 ════════════ */}
      {/* portal로 body에 렌더 → 루트 div의 z-[1] 스태킹 컨텍스트를 탈출해 BottomNav(z-50) 위에 표시 */}
      {createPortal(
      <AnimatePresence>
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm sm:p-4"
            onClick={() => setSelectedJob(null)}
          >
            <motion.div
              initial={{ y: 500, opacity: 0.6 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 500, opacity: 0.6 }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className="w-full max-w-[460px] sm:max-w-[560px] bg-white rounded-t-xl sm:rounded-xl
                shadow-float max-h-[92vh] sm:max-h-[88vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* 스크롤 콘텐츠 */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6">
                  <div className="w-10 h-1 bg-line rounded-full mx-auto mb-5 sm:hidden" />
                  <button onClick={() => setSelectedJob(null)}
                    className="absolute top-3 right-3 flex items-center justify-center w-11 h-11 rounded-full bg-[#F2F4F6] hover:bg-line transition-colors z-10"
                    aria-label="닫기">
                    <X className="w-4 h-4 text-ink-600" />
                  </button>

                  {/* Frame 1: 회사 정보 */}
                  <div className="flex items-start gap-3 mb-5 pr-10">
                    <img src={selectedJob.logo_url} alt={selectedJob.company_name}
                      className="w-13 h-13 rounded-md object-contain bg-white p-1.5 border border-line shrink-0"
                      style={{ width: 52, height: 52 }} />
                    <div className="flex-1 min-w-0">
                      {selectedJob.recruit_type !== 'regular' && (
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold mb-1 ${
                          selectedJob.recruit_type === 'urgent_today' ? 'bg-danger/10 text-[#C81E2E]' : 'bg-warning/10 text-[#B45309]'
                        }`}>
                          {selectedJob.recruit_type === 'urgent_today' ? '🔥 오늘 긴급' : '⚡ 내일 긴급'}
                        </span>
                      )}
                      <h2 className="text-[18px] font-black text-ink-900 leading-tight break-words">{selectedJob.company_name}</h2>
                      <p className="text-[14px] text-ink-600 break-words">{selectedJob.center_name}</p>
                    </div>
                    <button onClick={() => toggleFav('center', `${selectedJob.company_name}::${selectedJob.center_name}`)}
                      className="flex items-center justify-center w-11 h-11 rounded-md hover:bg-brand-bg transition-colors shrink-0"
                      aria-label="즐겨찾기">
                      <Star className={`w-6 h-6 ${
                        isFavorited(favorites, 'center', `${selectedJob.company_name}::${selectedJob.center_name}`)
                          ? 'fill-brand text-brand' : 'text-ink-400'
                      }`} />
                    </button>
                  </div>

                  {/* Frame 2: 급여 */}
                  <div className="grid grid-cols-2 gap-2.5 mb-4">
                    <div className="bg-brand-bg rounded-md p-4 text-center">
                      <p className="text-[11px] text-ink-600 mb-1">시급</p>
                      <p className="text-[24px] font-black text-brand tracking-tight tabular-nums">{fmtWage(selectedJob.hourly_wage)}<span className="text-[14px]">원</span></p>
                    </div>
                    <div className="bg-[#F7F9FC] rounded-md p-4 text-center">
                      <p className="text-[11px] text-ink-600 mb-1">일급</p>
                      <p className="text-[24px] font-black text-ink-900 tracking-tight tabular-nums">{fmtWage(selectedJob.daily_wage)}<span className="text-[14px]">원</span></p>
                    </div>
                  </div>

                  {/* Frame 3: 근무 조건 */}
                  <div className="rounded-md bg-[#F7F9FC] p-4 mb-4">
                    <p className="text-[12px] font-bold text-ink-600 mb-3">근무 조건</p>
                    <div className="grid grid-cols-2 gap-y-4 gap-x-3">
                      <FrameRow icon={<MapPin className="w-4 h-4 text-brand" />} label="위치" value={selectedJob.address_detail} />
                      <FrameRow icon={<Clock className="w-4 h-4 text-brand" />} label="근무시간" value={selectedJob.work_hours} />
                      <FrameRow icon={<Users className="w-4 h-4 text-brand" />} label="모집인원" value={`${selectedJob.headcount}명`} />
                      {selectedJob.expires_at && <FrameRow icon={<Clock className="w-4 h-4 text-danger" />} label="마감일" value={fmtDate(selectedJob.expires_at)} />}
                    </div>
                  </div>

                  {/* Frame 4: 혜택 (그린) */}
                  {selectedJob.benefits.length > 0 && (
                    <div className="rounded-md bg-accent-bg border border-accent/20 p-4 mb-4">
                      <p className="text-[12px] font-bold text-[#047857] mb-3">🎁 혜택 &amp; 복리후생</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.benefits.map(b => (
                          <span key={b} className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-accent/20 text-[13px] font-semibold text-ink-700">
                            <span>{getBenefitEmoji(b)}</span>{b}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Frame 5: 상세 내용 */}
                  {selectedJob.description && (
                    <div className="rounded-md bg-[#F7F9FC] p-4 mb-4">
                      <p className="text-[12px] font-bold text-ink-600 mb-2.5">상세 내용</p>
                      <p className="text-[14px] text-ink-700 leading-relaxed whitespace-pre-line break-keep">{selectedJob.description}</p>
                    </div>
                  )}

                  {/* Frame 5.5: 위치 지도 */}
                  <div className="rounded-md bg-[#F7F9FC] p-4 mb-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Map className="w-4 h-4 text-brand" />
                      <p className="text-[12px] font-bold text-ink-600">위치 정보</p>
                    </div>
                    <p className="text-[13px] text-ink-700 mb-2.5 break-keep">{selectedJob.address_detail}</p>
                    <a
                      href={`https://map.kakao.com/?q=${encodeURIComponent(selectedJob.map_query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 min-h-[48px] rounded-md bg-[#FEE500] text-[#3C1E1E] font-bold text-[13px]
                        active:scale-[0.98] transition-transform"
                    >
                      <Map className="w-4 h-4" />
                      카카오맵에서 위치 보기
                    </a>
                  </div>

                  {/* Frame 6: 지원 방법 */}
                  <div className="rounded-md bg-[#F7F9FC] p-4">
                    <p className="text-[12px] font-bold text-ink-600 mb-3">지원 방법</p>
                    <div className="flex flex-col gap-2.5">
                      {selectedJob.apply_methods.map((method, i) => {
                        const cta = CTA_MAP[method.type] ?? CTA_MAP.phone
                        const Icon = cta.icon
                        const href =
                          method.type === 'phone' ? `tel:${method.value}` :
                          method.type === 'sms' ? `sms:${method.value}` :
                          method.value
                        return (
                          <a key={i} href={href}
                            target={['landing', 'kakao'].includes(method.type) ? '_blank' : undefined}
                            rel={['landing', 'kakao'].includes(method.type) ? 'noopener noreferrer' : undefined}
                            className={`flex items-center justify-center gap-2 min-h-[48px] rounded-md
                              ${cta.bg} ${cta.text} font-bold text-[14px]
                              active:scale-[0.98] transition-all`}>
                            <Icon className="w-4 h-4" />{method.label}
                          </a>
                        )
                      })}
                      {!selectedJob.external_link && (
                        <p className="text-center text-[13px] text-ink-500 py-1">회사 정보 링크 없음</p>
                      )}
                    </div>
                  </div>

                  {/* 비슷한 공고 더보기 */}
                  {(() => {
                    const similar = allJobs.filter(j =>
                      j.id !== selectedJob.id &&
                      (j.company_name === selectedJob.company_name || j.region === selectedJob.region)
                    ).slice(0, 3)
                    if (similar.length === 0) return null
                    return (
                      <div className="rounded-md bg-[#F7F9FC] p-4 mt-4">
                        <p className="text-[12px] font-bold text-ink-600 mb-3">📋 비슷한 공고 더보기</p>
                        <div className="flex flex-col gap-2">
                          {similar.map(j => (
                            <button
                              key={j.id}
                              onClick={() => setSelectedJob(j)}
                              className="flex items-center gap-3 p-3 rounded-md bg-white border border-line text-left hover:border-brand-200 transition-colors active:scale-[0.98]"
                            >
                              <img src={j.logo_url} alt={j.company_name}
                                className="w-9 h-9 rounded-md object-contain bg-white p-0.5 border border-line shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-bold text-ink-900 truncate">{j.company_name}</p>
                                <p className="text-[11px] text-ink-500 truncate">{j.center_name} · {j.region}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-[14px] font-black text-brand tabular-nums">{fmtWage(j.hourly_wage)}<span className="text-[10px] font-semibold">원</span></p>
                                <p className="text-[10px] text-ink-500">시급</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* 카카오톡 공유 */}
                  <div className="mt-4">
                    <p className="text-[12px] font-bold text-ink-600 mb-2.5">이 공고 공유하기</p>
                    <KakaoShareButton
                      onClick={() =>
                        shareJob({
                          companyName: selectedJob.company_name,
                          jobTitle: selectedJob.center_name || undefined,
                          region: selectedJob.region || undefined,
                          hourlyWage: selectedJob.hourly_wage || undefined,
                          dailyWage: selectedJob.daily_wage,
                          logoUrl: selectedJob.logo_url,
                        })
                      }
                      label="카카오톡으로 공유하기"
                    />
                  </div>
                </div>
              </div>

              {/* 하단 고정 CTA */}
              <div
                className="bg-white border-t border-line px-5 py-4 shrink-0"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
              >
                {appliedMap[selectedJob.id] ? (
                  <button
                    disabled
                    className="w-full min-h-[52px] rounded-lg bg-accent-bg border border-accent/20
                      text-[#047857] font-black text-[15px] flex items-center justify-center gap-2 cursor-default"
                  >
                    <CheckCircle2 className="w-5 h-5" />지원 완료
                  </button>
                ) : (
                  <button
                    onClick={(e) => handleApply(e, selectedJob.id)}
                    disabled={isApplySubmitting && pendingApplyJobId === selectedJob.id}
                    className="w-full min-h-[52px] rounded-lg bg-brand hover:bg-brand-strong
                      text-white font-black text-[15px] flex items-center justify-center gap-2
                      shadow-[0_8px_20px_rgba(49,130,246,0.30)] active:scale-[0.98] transition-all
                      disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isApplySubmitting && pendingApplyJobId === selectedJob.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>지원하기 <ChevronRight className="w-5 h-5" /></>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}

      {regionOpen && <div className="fixed inset-0 z-20" onClick={() => setRegionOpen(false)} />}

      {/* ── 지원 폼 모달 ── */}
      <ApplyFormModal
        isOpen={applyModalOpen}
        onClose={() => { setApplyModalOpen(false); setPendingApplyJobId(null) }}
        onSubmit={handleApplyModalSubmit}
        jobTitle={
          pendingApplyJobId
            ? (allJobs.find(j => j.id === pendingApplyJobId)?.company_name ?? '') +
              ' ' +
              (allJobs.find(j => j.id === pendingApplyJobId)?.center_name ?? '')
            : ''
        }
        isSubmitting={isApplySubmitting}
        taskOptions={
          pendingApplyJobId
            ? (allJobs.find(j => j.id === pendingApplyJobId)?.task_options ?? [])
            : []
        }
        shiftOptions={
          pendingApplyJobId
            ? (allJobs.find(j => j.id === pendingApplyJobId)?.shift_options ?? [])
            : []
        }
        workDate={
          pendingApplyJobId
            ? (allJobs.find(j => j.id === pendingApplyJobId)?.work_date ?? null)
            : null
        }
      />

      {/* ── 로그인 유도 모달 (portal로 body 렌더) ── */}
      {createPortal(
      <AnimatePresence>
        {loginPromptOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setLoginPromptOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[380px] bg-white rounded-xl p-6 shadow-float"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 rounded-lg bg-brand flex items-center justify-center shadow-[0_8px_20px_rgba(49,130,246,0.30)]">
                  <LogIn className="w-7 h-7 text-white" />
                </div>
              </div>
              <h3 className="text-[18px] font-black text-ink-900 text-center mb-2">
                로그인이 필요해요
              </h3>
              <p className="text-[13px] text-ink-600 text-center leading-relaxed mb-5">
                지원하기 기능은 로그인 후 사용할 수 있어요.<br />
                카카오 또는 구글로 1초만에 가입하세요!
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLoginPromptOpen(false)}
                  className="flex-1 min-h-[48px] rounded-md bg-[#F2F4F6] text-ink-700 text-[14px] font-semibold hover:bg-line transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => { setLoginPromptOpen(false); navigate('/login') }}
                  className="flex-1 min-h-[48px] rounded-md bg-brand hover:bg-brand-strong text-white text-[14px] font-bold shadow-[0_4px_14px_rgba(49,130,246,0.28)] transition-colors"
                >
                  로그인하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </div>
  )
}

// 복리후생 키워드 → 이모지 매핑 테이블 (부분 문자열 매칭)
const BENEFIT_EMOJI_MAP: [string, string][] = [
  ['식사', '🍱'], ['밥', '🍱'], ['도시락', '🍱'],
  ['셔틀', '🚌'], ['통근버스', '🚌'], ['버스', '🚌'],
  ['주차', '🅿️'],
  ['당일 지급', '💵'], ['일당', '💵'], ['즉시', '💵'],
  ['4대보험', '🛡️'], ['4대 보험', '🛡️'], ['보험', '🛡️'],
  ['안전화', '👢'],
  ['유니폼', '👕'], ['작업복', '👕'],
  ['야간수당', '🌙'], ['야간 수당', '🌙'], ['야간', '🌙'],
  ['주휴', '📅'], ['연차', '📅'],
  ['경력 우대', '⭐'], ['경력', '⭐'],
  ['신입 환영', '🙌'], ['신입', '🙌'],
  ['주말', '📆'],
]

function getBenefitEmoji(benefit: string): string {
  for (const [keyword, emoji] of BENEFIT_EMOJI_MAP) {
    if (benefit.includes(keyword)) return emoji
  }
  return '✓'
}

function FrameRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 min-w-0">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-ink-600">{label}</p>
        <p className="text-[13px] font-bold text-ink-900 break-keep">{value}</p>
      </div>
    </div>
  )
}
