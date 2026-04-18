// 채용정보 피드 — 물류센터 특화 UI v3
// 히어로 로테이션 문구 + 섹션 분류 + 공식 로고 + 즐겨찾기 + 프레임카드 상세(지도 포함)
// + 지원하기 버튼: 로그인 게이트 → 인적사항 폼 모달 → job_applications INSERT (D-NEW-5)
import { useEffect, useState, useMemo } from 'react'
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

// ── 히어로 로테이션 문구 + 색상 ──
const HERO_COPIES = [
  { text: '쿠팡 · CJ · 컬리 채용 정보를 한 곳에서', color: 'text-sky-200' },
  { text: '채용팀에서 직접 보내주는 검증된 채용 정보', color: 'text-emerald-200' },
  { text: '알바몬에도 없는, 현장의 실시간 공고', color: 'text-amber-200' },
  { text: '매일 새로 올라오는 채용 공고를 놓치지 마세요', color: 'text-violet-200' },
]

// 회사 로고 매핑은 lib/jobUtils.ts 에서 공유 (COMPANY_LOGOS, getCompanyLogoUrl)

// ── DB JobPosting → UI JobCardData 변환 함수 ──
// job_postings 테이블의 section + benefits 컬럼(20260410 추가)을 UI에 반영합니다.
function toCardData(job: JobPosting): JobCardData {
  // recruit_type: DB의 section 컬럼 우선 사용, 없으면 is_urgent로 폴백
  // section 컬럼: today-urgent(오늘추가모집) | tomorrow-urgent(내일긴급) | always(상시)
  let recruit_type: 'urgent_today' | 'urgent_tomorrow' | 'regular' = 'regular'
  if (job.section === 'today-urgent') {
    recruit_type = 'urgent_today'
  } else if (job.section === 'tomorrow-urgent') {
    recruit_type = 'urgent_tomorrow'
  } else if (job.is_urgent) {
    // 레거시 호환: section 없는 기존 긴급 공고 → 오늘 추가모집으로 표시
    recruit_type = 'urgent_today'
  }

  // 로고: 회사명에 키워드가 포함되면 해당 로고, 없으면 기본 아이콘
  const logo_url = getCompanyLogoUrl(job.company_name)

  // 복리후생: DB의 benefits 배열 사용 (20260410 추가). 없으면 빈 배열
  const benefits: string[] = Array.isArray(job.benefits) ? job.benefits : []

  // 지원 방법: contact_phone / external_link로부터 빌드
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
    address_detail: job.region,  // DB에 상세주소 없음 → region으로 대체
    benefits,
    apply_methods,
    // 카카오맵 검색어: "지역 회사명 센터명"
    map_query: `${job.region} ${job.company_name} ${job.center_name}`,
  }
}

