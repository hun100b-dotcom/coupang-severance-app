import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { User, Headphones, HelpCircle, ChevronRight, Building2, Calendar, Gift, X, Bell, MapPin, Briefcase } from 'lucide-react'
import { getClickCount, registerClick } from '../lib/api'
import type { JobPosting } from '../types/supabase'
import { INTRO_COPIES } from '../lib/constants'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import WhyCatchModal from '../components/WhyCatchModal'
import CustomerService from '../components/CustomerService'
import NoticesBanner from '../components/NoticesBanner'
import { useNotices } from '../hooks/useNotices'

// ── count-up hook: 0에서 target까지 부드러운 카운트업 ──
function useCountUp(target: number, duration = 1500) {
  const [value, setValue] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (target <= 0 || started.current) return
    started.current = true
    const start = performance.now()
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out-quart
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])

  return value
}

// ── CATCH 브랜드 텍스트 하이라이트 ──
function HighlightCatch({ text }: { text: string }) {
  const parts = text.split(/(CATCH)/g)
  return (
    <>
      {parts.map((part, i) =>
        part === 'CATCH' ? (
          <span key={i} className="text-[#3182F6] font-bold drop-shadow-sm">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ── 카드 입장 애니메이션 설정 ──
const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

export default function Home() {
  // ── SEO: 홈 페이지 탭 제목 설정 — 검색 결과에서 클릭을 유도하는 핵심 타이틀 ──
  useEffect(() => {
    document.title = 'CATCH - 쿠팡 일용직 퇴직금·실업급여 계산기'
  }, [])

  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const { notices } = useNotices()
  const [count, setCount] = useState(0)
  const [countLoaded, setCountLoaded] = useState(false)
  const [whyOpen, setWhyOpen] = useState(false)
  const [csOpen, setCsOpen] = useState(false)
  const [copyIdx, setCopyIdx] = useState(0)
  const [scrolled, setScrolled] = useState(false)
  const animatedCount = useCountUp(count)

  // 채용정보 프리뷰 (is_urgent=true 우선, 최대 3건)
  const [recentJobs, setRecentJobs] = useState<JobPosting[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)   // 로딩 상태 (스켈레톤 표시용)
  const [jobsError, setJobsError] = useState(false)       // 에러 상태 (재시도 버튼 표시용)

  // 채용 프리뷰 로드 함수 (에러 시 재시도 가능하도록 분리)
  const fetchRecentJobs = useCallback(async () => {
    if (!supabase) { setJobsLoading(false); return }
    setJobsLoading(true)
    setJobsError(false)
    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'active')
        .order('is_urgent', { ascending: false })  // 급구 공고 우선
        .order('created_at', { ascending: false })
        .limit(3)
      if (error) throw error
      setRecentJobs((data ?? []) as JobPosting[])
    } catch (err) {
      console.error('[홈 채용 프리뷰 오류]', err)
      setJobsError(true)
    } finally {
      setJobsLoading(false)
    }
  }, [])

  useEffect(() => { fetchRecentJobs() }, [fetchRecentJobs])

  // CMS 공지/팝업 상태
  const [annoText, setAnnoText] = useState('')
  const [annoVisible, setAnnoVisible] = useState(false)
  const [popupText, setPopupText] = useState('')
  const [popupOpen, setPopupOpen] = useState(false)

  // 스크롤 감지 → 헤더 글래스모피즘
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // CMS 공지/팝업 로드
  useEffect(() => {
    if (!supabase) return
    const sb = supabase
    ;(async () => {
      try {
        const { data } = await sb
          .from('system_settings')
          .select('key,value')
          .in('key', ['announcement_text', 'announcement_enabled', 'popup_banner_text', 'popup_banner_enabled'])
        if (!data) return
        const m: Record<string, string> = {}
        data.forEach(r => { m[r.key] = r.value })

        const annoEnabled = m['announcement_enabled'] === 'true'
        const text = m['announcement_text'] ?? ''
        if (annoEnabled && text.trim()) {
          setAnnoText(text)
          setAnnoVisible(true)
        }

        const popupEnabled = m['popup_banner_enabled'] === 'true'
        const pText = m['popup_banner_text'] ?? ''
        // 24시간 만료 체크 (localStorage 기반)
        const dismissedUntil = parseInt(localStorage.getItem('popup_dismissed_until') ?? '0', 10)
        const dismissed = Date.now() < dismissedUntil
        if (popupEnabled && pText.trim() && !dismissed) {
          setPopupText(pText)
          setTimeout(() => setPopupOpen(true), 800)
        }
      } catch { /* 조용히 무시 */ }
    })()
  }, [])

  // 누적 카운트 조회
  useEffect(() => {
    getClickCount()
      .then(d => {
        const total = d?.total
        if (typeof total === 'number') { setCount(total); setCountLoaded(true) }
      })
      .catch(() => {})
  }, [])

  // 7초 간격 카피 슬라이드
  useEffect(() => {
    const timer = setInterval(() => {
      setCopyIdx(i => (i + 1) % INTRO_COPIES.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [])

  const trackAndNavigate = useCallback(async (
    service: 'severance' | 'unemployment' | 'weekly_allowance' | 'annual_leave' | 'benefits',
    path: string
  ) => {
    setCount(c => c + 1)
    try { registerClick(service) } catch { /* 무시 */ }
    navigate(path)
  }, [navigate])

  const handleSeverance    = useCallback(() => trackAndNavigate('severance',       '/severance'),       [trackAndNavigate])
  const handleUnemployment = useCallback(() => trackAndNavigate('unemployment',    '/unemployment'),    [trackAndNavigate])
  const handleWeekly       = useCallback(() => trackAndNavigate('weekly_allowance','/weekly-allowance'),[trackAndNavigate])
  const handleAnnual       = useCallback(() => trackAndNavigate('annual_leave',    '/annual-leave'),    [trackAndNavigate])
  const handleBenefits     = useCallback(() => trackAndNavigate('benefits',        '/my-benefits'),     [trackAndNavigate])

  const mainCopy = INTRO_COPIES[copyIdx]
  const lines = mainCopy.split('\n')

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-4 pb-8">
      {/* ── 글래스모피즘 스티키 헤더 ── */}
      <header
        className={`sticky top-0 z-30 w-full max-w-[460px] grid grid-cols-3 items-center gap-2 py-3 pb-4 transition-all duration-300 ${
          scrolled
            ? 'bg-white/70 backdrop-blur-2xl border-b border-white/40 shadow-[0_1px_3px_rgba(0,0,0,0.04)] rounded-b-2xl -mx-2 px-4'
            : 'bg-transparent'
        }`}
      >
        <div className="col-span-1 flex justify-start min-w-0">
          <button
            type="button"
            onClick={() => setCsOpen(true)}
            className="flex items-center gap-1 text-sm text-[#4E5968] hover:text-[#191F28] font-medium font-sans active:scale-95 transition-transform"
            aria-label="고객센터"
          >
            <Headphones className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">고객센터</span>
          </button>
        </div>
        <div className="col-span-1 flex justify-center min-w-0">
          <button
            type="button"
            onClick={() => setWhyOpen(true)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white/40 backdrop-blur-md border border-white/60 text-[#3182F6] text-xs sm:text-sm font-medium hover:bg-white/50 font-sans active:scale-95 transition-transform"
          >
            <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span className="truncate">왜 CATCH인가요?</span>
          </button>
        </div>
        <div className="col-span-1 flex justify-end items-center gap-2 min-w-0">
          {isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={() => navigate('/mypage')}
                className="flex items-center gap-1 text-sm text-[#4E5968] hover:text-[#191F28] font-medium font-sans active:scale-95 transition-transform"
                aria-label="마이페이지"
              >
                <span className="truncate">마이페이지</span>
                <User className="w-4 h-4 flex-shrink-0" />
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="flex items-center gap-1 text-sm text-[#4E5968] hover:text-[#191F28] font-medium font-sans active:scale-95 transition-transform"
              aria-label="로그인"
            >
              <span className="truncate">로그인</span>
              <User className="w-4 h-4 flex-shrink-0" />
            </button>
          )}
        </div>
      </header>

      {/* ── CMS 긴급 공지 배너 ── */}
      <AnimatePresence>
        {annoVisible && annoText && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-[460px]"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50/90 backdrop-blur-md border border-amber-200/60 shadow-[0_4px_20px_rgba(251,191,36,0.15)]">
              <Bell className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <p className="flex-1 text-xs font-medium text-amber-800 leading-relaxed">{annoText}</p>
              <button onClick={() => setAnnoVisible(false)} className="p-0.5 rounded-full text-amber-400 hover:text-amber-600 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-[460px] flex flex-col gap-4 flex-1">
        {/* ── 공지사항 배너 ── */}
        <NoticesBanner notices={notices} />

        {/* ── 메인 히어로 카드 ── */}
        <motion.div
          custom={0}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-[32px] p-6 bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.06)]"
        >
          <div className="text-center mb-5">
            <motion.div
              className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#3182F6] overflow-hidden mb-3 shadow-lg shadow-blue-500/30"
              whileHover={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.5 }}
            >
              <img src="/catch-logo.png" alt="CATCH" className="w-full h-full object-contain p-1.5" />
            </motion.div>
            <p className="text-xl font-black text-[#1a73e8] tracking-tight mb-1">CATCH</p>
            <p className="text-xs font-semibold text-[#8B95A1] tracking-wide">
              퇴직금 · 실업급여 자동계산
            </p>
          </div>
          <div className="min-h-[4.5rem] flex flex-col justify-center items-center mb-4 overflow-hidden relative">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={copyIdx}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="text-center text-[#191F28] text-[clamp(22px,5.5vw,26px)] font-extrabold leading-[1.3] tracking-tighter font-sans"
              >
                {lines.map((line, i) => (
                  <span key={i}>
                    <HighlightCatch text={line} />
                    {i < lines.length - 1 && <br />}
                  </span>
                ))}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* 누적 카운트 — 카운트업 애니메이션 */}
          <div className="text-center py-3 px-4 rounded-xl bg-blue-50/80">
            {!countLoaded ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-[120px] h-5 rounded-lg bg-gray-200/60 animate-pulse" />
              </div>
            ) : (
              <p className="text-sm text-[#4E5968]">
                지금까지{' '}
                <span className="text-[#3182F6] font-extrabold text-lg num-countup">
                  {animatedCount.toLocaleString()}명
                </span>
                이 확인했어요
              </p>
            )}
          </div>
        </motion.div>

        {/* ── 그린 CTA: 내 주변 단기알바 캐치하기 ── */}
        <motion.button
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          type="button"
          onClick={() => navigate('/jobs')}
          className="group w-full rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-emerald-200/50 bg-gradient-to-br from-[#10b981] to-[#059669] p-4 flex items-center gap-3 text-left relative overflow-hidden"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer bg-[length:200%_100%] pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">내 주변 단기알바 캐치하기</p>
            <p className="text-white/90 text-sm">쿠팡 · CJ · 컬리 실시간 채용</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </motion.button>

        {/* ── 파란 CTA: 내 퇴직금 캐치하기 ── */}
        <motion.button
          custom={1}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          type="button"
          onClick={handleSeverance}
          className="group w-full rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.08)] border border-blue-200/50 bg-gradient-to-br from-[#3182F6] to-[#2563eb] p-4 flex items-center gap-3 text-left relative overflow-hidden"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* 시머 오버레이 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer bg-[length:200%_100%] pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src="/catch-logo.png" alt="" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">내 퇴직금 캐치하기</p>
            <p className="text-white/90 text-sm">가장 많이 찾는 서비스</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </motion.button>

        {/* ── 오늘의 채용정보 프리뷰 ── */}
        {/* 로딩 중 / 에러 / 공고 있을 때만 카드 표시 */}
        {(jobsLoading || jobsError || recentJobs.length > 0) && (
          <motion.div
            custom={2}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-[32px] p-5 bg-white/50 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.05)]"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[15px] font-extrabold text-[#191f28]">오늘의 채용정보</p>
              <button onClick={() => navigate('/jobs')}
                className="flex items-center gap-0.5 text-[13px] font-semibold text-[#3182f6] hover:underline">
                더 보기 <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 로딩 스켈레톤 */}
            {jobsLoading && (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/60 border border-white/40">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <div className="h-3.5 w-28 rounded-lg bg-gray-200/70 animate-pulse" />
                      <div className="h-3 w-20 rounded-lg bg-gray-200/50 animate-pulse" />
                    </div>
                    <div className="h-5 w-16 rounded-lg bg-gray-200/60 animate-pulse shrink-0" />
                  </div>
                ))}
              </div>
            )}

            {/* 에러 상태 — 재시도 버튼 표시 */}
            {!jobsLoading && jobsError && (
              <div className="flex flex-col items-center gap-2 py-4">
                <p className="text-[13px] text-[#8b95a1]">공고를 불러오지 못했어요</p>
                <button
                  onClick={fetchRecentJobs}
                  className="text-[12px] font-semibold text-[#3182f6] hover:underline"
                >
                  다시 시도
                </button>
              </div>
            )}

            {/* 공고 카드 목록 */}
            {!jobsLoading && !jobsError && (
              <div className="flex flex-col gap-2">
                {recentJobs.map(job => (
                  <button key={job.id} onClick={() => navigate('/jobs')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/60 border border-white/40
                      hover:bg-white/80 active:scale-[0.98] transition-all text-left">
                    <div className="flex-1 min-w-0">
                      {/* 회사명 + 급구 뱃지 */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] font-bold text-[#191f28] truncate">{job.company_name}</span>
                        {job.is_urgent && (
                          <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 text-[10px] font-bold shrink-0">급구</span>
                        )}
                      </div>
                      {/* 센터명 */}
                      {job.center_name && (
                        <p className="text-[11px] text-[#8b95a1] truncate">{job.center_name}</p>
                      )}
                      {/* 지역 + 근무시간 */}
                      <div className="flex items-center gap-2 mt-0.5 text-[12px] text-[#8b95a1]">
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" />{job.region}</span>
                        {job.work_hours && <span>{job.work_hours}</span>}
                      </div>
                    </div>
                    {/* 일급이 있으면 일급 표시, 없으면 시급 표시 */}
                    <div className="text-right shrink-0">
                      {job.daily_wage > 0 ? (
                        <>
                          <p className="text-[10px] text-[#8b95a1] leading-tight">일급</p>
                          <p className="text-[15px] font-black text-[#3182f6] leading-tight">
                            {job.daily_wage.toLocaleString('ko-KR')}원
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-[10px] text-[#8b95a1] leading-tight">시급</p>
                          <p className="text-[15px] font-black text-[#3182f6] leading-tight">
                            {job.hourly_wage.toLocaleString('ko-KR')}원
                          </p>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── 서브 카드 4개 그리드 ── */}
        <motion.div
          custom={2}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-3"
        >
          {[
            { label: '실업급여', sub: '수급 자격 확인', icon: Building2, color: 'text-slate-500', bg: 'bg-slate-100', onClick: handleUnemployment },
            { label: '주휴수당', sub: '이번 주 얼마일까?', icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50', onClick: handleWeekly },
            { label: '연차수당', sub: '남은 연차 정산', icon: Calendar, color: 'text-amber-500', bg: 'bg-amber-50', onClick: handleAnnual },
            { label: '나의 혜택', sub: '숨은 지원금 찾기', icon: Gift, color: 'text-violet-500', bg: 'bg-violet-50', onClick: handleBenefits },
          ].map((card, i) => (
            <motion.button
              key={card.label}
              type="button"
              onClick={card.onClick}
              className="rounded-[32px] p-4 flex flex-col items-start text-left bg-white/50 backdrop-blur-md border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.05)]"
              whileHover={{ y: -3, boxShadow: '0 16px 48px rgba(49,130,246,0.12)' }}
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.24 + i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-2`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="font-semibold text-[#191F28] text-sm">{card.label}</p>
              <p className="text-xs text-[#8B95A1] mt-0.5">{card.sub}</p>
            </motion.button>
          ))}
        </motion.div>

        {/* ── 하단 트러스트 바 ── */}
        <motion.div
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-[32px] px-4 py-3 flex items-center justify-around gap-2 bg-white/40 backdrop-blur-lg border border-white/50 shadow-[0_8px_32px_rgba(49,130,246,0.04)]"
        >
          {[
            { emoji: '⚡', title: '1분 만에', sub: '간단 계산' },
            { emoji: '🔒', title: '안전하게', sub: '개인정보 보호' },
            { emoji: '📄', title: 'PDF 파일', sub: '정밀 분석' },
          ].map((item, i) => (
            <div key={item.title} className="flex items-center gap-2 min-w-0">
              {i > 0 && <div className="w-px h-8 bg-white/60 mr-2" />}
              <span className="text-xl">{item.emoji}</span>
              <div>
                <p className="text-xs font-semibold text-[#191F28] leading-tight">{item.title}</p>
                <p className="text-[10px] text-[#8B95A1] leading-tight">{item.sub}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ── 푸터 ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-[10px] font-light text-gray-400 leading-relaxed mt-2"
        >
          © 2026 CATCH by LEAF-MASTER. All rights reserved.
          <br />
          <span className="text-[9px]">이 결과는 참고용이에요. 정확한 금액은 노무사 상담을 받으세요.</span>
        </motion.p>
      </div>

      <AnimatePresence>
        {whyOpen && <WhyCatchModal onClose={() => setWhyOpen(false)} />}
      </AnimatePresence>
      <CustomerService isOpen={csOpen} onClose={() => setCsOpen(false)} />

      {/* ── CMS 팝업 배너 ── */}
      <AnimatePresence>
        {popupOpen && popupText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={() => {
              setPopupOpen(false)
              localStorage.setItem('popup_dismissed_until', String(Date.now() + 86400000))
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-[400px] rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/80 shadow-[0_24px_80px_rgba(49,130,246,0.18)] p-6 relative"
            >
              {/* 닫기 버튼 */}
              <button
                onClick={() => { setPopupOpen(false); localStorage.setItem('popup_dismissed_until', String(Date.now() + 86400000)) }}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>

              {/* 아이콘 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-[#191F28] text-sm">공지사항</p>
                  <p className="text-xs text-[#8B95A1]">CATCH 서비스 안내</p>
                </div>
              </div>

              {/* 내용 */}
              <p className="text-sm text-[#3C4858] leading-relaxed mb-5 whitespace-pre-wrap">{popupText}</p>

              {/* 버튼 */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setPopupOpen(false); localStorage.setItem('popup_dismissed_until', String(Date.now() + 86400000)) }}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  오늘 하루 보지 않기
                </button>
                <button
                  onClick={() => { setPopupOpen(false); localStorage.setItem('popup_dismissed_until', String(Date.now() + 86400000)) }}
                  className="flex-1 py-2.5 rounded-xl bg-[#3182F6] text-white text-sm font-bold hover:bg-blue-600 transition-colors"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
