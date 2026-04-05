// 채용정보 피드 — 물류센터 특화 UI v3
// 히어로 로테이션 문구 + 섹션 분류 + 공식 로고 + 즐겨찾기 + 프레임카드 상세(지도 포함)
// + 지원하기 버튼 (job_applications 테이블 연동)
import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { applyToJob, getAppliedJobIds } from '../lib/jobApplications'
import type { JobPosting } from '../types/supabase'
import type { JobFavorite } from '../types/supabase'

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

// ── 회사명 → 로고 URL 매핑 ──
// DB에 logo_url 컬럼이 없으므로 company_name으로 로컬 에셋을 찾음
const COMPANY_LOGOS: Record<string, string> = {
  '쿠팡': '/logos/coupang.svg',
  '쿠팡풀필먼트서비스': '/logos/coupang.svg',
  'CJ대한통운': '/logos/cj.svg',
  'CJ': '/logos/cj.svg',
  '컬리': '/logos/kurly.png',
  '마켓컬리': '/logos/kurly.png',
  'GS리테일': '/logos/gs.svg',
  '롯데': '/logos/lotte.svg',
}

// ── DB JobPosting → UI JobCardData 변환 함수 ──
// job_postings 테이블에는 logo_url, benefits, apply_methods 컬럼이 없으므로
// company_name 및 다른 컬럼으로부터 UI에 필요한 값을 파생합니다.
function toCardData(job: JobPosting): JobCardData {
  // 오늘 날짜 (KST 기준 YYYY-MM-DD)
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
  const createdStr = (job.created_at ?? '').slice(0, 10)

  // recruit_type: is_urgent 여부 + 등록일이 오늘인지로 판별
  // 오늘 등록된 급구 공고 → urgent_today / 이전에 등록된 급구 → urgent_tomorrow / 일반 → regular
  let recruit_type: 'urgent_today' | 'urgent_tomorrow' | 'regular' = 'regular'
  if (job.is_urgent) {
    recruit_type = createdStr === todayStr ? 'urgent_today' : 'urgent_tomorrow'
  }

  // 로고: 회사명에 키워드가 포함되면 해당 로고, 없으면 기본 아이콘
  const logoKey = Object.keys(COMPANY_LOGOS).find(k => job.company_name.includes(k))
  const logo_url = logoKey ? COMPANY_LOGOS[logoKey] : '/logos/default.svg'

  // 복리후생: description에서 파싱 (각 줄이 혜택 항목인 경우)
  // description이 없거나 파싱 불가 시 빈 배열 → UI에서 description 텍스트로 대체 표시
  const benefits: string[] = []

  // 지원 방법: contact_phone / external_link로부터 빌드
  const apply_methods: ApplyMethod[] = []
  if (job.contact_phone) {
    apply_methods.push({ type: 'phone', label: '전화 지원', value: job.contact_phone })
    apply_methods.push({ type: 'sms', label: '문자 지원', value: job.contact_phone })
  }
  if (job.external_link) {
    apply_methods.push({ type: 'landing', label: '원본 공고 바로가기 →', value: job.external_link })
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
    document.title = '채용정보 | CATCH'
    return () => { document.title = 'CATCH - 쿠팡 일용직 퇴직금·실업급여 계산기' }
  }, [])

  const navigate = useNavigate()
  const { user, isLoggedIn } = useAuth()
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
  // 지원 진행 중인 공고 ID (버튼 로딩 표시용)
  const [applyingId, setApplyingId] = useState<string | null>(null)
  // 로그인 유도 모달 표시 여부
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  // 인라인 토스트 메시지 (alert 대체 — 2초 후 자동 소멸)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

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

  // ── 지원하기 핸들러 ──
  // 로그인 여부 확인 → 이미 지원한 공고인지 확인 → job_applications INSERT
  const handleApply = async (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation()  // 카드 클릭 이벤트 버블링 방지

    // 로그인 안 된 경우 → 로그인 유도 모달
    if (!isLoggedIn || !user) {
      setLoginPromptOpen(true)
      return
    }

    // 이미 지원한 공고 → 중복 방지
    if (appliedMap[jobId]) return

    setApplyingId(jobId)
    try {
      const appId = await applyToJob(user.id, jobId)
      if (appId) {
        // 성공 시 지원 목록 갱신 + 토스트 표시 (+50P 자동 지급은 applyToJob 내부에서 처리)
        setAppliedMap(prev => ({ ...prev, [jobId]: appId }))
        showToast('지원 완료! (+50P) 마이페이지 → 지원현황에서 확인하세요.', 'success')
      } else {
        showToast('지원 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error')
      }
    } finally {
      setApplyingId(null)
    }
  }

  const fmtWage = (w: number) => w.toLocaleString('ko-KR')
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-28">

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

              {/* 요약 수치 */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { n: allJobs.length, label: '전체', c: 'text-white' },
                  { n: allJobs.filter(j => j.recruit_type === 'urgent_today').length, label: '오늘 긴급', c: 'text-red-300' },
                  { n: allJobs.filter(j => j.recruit_type === 'urgent_tomorrow').length, label: '내일 긴급', c: 'text-amber-300' },
                  { n: allJobs.filter(j => j.recruit_type === 'regular').length, label: '상시', c: 'text-emerald-300' },
                ].map(s => (
                  <div key={s.label} className="px-2 py-2 rounded-2xl bg-white/[0.12] backdrop-blur-sm text-center">
                    <p className={`text-[18px] font-black ${s.c}`}>{s.n}</p>
                    <p className="text-[10px] text-white/50 font-medium">{s.label}</p>
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

        {/* ── 카테고리 바 ── */}
        <div className="flex items-center gap-2 bg-white/50 backdrop-blur-md rounded-2xl p-2 border border-white/60 shadow-[0_4px_16px_rgba(49,130,246,0.04)]">
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

        {/* ── 면책 문구 — 직업안정법 법적 리스크 대응 (허위·과장광고 책임 완화) ── */}
        <p className="text-xs text-gray-400 text-center px-2">
          본 정보는 원본 채용공고를 요약한 것입니다. 상세 내용 및 지원은 원본 공고를 확인하세요.
        </p>

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
                        {/* 로고 + 회사명 + 즐겨찾기 */}
                        <div className="flex items-start gap-3 mb-3">
                          {/* 회사 공식 로고 */}
                          <img src={job.logo_url} alt={job.company_name}
                            className="w-11 h-11 rounded-xl object-contain bg-white p-1 shadow-sm border border-gray-100 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {job.recruit_type !== 'regular' && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  job.recruit_type === 'urgent_today' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                }`}>
                                  {job.recruit_type === 'urgent_today' ? '오늘' : '내일'}
                                </span>
                              )}
                              <span className="text-[15px] font-extrabold text-[#191f28] truncate">{job.company_name}</span>
                            </div>
                            <p className="text-[13px] text-[#6b7280]">{job.center_name}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); toggleFav('center', centerKey) }}
                            className="p-1.5 -mt-0.5 rounded-xl hover:bg-yellow-50 transition-colors shrink-0">
                            <Star className={`w-5 h-5 transition-all ${isFav ? 'fill-yellow-400 text-yellow-400 scale-110' : 'text-gray-300'}`} />
                          </button>
                        </div>

                        {/* 위치 + 시간 */}
                        <div className="flex items-center gap-3 text-[12px] text-[#6b7280] mb-3">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#3182f6]" />{job.address_detail}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-[#8b95a1]" />{job.work_hours}</span>
                        </div>

                        {/* 시급/일급 2열 */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-2xl px-3 py-2.5 text-center">
                            <p className="text-[10px] text-[#8b95a1] mb-0.5">시급</p>
                            <p className="text-[19px] font-black text-[#3182f6] tracking-tight">{fmtWage(job.hourly_wage)}<span className="text-[11px] font-bold">원</span></p>
                          </div>
                          <div className="bg-slate-50 rounded-2xl px-3 py-2.5 text-center">
                            <p className="text-[10px] text-[#8b95a1] mb-0.5">일급</p>
                            <p className="text-[19px] font-black text-[#191f28] tracking-tight">{fmtWage(job.daily_wage)}<span className="text-[11px] font-bold">원</span></p>
                          </div>
                        </div>

                        {/* 혜택 뱃지 */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {job.benefits.map(b => (
                            <span key={b} className="px-2.5 py-1 rounded-lg bg-gray-50 border border-gray-100 text-[11px] font-semibold text-[#6b7280]">{b}</span>
                          ))}
                        </div>

                        {/* 인원 + 마감 */}
                        <div className="flex items-center justify-between text-[12px] text-[#8b95a1] mb-3">
                          <span className="flex items-center gap-1 font-medium"><Users className="w-3.5 h-3.5" />{job.headcount}명 모집</span>
                          {job.expires_at && <span className="font-medium">~{fmtDate(job.expires_at)} 마감</span>}
                        </div>

                        {/* 하단 버튼 영역: 상세보기 + 지원하기 */}
                        <div className="flex gap-2">
                          {/* 상세보기 버튼 — 기존 CATCH 하기와 동일한 동작 */}
                          <button
                            onClick={() => setSelectedJob(job)}
                            className="flex-1 py-3 rounded-2xl border border-[#3182f6] text-[#3182f6]
                              font-bold text-[13px] flex items-center justify-center gap-1
                              active:scale-[0.98] transition-transform hover:bg-blue-50"
                          >
                            상세보기
                          </button>

                          {/* 지원하기 버튼 — 이미 지원했으면 비활성화 */}
                          {appliedMap[job.id] ? (
                            // 지원 완료 상태 (비활성)
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
                            // 지원하기 버튼 (활성)
                            <button
                              onClick={(e) => handleApply(e, job.id)}
                              disabled={applyingId === job.id}
                              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-[#3182F6] to-[#2563eb]
                                text-white font-bold text-[13px] flex items-center justify-center gap-1
                                shadow-lg shadow-blue-500/25 active:scale-[0.98] transition-transform
                                disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              {applyingId === job.id ? (
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
                shadow-[0_-12px_48px_rgba(0,0,0,0.12)] max-h-[92vh] overflow-y-auto"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
              onClick={e => e.stopPropagation()}
            >
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

                {/* Frame 4: 복리후생 */}
                <div className="rounded-2xl bg-gray-50 p-4 mb-4">
                  <p className="text-[12px] font-bold text-[#8b95a1] mb-2.5">복리후생</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedJob.benefits.map(b => (
                      <span key={b} className="px-3 py-1.5 rounded-xl bg-white border border-gray-100 text-[13px] font-semibold text-[#4e5968] shadow-sm">{b}</span>
                    ))}
                  </div>
                </div>

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
                      <p className="text-center text-[13px] text-gray-400 py-1">원본 공고 링크 없음</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {regionOpen && <div className="fixed inset-0 z-20" onClick={() => setRegionOpen(false)} />}

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