// ── 섹션 설정 ──
const SECTIONS = [
  { type: 'urgent_today' as const, label: '오늘 추가모집', color: '#ef4444', bg: 'from-red-500/10 to-red-500/5', border: 'border-red-200', icon: '🔥' },
  { type: 'urgent_tomorrow' as const, label: '내일 긴급모집', color: '#f97316', bg: 'from-orange-500/10 to-orange-500/5', border: 'border-orange-200', icon: '⚡' },
  { type: 'regular' as const, label: '상시 모집', color: '#22c55e', bg: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-200', icon: '✅' },
]

// ── CTA 매핑 ──
const CTA_MAP: Record<string, { icon: typeof Phone; bg: string; text: string }> = {
  phone:   { icon: Phone,          bg: 'bg-gradient-to-r from-[#3182F6] to-[#2563eb]', text: 'text-white' },
  sms:     { icon: MessageSquare,   bg: 'bg-gradient-to-r from-[#10b981] to-[#059669]', text: 'text-white' },
  kakao:   { icon: Send,            bg: 'bg-[#FEE500]', text: 'text-[#3C1E1E]' },
  landing: { icon: ExternalLink,    bg: 'bg-gray-100 border border-gray-200', text: 'text-[#191f28]' },
  catch:   { icon: Rocket,          bg: 'bg-gradient-to-r from-[#3182F6] to-[#6366f1]', text: 'text-white' },
}

type SortKey = 'latest' | 'wage'
// REGION_OPTIONS는 DB 데이터 로드 후 동적으로 생성합니다 (컴포넌트 내부로 이동)

export default function JobsPage() {
  // ── SEO: 채용정보 페이지 탭 제목 설정 → 언마운트 시 기본 타이틀 복원 ──
  useEffect(() => {
    // PageMeta 컴포넌트가 title을 관리하므로 document.title 직접 설정 제거
    return () => {}
  }, [])

  const navigate = useNavigate()
  const { user, isLoggedIn } = useAuth()

  // 카카오톡 공유 훅 초기화
  const { shareJob } = useKakaoShare()

  const [loading, setLoading] = useState(true)
  // ── DB에서 불러온 공고 목록 (변환된 JobCardData 형태) ──
  const [allJobs, setAllJobs] = useState<JobCardData[]>([])
  // 에러 메시지 (DB 조회 실패 시)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<JobCardData | null>(null)
  const [regionFilter, setRegionFilter] = useState('전체')
  const [regionOpen, setRegionOpen] = useState(false)
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('latest')
  const [searchQuery, setSearchQuery] = useState('')
  const [favorites, setFavorites] = useState<JobFavorite[]>([])
  const [heroCopyIdx, setHeroCopyIdx] = useState(0)

  // 지원한 공고 ID 맵 (job_posting_id → application_id)
  const [appliedMap, setAppliedMap] = useState<Record<string, string>>({})
  // 지원 진행 중인 공고 ID (버튼 로딩 표시용 — 레거시, isApplySubmitting으로 대체)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_applyingId, _setApplyingId] = useState<string | null>(null)
  // 로그인 유도 모달 표시 여부
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  // 인라인 토스트 메시지 (alert 대체 — 2초 후 자동 소멸)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  // 지원 폼 모달 상태 (D-NEW-5: 로그인 게이트 → 인적사항 입력 → 지원 완료)
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [pendingApplyJobId, setPendingApplyJobId] = useState<string | null>(null)
  const [isApplySubmitting, setIsApplySubmitting] = useState(false)

  // ── URL 쿼리파라미터: Home 프리뷰에서 ?focus=<jobId>로 진입 시 해당 공고 자동 오픈 ──
  const [searchParams, setSearchParams] = useSearchParams()

  // 히어로 문구 로테이션
  useEffect(() => {
    const timer = setInterval(() => setHeroCopyIdx(i => (i + 1) % HERO_COPIES.length), 3000)
    return () => clearInterval(timer)
  }, [])

  // ── Supabase job_postings 조회 함수 ──
  // status = 'active' 인 공고만 가져와 JobCardData로 변환
  const fetchJobs = async () => {
    if (!supabase) { setLoading(false); return }
    setFetchError(null)
    try {
      // 오늘 날짜 (KST 기준, YYYY-MM-DD) — 만료 공고 자동 제외에 사용
      const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'active')        // 활성 공고만
        .or(`expires_at.gte.${todayStr},expires_at.is.null`)  // 마감일 지난 공고 자동 제외 (직업안정법 허위·과장광고 대응)
        .order('is_urgent', { ascending: false })  // 급구 먼저
        .order('created_at', { ascending: false })  // 최신순
      if (error) throw error
      // DB 데이터를 UI 카드 데이터 형태로 변환
      setAllJobs((data ?? []).map(job => toCardData(job as JobPosting)))
    } catch (err) {
      console.error('[공고 로드 오류]', err)
      setFetchError('공고를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // ── 최초 공고 로드 ──
  useEffect(() => {
    fetchJobs()
  }, [])

  // ── Supabase Realtime 구독 ──
  // 어드민이 공고를 추가/수정/삭제하면 채용탭에 즉시 반영
  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    const channel = sb
      .channel('job_postings_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'job_postings' },
        () => {
          // 변경 감지 시 전체 목록 재조회
          fetchJobs()
        }
      )
      .subscribe()

    return () => { sb.removeChannel(channel) }
  }, [])

  // ── Home 프리뷰에서 ?focus=<jobId>로 진입 시 해당 공고 상세 자동 오픈 ──
  useEffect(() => {
    const focusId = searchParams.get('focus')
    if (!focusId || loading || allJobs.length === 0) return
    const target = allJobs.find(j => j.id === focusId)
    if (target) {
      setSelectedJob(target)
      // focus 파라미터 제거 (뒤로가기 시 다시 열리지 않도록)
      searchParams.delete('focus')
      setSearchParams(searchParams, { replace: true })
    }
  }, [loading, allJobs, searchParams, setSearchParams])

  // 즐겨찾기 + 지원 현황 동시 로드
  useEffect(() => {
    if (!isLoggedIn || !user) return
    listFavorites(user.id).then(setFavorites)
    getAppliedJobIds(user.id).then(setAppliedMap)
  }, [isLoggedIn, user])

  // ── 지역 옵션 동적 생성 ──
  // DB에서 불러온 공고의 region 값으로부터 중복 제거 후 생성
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
  // 로그인하지 않은 상태에서 별 클릭 시 → 로그인 유도 모달 표시
  const toggleFav = async (type: 'company' | 'center', value: string) => {
    if (!isLoggedIn || !user) { setLoginPromptOpen(true); return }
    if (isFavorited(favorites, type, value)) {
      await removeFavorite(user.id, type, value)
    } else {
      await addFavorite(user.id, type, value)
    }
    setFavorites(await listFavorites(user.id))
  }

  // ── 인라인 토스트 표시 헬퍼 ──
  // alert() 대신 상단 fixed 배너로 2초간 표시 후 자동 사라짐
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMsg(msg)
    setToastType(type)
    setTimeout(() => setToastMsg(null), 2000)
  }

  // ── 지원하기 핸들러 — 1단계: 게이트 체크 ──
  // 로그인 여부 → 중복 확정 사전 체크 → 모달 오픈 (D-NEW-5)
  const handleApply = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation()  // 카드 클릭 이벤트 버블링 방지

    // 비로그인 → 로그인 유도 모달
    if (!isLoggedIn || !user) {
      setLoginPromptOpen(true)
      return
    }

    // 이미 지원한 공고 → 중복 방지
    if (appliedMap[jobId]) return

    // 해당 공고의 work_date 조회 (중복 확정 체크용)
    const targetJob = allJobs.find(j => j.id === jobId)
    const jobWorkDate = targetJob?.work_date ?? null

    // 프론트 사전 체크: 같은 날짜에 이미 confirmed 상태인 지원이 있으면 차단
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

    // 지원 폼 모달 오픈 (인적사항 + 근무정보 + 동의 입력)
    setPendingApplyJobId(jobId)
    setApplyModalOpen(true)
  }

  // ── 지원하기 핸들러 — 2단계: 폼 제출 ──
  // ApplyFormModal에서 인적사항 + 근무정보 + 동의를 받아 DB에 INSERT
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
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-28">
      {/* ── SEO 메타태그: 채용정보 페이지 ── */}
      {/* noIndex: 공고 본문(일급·회사명·센터명)이 Google 스니펫에 노출되지 않도록 차단 */}
      <PageMeta
        title="쿠팡·컬리 일용직 채용정보 | CATCH"
        description="쿠팡, 쿠팡이츠, 마켓컬리, CJ대한통운 등 일용직 단기알바 최신 채용정보. 오늘 시작 가능한 급구 공고 확인하세요."
        canonical="https://catch-daily-worker.vercel.app/jobs"
        noIndex={true}
      />

      {/* ── 인라인 토스트 배너 (alert 대체) ──
          fixed 상단 배너: 2초간 표시 후 AnimatePresence로 부드럽게 사라짐 */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-32px)] max-w-[428px]
              px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold text-center
              ${toastType === 'success'
                ? 'bg-[#3182f6] text-white'
                : 'bg-red-500 text-white'
              }`}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[460px] flex flex-col gap-4">

        {/* ── 히어로 카드 — 생동감 있는 그래디언트 + 로테이션 문구 ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-[28px] overflow-hidden relative"
        >
          <div className="bg-gradient-to-br from-[#1e40af] via-[#3b82f6] to-[#7c3aed] p-6 pb-5">
            {/* 글로우 장식 */}
            <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 w-20 h-20 rounded-full bg-white/[0.06] blur-2xl pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent animate-shimmer bg-[length:200%_100%] pointer-events-none" />

            <div className="relative z-10">
              {/* 메인 타이틀 */}
              <h1 className="text-[22px] font-black text-white leading-tight tracking-tight mb-2">
                우리 지역 채용 정보<br />캐치하기
              </h1>

              {/* 로테이션 서브 타이틀 — 문구별 색상 변화 */}
              <div className="h-[40px] overflow-hidden mb-4">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p
                    key={heroCopyIdx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className={`text-[13px] leading-relaxed font-medium ${HERO_COPIES[heroCopyIdx].color}`}
                  >
                    {HERO_COPIES[heroCopyIdx].text}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* 요약 수치 — 375px 모바일에서 4칸 유지하되 px-1로 패딩 축소 */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { n: allJobs.length, label: '전체', c: 'text-white' },
                  { n: allJobs.filter(j => j.recruit_type === 'urgent_today').length, label: '오늘긴급', c: 'text-red-300' },
                  { n: allJobs.filter(j => j.recruit_type === 'urgent_tomorrow').length, label: '내일긴급', c: 'text-amber-300' },
                  { n: allJobs.filter(j => j.recruit_type === 'regular').length, label: '상시', c: 'text-emerald-300' },
                ].map(s => (
                  <div key={s.label} className="px-1 py-2 rounded-2xl bg-white/[0.12] backdrop-blur-sm text-center">
                    <p className={`text-[16px] font-black ${s.c}`}>{s.n}</p>
                    <p className="text-[9px] text-white/50 font-medium leading-tight">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── 검색바 ── */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b95a1]" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="회사, 센터, 지역, 업무 검색"
            className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white/80 backdrop-blur-md border border-white/60
              text-[14px] text-[#191f28] placeholder:text-[#c8cdd2] outline-none
              focus:ring-2 focus:ring-[#3182f6]/30 shadow-[0_4px_16px_rgba(49,130,246,0.06)] transition-all"
          />
        </div>

        {/* ── 카테고리 바 — overflow-x-auto로 375px 가로 스크롤 방지 ── */}
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md rounded-2xl p-2 border border-white/60 shadow-[0_4px_16px_rgba(49,130,246,0.04)] overflow-x-auto min-w-0">
          {/* 지역 드롭다운 */}
          <div className="relative">
            <button onClick={() => setRegionOpen(v => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
                regionFilter !== '전체'
                  ? 'bg-[#3182f6] text-white shadow-md shadow-blue-500/20'
                  : 'bg-white text-[#4e5968] shadow-sm'
              }`}>
              <MapPin className="w-3.5 h-3.5" />
              {regionFilter}
              <ChevronDown className={`w-3 h-3 transition-transform ${regionOpen ? 'rotate-180' : ''}`} />
            </button>
            {regionOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-44 bg-white rounded-2xl shadow-2xl border border-gray-100 z-30 overflow-hidden py-1">
                {REGION_OPTIONS.map(r => (
                  <button key={r} onClick={() => { setRegionFilter(r); setRegionOpen(false) }}
                    className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors ${
                      regionFilter === r ? 'bg-blue-50 text-[#3182f6] font-bold' : 'text-[#4e5968] hover:bg-gray-50'
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 급구 토글 */}
          <button onClick={() => setUrgentOnly(v => !v)}
            className={`px-3.5 py-2.5 rounded-xl text-[13px] font-bold transition-all ${
              urgentOnly ? 'bg-red-500 text-white shadow-md shadow-red-500/20' : 'bg-white text-[#8b95a1] shadow-sm'
            }`}>
            🔥 급구
          </button>

          <div className="flex-1" />

          {/* 정렬 */}
          <button onClick={() => setSortKey(s => s === 'latest' ? 'wage' : 'latest')}
            className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-white text-[12px] font-bold text-[#4e5968] shadow-sm">
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortKey === 'latest' ? '최신순' : '시급순'}
          </button>
        </div>

        {/* ── 섹션별 공고 ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-2 text-[#8b95a1]">
            <Loader2 className="w-5 h-5 animate-spin" /><span className="text-[14px]">불러오는 중...</span>
          </div>
        ) : fetchError ? (
          // DB 조회 실패 시 에러 카드 표시
          <div className="rounded-[28px] p-10 bg-white/60 backdrop-blur-md border border-red-100 text-center">
            <p className="text-[15px] font-bold text-red-500 mb-2">⚠️ 오류</p>
            <p className="text-[13px] text-[#8b95a1]">{fetchError}</p>
            <button
              onClick={fetchJobs}
              className="mt-4 px-5 py-2 rounded-xl bg-[#3182f6] text-white text-[13px] font-bold"
            >
              다시 불러오기
            </button>
          </div>
        ) : sections.length === 0 ? (
          <div className="rounded-[28px] p-10 bg-white/60 backdrop-blur-md border border-white/60 text-center">
            <Briefcase className="w-12 h-12 text-[#d1d5db] mx-auto mb-3" />
            <p className="text-[16px] font-bold text-[#8b95a1]">공고가 없어요</p>
            <p className="text-[13px] text-[#c8cdd2] mt-1">검색 조건을 변경해보세요</p>
          </div>
        ) : (
          sections.map(section => (
            <div key={section.type}>
              {/* 섹션 헤더 */}
              <div className={`flex items-center gap-2 mb-3 px-4 py-2 rounded-2xl bg-gradient-to-r ${section.bg} border ${section.border}`}>
                <span className="text-[15px]">{section.icon}</span>
                <span className="text-[14px] font-extrabold" style={{ color: section.color }}>{section.label}</span>
                <span className="ml-auto text-[12px] font-bold px-2.5 py-0.5 rounded-full" style={{ background: section.color + '15', color: section.color }}>{section.jobs.length}건</span>
              </div>

              <div className="flex flex-col gap-3 mb-4">
                {section.jobs.map((job, i) => {
                  const centerKey = `${job.company_name}::${job.center_name}`
                  const isFav = isFavorited(favorites, 'company', job.company_name) || isFavorited(favorites, 'center', centerKey)

                  return (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className={`rounded-[24px] overflow-hidden bg-white/80 backdrop-blur-md border-2 transition-all
                        shadow-[0_8px_32px_rgba(49,130,246,0.06)]
                        ${isFav ? 'border-yellow-400 shadow-[0_8px_32px_rgba(250,204,21,0.15)]' : 'border-white/60'}`}
                    >
                      <div className="p-4">
                        {/* 상단: 로고 + 회사명/센터명 + 긴급배지 + 즐겨찾기 */}
                        <div className="flex items-start gap-3 mb-3.5">
                          <img src={job.logo_url} alt={job.company_name}
                            className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-sm border border-gray-100 shrink-0" />
                          <div className="flex-1 min-w-0">
                            {/* 긴급 배지 — 카드 상단에 크게 표시 */}
                            {job.recruit_type !== 'regular' && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold mb-1 ${
                                job.recruit_type === 'urgent_today' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                              }`}>
                                {job.recruit_type === 'urgent_today' ? '🔥 오늘 긴급' : '⚡ 내일 긴급'}
                              </span>
                            )}
                            <p className="text-[15px] font-extrabold text-[#191f28] leading-tight truncate">{job.company_name}</p>
                            <p className="text-[12px] text-[#8b95a1] leading-tight truncate">{job.center_name}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); toggleFav('center', centerKey) }}
                            className="p-1.5 -mt-0.5 rounded-xl hover:bg-yellow-50 transition-colors shrink-0">
                            <Star className={`w-5 h-5 transition-all ${isFav ? 'fill-yellow-400 text-yellow-400 scale-110' : 'text-gray-300'}`} />
                          </button>
                        </div>

                        {/* 시급 히어로 카드 — 지원 동기의 핵심 정보. 시급 크게, 일급 보조 */}
                        <div className="bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 rounded-2xl px-4 py-3 mb-3">
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] text-[#8b95a1] font-medium">시급</span>
                              <span className="text-[26px] font-black text-[#3182f6] tracking-tight leading-none">{fmtWage(job.hourly_wage)}</span>
                              <span className="text-[13px] font-bold text-[#3182f6]">원</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-[10px] text-[#8b95a1] font-medium">일급</span>
                              <span className="text-[16px] font-black text-[#4e5968] tracking-tight">{fmtWage(job.daily_wage)}</span>
                              <span className="text-[11px] font-semibold text-[#8b95a1]">원</span>
                            </div>
                          </div>
                        </div>

                        {/* 위치·시간·모집인원·마감 한 줄 — 작은 점(·)으로 구분해 콤팩트하게 */}
                        <div className="flex items-center gap-1.5 text-[12px] text-[#6b7280] mb-2.5 flex-wrap">
                          <span className="flex items-center gap-1 shrink-0">
                            <MapPin className="w-3.5 h-3.5 text-[#3182f6] shrink-0" />
                            <span className="truncate max-w-[90px]">{job.address_detail}</span>
                          </span>
                          <span className="text-[#c8cdd2] shrink-0">·</span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="w-3.5 h-3.5 text-[#8b95a1] shrink-0" />{job.work_hours}
                          </span>
                          <span className="text-[#c8cdd2] shrink-0">·</span>
                          <span className="flex items-center gap-1 shrink-0 font-medium">
                            <Users className="w-3.5 h-3.5 text-[#8b95a1] shrink-0" />{job.headcount}명
                          </span>
                          {job.expires_at && (
                            <>
                              <span className="text-[#c8cdd2] shrink-0">·</span>
                              <span className="shrink-0 text-[#ef4444] font-semibold">~{fmtDate(job.expires_at)}</span>
                            </>
                          )}
                        </div>

                        {/* 혜택 뱃지 — 최대 3개 + 초과 카운트. 이모지 강조 */}
                        {job.benefits.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-3">
                            {job.benefits.slice(0, 3).map(b => (
                              <span key={b} className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-100 text-[11px] font-semibold text-emerald-700">
                                <span className="text-[10px]">{getBenefitEmoji(b)}</span>{b}
                              </span>
                            ))}
                            {job.benefits.length > 3 && (
                              <span className="text-[11px] text-[#8b95a1] font-medium">+{job.benefits.length - 3}개 더</span>
                            )}
                          </div>
                        )}

                        {/* 하단 버튼: 상세보기(라인) + 지원하기(강조) */}
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="flex-1 py-3 rounded-2xl border border-[#e5e8eb] text-[#4e5968]
                              font-bold text-[13px] flex items-center justify-center gap-1
                              active:scale-[0.98] transition-transform hover:bg-gray-50"
                          >
                            상세보기
                          </button>

                          {/* 지원하기 버튼 — 이미 지원했으면 비활성화 */}
                          {appliedMap[job.id] ? (
                            <button
                              disabled
                              className="flex-1 py-3 rounded-2xl bg-emerald-100 text-emerald-700
                                font-bold text-[13px] flex items-center justify-center gap-1
                                cursor-default opacity-90"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              지원완료
                            </button>
                          ) : (
                            <button
                              onClick={(e) => handleApply(e, job.id)}
                              disabled={isApplySubmitting && pendingApplyJobId === job.id}
                              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#3182F6] to-[#6366f1]
                                text-white font-bold text-[13px] flex items-center justify-center gap-1
                                shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-transform
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
            </div>
          ))
        )}
      </div>

      {/* ── 상세 바텀시트 — 프레임카드 6영역 + 지도 ── */}
      <AnimatePresence>
        {selectedJob && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedJob(null)}
          >
            <motion.div
              initial={{ y: 500 }}
              animate={{ y: 0 }}
              exit={{ y: 500 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-full max-w-[460px] bg-white rounded-t-[28px]
                shadow-[0_-12px_48px_rgba(0,0,0,0.12)] max-h-[92vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* 스크롤 가능 콘텐츠 영역 — sticky CTA와 분리 */}
              <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
                <button onClick={() => setSelectedJob(null)}
                  className="absolute top-5 right-5 p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors">
                  <X className="w-4 h-4 text-[#8b95a1]" />
                </button>

                {/* Frame 1: 회사 정보 */}
                <div className="flex items-center gap-3 mb-5">
                  {/* 회사 공식 로고 (상세) */}
                  <img src={selectedJob.logo_url} alt={selectedJob.company_name}
                    className="w-13 h-13 rounded-2xl object-contain bg-white p-1.5 shadow-md border border-gray-100 shrink-0"
                    style={{ width: 52, height: 52 }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      {selectedJob.recruit_type !== 'regular' && (
                        <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                          selectedJob.recruit_type === 'urgent_today' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                          {selectedJob.recruit_type === 'urgent_today' ? '🔥 오늘 긴급' : '⚡ 내일 긴급'}
                        </span>
                      )}
                    </div>
                    <h2 className="text-[18px] font-black text-[#191f28] mt-0.5">{selectedJob.company_name}</h2>
                    <p className="text-[14px] text-[#6b7280]">{selectedJob.center_name}</p>
                  </div>
                  <button onClick={() => toggleFav('center', `${selectedJob.company_name}::${selectedJob.center_name}`)}
                    className="p-2 rounded-xl hover:bg-yellow-50 transition-colors">
                    <Star className={`w-6 h-6 ${
                      isFavorited(favorites, 'center', `${selectedJob.company_name}::${selectedJob.center_name}`)
                        ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`} />
                  </button>
                </div>

                {/* Frame 2: 급여 */}
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl p-4 text-center">
                    <p className="text-[11px] text-[#8b95a1] mb-1">시급</p>
                    <p className="text-[26px] font-black text-[#3182f6] tracking-tight">{fmtWage(selectedJob.hourly_wage)}<span className="text-[14px]">원</span></p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 text-center">
                    <p className="text-[11px] text-[#8b95a1] mb-1">일급</p>
                    <p className="text-[26px] font-black text-[#191f28] tracking-tight">{fmtWage(selectedJob.daily_wage)}<span className="text-[14px]">원</span></p>
                  </div>
                </div>

                {/* Frame 3: 근무 조건 */}
                <div className="rounded-2xl bg-gray-50 p-4 mb-4">
                  <p className="text-[12px] font-bold text-[#8b95a1] mb-3">근무 조건</p>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-3">
                    <FrameRow icon={<MapPin className="w-4 h-4 text-[#3182f6]" />} label="위치" value={selectedJob.address_detail} />
                    <FrameRow icon={<Clock className="w-4 h-4 text-[#f59e0b]" />} label="근무시간" value={selectedJob.work_hours} />
                    <FrameRow icon={<Users className="w-4 h-4 text-[#10b981]" />} label="모집인원" value={`${selectedJob.headcount}명`} />
                    {selectedJob.expires_at && <FrameRow icon={<Clock className="w-4 h-4 text-[#ef4444]" />} label="마감일" value={fmtDate(selectedJob.expires_at)} />}
                  </div>
                </div>

                {/* Frame 4: 혜택 & 복리후생 — 이모지 매핑으로 시각적 매력 강화 */}
                {selectedJob.benefits.length > 0 && (
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4 mb-4">
                    <p className="text-[12px] font-bold text-emerald-700 mb-3">🎁 혜택 &amp; 복리후생</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.benefits.map(b => (
                        <span key={b} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-emerald-100 text-[13px] font-semibold text-[#4e5968] shadow-sm">
                          <span>{getBenefitEmoji(b)}</span>{b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Frame 5: 상세 내용 */}
                {selectedJob.description && (
                  <div className="rounded-2xl bg-gray-50 p-4 mb-4">
                    <p className="text-[12px] font-bold text-[#8b95a1] mb-2.5">상세 내용</p>
                    <p className="text-[14px] text-[#4e5968] leading-relaxed whitespace-pre-line">{selectedJob.description}</p>
                  </div>
                )}

                {/* Frame 5.5: 위치 지도 */}
                <div className="rounded-2xl bg-gray-50 p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Map className="w-4 h-4 text-[#3182f6]" />
                    <p className="text-[12px] font-bold text-[#8b95a1]">위치 정보</p>
                  </div>
                  <p className="text-[13px] text-[#4e5968] mb-2.5">{selectedJob.address_detail}</p>
                  <a
                    href={`https://map.kakao.com/?q=${encodeURIComponent(selectedJob.map_query)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FEE500] text-[#3C1E1E] font-bold text-[13px]
                      active:scale-[0.98] transition-transform"
                  >
                    <Map className="w-4 h-4" />
                    카카오맵에서 위치 보기
                  </a>
                </div>

                {/* Frame 6: 지원 방법 */}
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-[12px] font-bold text-[#8b95a1] mb-3">지원 방법</p>
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
                          className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl
                            ${cta.bg} ${cta.text} font-bold text-[14px]
                            active:scale-[0.98] transition-transform`}>
                          <Icon className="w-4 h-4" />{method.label}
                        </a>
                      )
                    })}
                    {/* 원본 공고 링크 없는 경우 명시 — 직업안정법 면책 대응 */}
                    {!selectedJob.external_link && (
                      <p className="text-center text-[13px] text-gray-400 py-1">회사 정보 링크 없음</p>
                    )}
                  </div>
                </div>

                {/* 비슷한 공고 더보기 — 같은 회사 또는 같은 지역 공고 최대 3건 */}
                {(() => {
                  const similar = allJobs.filter(j =>
                    j.id !== selectedJob.id &&
                    (j.company_name === selectedJob.company_name || j.region === selectedJob.region)
                  ).slice(0, 3)
                  if (similar.length === 0) return null
                  return (
                    <div className="rounded-2xl bg-gray-50 p-4 mb-4">
                      <p className="text-[12px] font-bold text-[#8b95a1] mb-3">📋 비슷한 공고 더보기</p>
                      <div className="flex flex-col gap-2">
                        {similar.map(j => (
                          <button
                            key={j.id}
                            onClick={() => setSelectedJob(j)}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-100 text-left hover:border-blue-200 transition-colors active:scale-[0.98]"
                          >
                            <img src={j.logo_url} alt={j.company_name}
                              className="w-9 h-9 rounded-lg object-contain bg-white p-0.5 border border-gray-100 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold text-[#191f28] truncate">{j.company_name}</p>
                              <p className="text-[11px] text-[#8b95a1] truncate">{j.center_name} · {j.region}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-[14px] font-black text-[#3182f6]">{fmtWage(j.hourly_wage)}<span className="text-[10px] font-semibold">원</span></p>
                              <p className="text-[10px] text-[#8b95a1]">시급</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* 카카오톡 공유 버튼 — 채용공고를 지인에게 공유 */}
                <div className="mt-1">
                  <p className="text-[12px] font-bold text-[#8b95a1] mb-2.5">이 공고 공유하기</p>
                  <KakaoShareButton
                    onClick={() =>
                      shareJob({
                        companyName: selectedJob.company_name,
                        // job_title 필드 없음 — center_name을 직종 힌트로 사용
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
              {/* ── 하단 고정 CTA — 지원하기 버튼을 항상 눈에 보이게 sticky 배치 ── */}
              <div
                className="bg-white border-t border-gray-100 px-5 py-4 shrink-0"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
              >
                {appliedMap[selectedJob.id] ? (
                  // 이미 지원 완료 상태
                  <button
                    disabled
                    className="w-full py-4 rounded-2xl bg-emerald-50 border border-emerald-200
                      text-emerald-700 font-black text-[15px] flex items-center justify-center gap-2 cursor-default"
                  >
                    <CheckCircle2 className="w-5 h-5" />지원 완료
                  </button>
                ) : (
                  // 지원하기 버튼 — 팝업에서 바로 지원 가능
                  <button
                    onClick={(e) => handleApply(e, selectedJob.id)}
                    disabled={isApplySubmitting && pendingApplyJobId === selectedJob.id}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#3182F6] to-[#6366f1]
                      text-white font-black text-[15px] flex items-center justify-center gap-2
                      shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-transform
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
      </AnimatePresence>

      {regionOpen && <div className="fixed inset-0 z-20" onClick={() => setRegionOpen(false)} />}

      {/* ── 지원 폼 모달 — 인적사항 + 근무정보 + 동의 (전면 개편 2026-04-11) ── */}
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
        // 공고별 업무 선택지 (task_options 없으면 기본값 사용)
        taskOptions={
          pendingApplyJobId
            ? (allJobs.find(j => j.id === pendingApplyJobId)?.task_options ?? [])
            : []
        }
        // 공고별 모집 근무조 (비어있으면 전체 표시)
        shiftOptions={
          pendingApplyJobId
            ? (allJobs.find(j => j.id === pendingApplyJobId)?.shift_options ?? [])
            : []
        }
        // 공고 근무 예정일 — 중복 확정 차단 기준
        workDate={
          pendingApplyJobId
            ? (allJobs.find(j => j.id === pendingApplyJobId)?.work_date ?? null)
            : null
        }
      />

      {/* ── 로그인 유도 모달 — 비로그인 상태에서 지원하기 클릭 시 표시 ── */}
      <AnimatePresence>
        {loginPromptOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setLoginPromptOpen(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[380px] bg-white rounded-[28px] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.15)]"
            >
              {/* 아이콘 */}
              <div className="flex items-center justify-center mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <LogIn className="w-7 h-7 text-white" />
                </div>
              </div>

              {/* 텍스트 */}
              <h3 className="text-[18px] font-black text-[#191f28] text-center mb-2">
                로그인이 필요해요
              </h3>
              <p className="text-[13px] text-[#8b95a1] text-center leading-relaxed mb-5">
                지원하기 기능은 로그인 후 사용할 수 있어요.<br />
                카카오 또는 구글로 1초만에 가입하세요!
              </p>

              {/* 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={() => setLoginPromptOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 text-[#4e5968] text-[14px] font-semibold hover:bg-gray-200 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => { setLoginPromptOpen(false); navigate('/login') }}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#3182F6] to-[#2563eb] text-white text-[14px] font-bold shadow-md shadow-blue-500/25 hover:opacity-90 transition-opacity"
                >
                  로그인하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// 복리후생 키워드 → 이모지 매핑 테이블 (부분 문자열 매칭)
// ⚠️ 주의: 긴 키워드를 짧은 키워드보다 반드시 앞에 등록해야 올바르게 매칭됨
// 예) '야간수당'이 '야간'보다 앞에, '4대 보험'이 '보험'보다 앞에 있어야 함
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

// 혜택 텍스트에서 이모지를 찾아 반환. 매칭 없으면 ✓
function getBenefitEmoji(benefit: string): string {
  for (const [keyword, emoji] of BENEFIT_EMOJI_MAP) {
    if (benefit.includes(keyword)) return emoji
  }
  return '✓'
}

function FrameRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div>{icon}</div>
      <div>
        <p className="text-[10px] text-[#8b95a1]">{label}</p>
        <p className="text-[13px] font-bold text-[#191f28]">{value}</p>
      </div>
    </div>
  )
}
