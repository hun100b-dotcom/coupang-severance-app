import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { User, Headphones, HelpCircle, ChevronRight, Building2, Calendar, Gift, MapPin, Briefcase, BookOpen } from 'lucide-react'
import PageMeta from '../components/PageMeta'
import { api, registerClick } from '../lib/api'
import type { JobPosting } from '../types/supabase'
import { INTRO_COPIES } from '../lib/constants'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
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
    // PageMeta 컴포넌트가 title을 관리하므로 document.title 직접 설정 제거
  }, [])

  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const { notices } = useNotices()
  const [count, setCount] = useState(0)
  const [countLoaded, setCountLoaded] = useState(false)
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

  // 스크롤 감지 → 헤더 글래스모피즘
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])


  // 누적 카운트 조회
  // 1순위: FastAPI 백엔드 /click-count (6초 타임아웃 — Render 콜드스타트 방지)
  // 2순위: Supabase click_counter 테이블 직접 조회 (백엔드 미응답 시 폴백)
  // 3순위: 완전 실패 시 count=0으로라도 로딩 상태 해제
  useEffect(() => {
    const fetchCount = async () => {
      // ── 1단계: 백엔드 API (짧은 타임아웃) ──────────────────────────────
      try {
        const { data } = await api.get<{ total: number }>('/click-count', {
          timeout: 6000, // 6초 안에 응답 없으면 Supabase 폴백으로 전환
        })
        if (typeof data?.total === 'number') {
          setCount(data.total)
          setCountLoaded(true)
          return
        }
      } catch {
        // 백엔드 콜드스타트 중이거나 CORS/네트워크 오류 → Supabase 직접 조회
      }

      // ── 2단계: Supabase click_counter 테이블 직접 조회 (항상 빠름) ──────
      if (supabase) {
        try {
          const { data } = await supabase
            .from('click_counter')
            .select('total')
            .eq('id', 1)
            .single()
          // total 컬럼이 숫자면 표시, 아니면 0으로 표시
          setCount(typeof data?.total === 'number' ? data.total : 0)
        } catch {
          // Supabase도 실패하면 0 유지
        }
      }

      // ── 3단계: 어떤 경우에도 로딩 상태 해제 (스켈레톤이 영원히 보이지 않도록) ──
      setCountLoaded(true)
    }
    fetchCount()
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
      {/* ── SEO 메타태그: 홈 페이지 ── */}
      <PageMeta
        title="쿠팡 일용직 퇴직금·실업급여 계산기 | CATCH — CFS·컬리 무료 자동 계산"
        description="쿠팡·CFS·마켓컬리·CJ대한통운 일용직 퇴직금, 실업급여, 주휴수당, 연차수당 무료 자동 계산기. PDF 업로드 한 번, 3분 안에 내 권리 확인."
        canonical="https://catch-daily-worker.vercel.app/home"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            {
              '@type': 'Question',
              name: '쿠팡 일용직 퇴직금 얼마나 받나요?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: '쿠팡·CFS 일용직 퇴직금 평균 수령액은 약 250만 원입니다. 1년 이상·주 15시간 이상 근무 시 청구 가능하며, CATCH 계산기에서 PDF 업로드 한 번으로 3분 안에 정확한 금액을 확인할 수 있습니다.',
              },
            },
            {
              '@type': 'Question',
              name: 'CATCH 계산기는 쿠팡 외 다른 회사도 되나요?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: '네, 쿠팡·CFS·마켓컬리·CJ대한통운·한진택배 등 일용직 근로자라면 모두 이용 가능합니다. PDF 급여명세서 또는 근무일수·임금 정보만 있으면 계산할 수 있습니다.',
              },
            },
            {
              '@type': 'Question',
              name: 'CATCH 앱은 무료인가요?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: '완전 무료입니다. 퇴직금·실업급여·주휴수당·연차수당 계산 모두 무료이며, 회원가입 없이도 간편계산을 이용할 수 있습니다.',
              },
            },
          ],
        }}
      />

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
            onClick={() => navigate('/inquiry')}
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
            onClick={() => navigate('/landing')}
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

        {/* ── 노동법 가이드 배너 — 검색엔진 유입용 가이드 페이지 진입점 ── */}
        <motion.button
          custom={3}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          type="button"
          onClick={() => navigate('/guide')}
          className="group w-full rounded-[32px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-indigo-200/50 bg-gradient-to-br from-indigo-500 to-purple-600 p-4 flex items-center gap-3 text-left relative overflow-hidden"
          whileHover={{ scale: 1.01, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* 시머 효과 */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer bg-[length:200%_100%] pointer-events-none" />
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base">노동법 가이드</p>
            <p className="text-white/90 text-sm">퇴직금 · 실업급여 · 주휴수당 · 연차수당</p>
          </div>
          <ChevronRight className="w-5 h-5 text-white flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </motion.button>

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

    </div>
  )
}
