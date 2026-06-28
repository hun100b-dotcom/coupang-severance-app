import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight, ArrowRight, MapPin, Clock, Briefcase, BookOpen,
  Building2, CalendarDays, Gift, Zap, ShieldCheck, FileText, Sparkles,
} from 'lucide-react'
import PageMeta from '../components/PageMeta'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import Container from '../components/ui/Container'
import Card, { CardButton } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import SectionHeader from '../components/ui/SectionHeader'
import { api, registerClick } from '../lib/api'
import { getCompanyLogoUrl } from '../lib/jobUtils'
import type { JobPosting } from '../types/supabase'
import { INTRO_COPIES } from '../lib/constants'
import { supabase } from '../lib/supabase'
import NoticesBanner from '../components/NoticesBanner'
import { useNotices } from '../hooks/useNotices'
import { consumePendingSaveDone } from '../lib/pendingSave'

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
      const eased = 1 - Math.pow(1 - progress, 4) // ease-out-quart
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
          <span key={i} className="text-brand font-black">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ── 카드 입장 애니메이션 ──
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
}

export default function Home() {
  const navigate = useNavigate()
  const { notices } = useNotices()
  const [count, setCount] = useState(0)
  const [countLoaded, setCountLoaded] = useState(false)
  const [copyIdx, setCopyIdx] = useState(0)
  const animatedCount = useCountUp(count)

  // 로그인 후 게스트 계산 결과 자동 저장 완료 알림
  const [autoSaved, setAutoSaved] = useState(false)
  useEffect(() => {
    if (consumePendingSaveDone()) {
      setAutoSaved(true)
      const timer = setTimeout(() => setAutoSaved(false), 4000)
      return () => clearTimeout(timer)
    }
  }, [])

  // 채용정보 프리뷰 (긴급 우선, 최대 3건)
  const [recentJobs, setRecentJobs] = useState<JobPosting[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsError, setJobsError] = useState(false)

  const fetchRecentJobs = useCallback(async () => {
    if (!supabase) { setJobsLoading(false); return }
    setJobsLoading(true)
    setJobsError(false)
    try {
      const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' })
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'active')
        .or(`expires_at.gte.${todayStr},expires_at.is.null`)
        .order('is_urgent', { ascending: false })
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

  // 누적 카운트 조회 (백엔드 → Supabase 폴백 → 0)
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data } = await api.get<{ total: number }>('/click-count', { timeout: 6000 })
        if (typeof data?.total === 'number') {
          setCount(data.total)
          setCountLoaded(true)
          return
        }
      } catch { /* 폴백으로 전환 */ }

      if (supabase) {
        try {
          const { data } = await supabase.from('click_counter').select('total').eq('id', 1).single()
          setCount(typeof data?.total === 'number' ? data.total : 0)
        } catch { /* 0 유지 */ }
      }
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

  // 계산기 서브 카드 4종 (색 규칙: 블루 메인 — 전부 brand 톤으로 통일, 무지개 제거)
  const calcCards = [
    { label: '실업급여', sub: '수급 자격 확인',    icon: Building2,    onClick: handleUnemployment },
    { label: '주휴수당', sub: '이번 주 얼마일까?', icon: CalendarDays, onClick: handleWeekly },
    { label: '연차수당', sub: '남은 연차 정산',    icon: CalendarDays, onClick: handleAnnual },
    { label: '나의 혜택', sub: '숨은 지원금 찾기', icon: Gift,         onClick: handleBenefits },
  ]

  return (
    <>
      <TopNav />

      {/* AnimatedBackground(z-0) 위에 콘텐츠 — relative z-[1] 필수 */}
      <main className="relative z-[1] min-h-screen pt-14 pb-[96px] md:pb-12">

        {/* ── SEO 메타 ── */}
        <PageMeta
          title="쿠팡 일용직 퇴직금·실업급여 계산기 | CATCH — CFS·컬리 무료 자동 계산"
          description="쿠팡·CFS·마켓컬리·CJ대한통운 일용직 퇴직금, 실업급여, 주휴수당, 연차수당 무료 자동 계산기. PDF 업로드 한 번, 3분 안에 내 권리 확인."
          canonical="https://catch-daily-worker.vercel.app/"
          noIndex={true}
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

        {/* ── 자동 저장 완료 알림 배너 ── */}
        <AnimatePresence>
          {autoSaved && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-32px)] max-w-sm"
            >
              <div className="flex items-center gap-3 bg-accent text-white px-4 py-3 rounded-lg shadow-float">
                <span className="text-lg">✅</span>
                <div>
                  <p className="text-sm font-bold">계산결과가 저장됐어요!</p>
                  <p className="text-xs opacity-80">마이페이지에서 언제든지 다시 확인할 수 있어요</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Container className="flex flex-col gap-6 md:gap-8 pt-4">

          {/* ── 공지사항 배너 ── */}
          <NoticesBanner notices={notices} />

          {/* ════════════ 히어로 ════════════ */}
          {/* 데스크톱: 좌(카피+CTA) · 우(플로팅 결과 카드) 2단 / 모바일: 세로 스택 */}
          <motion.section
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-b from-brand-bg to-white shadow-card p-6 md:p-8"
          >
            <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">

              {/* 좌: 카피 + CTA */}
              <div className="flex flex-col items-start">
                <Badge tone="brand" className="mb-4">
                  <Sparkles className="w-3 h-3" /> 일용직 권리 찾기
                </Badge>

                {/* 7초 로테이션 헤드라인 */}
                <div className="min-h-[5.5rem] md:min-h-[6.5rem] w-full overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.h1
                      key={copyIdx}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      className="text-ink-900 text-[clamp(24px,5.5vw,34px)] font-extrabold leading-[1.28] tracking-tight break-keep text-balance"
                    >
                      {lines.map((line, i) => (
                        <span key={i}>
                          <HighlightCatch text={line} />
                          {i < lines.length - 1 && <br />}
                        </span>
                      ))}
                    </motion.h1>
                  </AnimatePresence>
                </div>

                <p className="text-ink-700 text-[14px] md:text-[15px] leading-relaxed mt-3 mb-6 break-keep">
                  퇴직금 · 실업급여 · 주휴 · 연차수당, PDF 한 번으로 3분 만에.
                </p>

                {/* CTA 2개 — 블루(퇴직금) · 그린(채용)
                    lg:flex-row — md(768) 구간은 좌측 컬럼이 좁아지므로 세로 스택 유지, lg부터 가로 배치 */}
                <div className="flex flex-col lg:flex-row gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleSeverance}
                    className="group flex-1 inline-flex items-center justify-center gap-2 min-h-[54px] rounded-lg font-bold text-white text-[16px] whitespace-nowrap
                      bg-gradient-to-br from-brand to-brand-strong shadow-[0_8px_20px_rgba(49,130,246,0.28)]
                      transition-all active:scale-[0.97] hover:shadow-[0_10px_26px_rgba(49,130,246,0.36)]"
                  >
                    <FileText className="w-5 h-5 flex-shrink-0" />
                    내 퇴직금 캐치하기
                    <ArrowRight className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/jobs')}
                    className="group flex-1 inline-flex items-center justify-center gap-2 min-h-[54px] rounded-lg font-bold text-white text-[16px] whitespace-nowrap
                      bg-gradient-to-br from-accent to-accent-strong shadow-[0_8px_20px_rgba(6,190,123,0.26)]
                      transition-all active:scale-[0.97] hover:shadow-[0_10px_26px_rgba(6,190,123,0.34)]"
                  >
                    <Briefcase className="w-5 h-5 flex-shrink-0" />
                    단기알바 캐치하기
                  </button>
                </div>

                {/* "왜 CATCH인가요?" 보조 링크 */}
                <button
                  type="button"
                  onClick={() => navigate('/landing')}
                  className="mt-1 min-h-[44px] -ml-2 px-2 text-[13px] font-semibold text-ink-600 hover:text-brand transition-colors inline-flex items-center gap-1"
                >
                  왜 CATCH인가요? <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 우: 플로팅 결과 미리보기 카드 (B 비주얼 — 깊이감) */}
              <div className="w-full">
                <Card variant="float" padding="lg" className="relative overflow-hidden">
                  {/* 로고 헤더 */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-md bg-brand flex items-center justify-center overflow-hidden shadow-[0_4px_12px_rgba(49,130,246,0.35)]">
                      <img src="/catch-logo.png" alt="CATCH" className="w-full h-full object-contain p-1.5" />
                    </div>
                    <div>
                      <p className="text-[15px] font-black text-brand-strong leading-tight">CATCH</p>
                      <p className="text-[11px] font-semibold text-ink-600">퇴직금 · 실업급여 자동계산</p>
                    </div>
                  </div>

                  {/* 예상 평균 퇴직금 (티저) */}
                  <div className="rounded-lg bg-brand-bg px-4 py-4 mb-3">
                    <p className="text-[12px] font-semibold text-ink-700 mb-1">쿠팡·CFS 일용직 평균 퇴직금</p>
                    <p className="flex items-baseline gap-1">
                      <span className="text-[30px] md:text-[34px] font-black text-brand-strong tracking-tight num-countup">약 250</span>
                      <span className="text-[16px] font-bold text-brand-strong">만원</span>
                    </p>
                  </div>

                  {/* 누적 카운트 */}
                  <div className="rounded-lg bg-[#F7F9FC] px-4 py-3 flex items-center justify-between">
                    {!countLoaded ? (
                      <div className="w-[140px] h-5 rounded-md bg-line animate-pulse" />
                    ) : (
                      <p className="text-[13px] text-ink-700">
                        지금까지{' '}
                        <span className="text-brand font-extrabold num-countup">{animatedCount.toLocaleString()}명</span>
                        이 확인했어요
                      </p>
                    )}
                    <button
                      onClick={handleSeverance}
                      className="flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 rounded-md text-brand hover:text-brand-strong hover:bg-brand-bg transition-colors flex-shrink-0"
                      aria-label="퇴직금 계산하러 가기"
                    >
                      <ArrowRight className="w-5 h-5" />
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          </motion.section>

          {/* ════════════ 통계 스트립 ════════════ */}
          <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible">
            <Card padding="none" className="px-2 py-3 md:px-4">
              <div className="grid grid-cols-3 divide-x divide-line">
                {[
                  { icon: Zap,        title: '1분 계산',   sub: '간단 입력' },
                  { icon: ShieldCheck, title: '안전 보관',  sub: '개인정보 보호' },
                  { icon: FileText,    title: 'PDF 분석',   sub: '정밀 계산' },
                ].map(item => (
                  <div key={item.title} className="flex flex-col items-center justify-center gap-1 px-2 py-1 text-center">
                    <item.icon className="w-5 h-5 text-brand" strokeWidth={1.8} />
                    <p className="text-[13px] font-bold text-ink-900 leading-tight">{item.title}</p>
                    <p className="text-[11px] text-ink-600 leading-tight">{item.sub}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* ════════════ 오늘의 채용정보 ════════════ */}
          {/* 섹션은 상시 렌더 — 내부에서 로딩/에러/빈상태/목록 4상태를 모두 처리(빈 상태 도달 가능) */}
          <motion.section custom={2} variants={fadeUp} initial="hidden" animate="visible">
              <SectionHeader
                title="오늘의 채용정보"
                tone="accent"
                action={
                  <button
                    onClick={() => navigate('/jobs')}
                    className="inline-flex items-center gap-0.5 min-h-[44px] px-2 -mr-2 text-[13px] font-semibold text-accent-strong hover:underline"
                  >
                    더 보기 <ChevronRight className="w-4 h-4" />
                  </button>
                }
              />

              {/* 로딩 스켈레톤 */}
              {jobsLoading && (
                <div className="grid md:grid-cols-3 gap-3">
                  {[1, 2, 3].map(i => (
                    <Card key={i} padding="sm" className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-md bg-line animate-pulse shrink-0" />
                      <div className="flex-1 flex flex-col gap-1.5">
                        <div className="h-3.5 w-28 rounded bg-line animate-pulse" />
                        <div className="h-3 w-20 rounded bg-line/70 animate-pulse" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* 에러 — 재시도 */}
              {!jobsLoading && jobsError && (
                <Card padding="lg" className="flex flex-col items-center gap-2">
                  <p className="text-[13px] text-ink-600">공고를 불러오지 못했어요</p>
                  <button onClick={fetchRecentJobs} className="text-[13px] font-semibold text-brand hover:underline min-h-[44px] px-3">
                    다시 시도
                  </button>
                </Card>
              )}

              {/* 빈 상태 — 공고 없음 (로딩/에러 아님 + 0건) */}
              {!jobsLoading && !jobsError && recentJobs.length === 0 && (
                <Card padding="lg" className="flex flex-col items-center gap-1 text-center">
                  <Briefcase className="w-7 h-7 text-ink-400 mb-1" strokeWidth={1.6} />
                  <p className="text-[14px] font-semibold text-ink-700">아직 등록된 공고가 없어요</p>
                  <p className="text-[12px] text-ink-600">새 채용공고가 올라오면 가장 먼저 알려드릴게요</p>
                </Card>
              )}

              {/* 공고 카드 — 데스크톱 3열 / 모바일 1열 */}
              {!jobsLoading && !jobsError && recentJobs.length > 0 && (
                <div className="grid md:grid-cols-3 gap-3 items-stretch">
                  {recentJobs.map(job => {
                    // 섹션 뱃지 (section 우선, is_urgent 폴백)
                    const sectionBadge = job.section === 'today-urgent'
                      ? { text: '오늘긴급', tone: 'danger' as const }
                      : job.section === 'tomorrow-urgent'
                        ? { text: '내일긴급', tone: 'warning' as const }
                        : job.is_urgent
                          ? { text: '급구', tone: 'danger' as const }
                          : null

                    const benefits: string[] = Array.isArray(job.benefits) ? job.benefits.slice(0, 2) : []

                    // D-day 계산
                    let dDay: string | null = null
                    if (job.expires_at) {
                      const today = new Date(); today.setHours(0, 0, 0, 0)
                      const exp = new Date(job.expires_at); exp.setHours(0, 0, 0, 0)
                      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                      if (diff === 0) dDay = 'D-Day'
                      else if (diff > 0) dDay = `D-${diff}`
                    }

                    const logoUrl = getCompanyLogoUrl(job.company_name)

                    return (
                      <CardButton
                        key={job.id}
                        padding="sm"
                        onClick={() => navigate(`/jobs?focus=${job.id}`)}
                        className="flex items-start gap-3 h-full min-w-0"
                      >
                        {/* 회사 로고 */}
                        <div className="w-9 h-9 rounded-md bg-[#F2F4F6] flex items-center justify-center overflow-hidden shrink-0">
                          {logoUrl !== '/logos/default.svg' ? (
                            <img src={logoUrl} alt={job.company_name} className="w-6 h-6 object-contain" />
                          ) : (
                            <span className="text-[14px] font-bold text-ink-600">{job.company_name.charAt(0)}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* 1행: 회사명 + 뱃지 / 임금 */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                              <span className="text-[14px] font-bold text-ink-900 truncate max-w-full">{job.company_name}</span>
                              {sectionBadge && <Badge tone={sectionBadge.tone}>{sectionBadge.text}</Badge>}
                              {dDay && <Badge tone="neutral">{dDay}</Badge>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-[10px] text-ink-600 leading-tight">{job.daily_wage > 0 ? '일급' : '시급'}</p>
                              <p className="text-[14px] font-black text-brand leading-tight tabular-nums">
                                {(job.daily_wage > 0 ? job.daily_wage : job.hourly_wage).toLocaleString('ko-KR')}원
                              </p>
                            </div>
                          </div>

                          {job.center_name && (
                            <p className="text-[11px] text-ink-600 truncate mt-0.5">{job.center_name}</p>
                          )}

                          {/* 지역 / 근무시간 */}
                          <div className="mt-1 flex flex-col gap-0.5">
                            {job.region && (
                              <div className="flex items-center gap-1 text-[12px] text-ink-600" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{job.region}</span>
                              </div>
                            )}
                            {job.work_hours && (
                              <div className="flex items-center gap-1 text-[12px] text-ink-600" style={{ wordBreak: 'keep-all', overflowWrap: 'break-word' }}>
                                <Clock className="w-3 h-3 shrink-0" />
                                <span className="truncate">{job.work_hours}</span>
                              </div>
                            )}
                          </div>

                          {/* 혜택 칩 (최대 2개) */}
                          {benefits.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {benefits.map(b => (
                                <span key={b} className="px-1.5 py-0.5 rounded-sm bg-brand-bg text-brand-strong text-[10px] font-semibold">
                                  {b}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardButton>
                    )
                  })}
                </div>
              )}
          </motion.section>

          {/* ════════════ 계산기 ════════════ */}
          <motion.section custom={3} variants={fadeUp} initial="hidden" animate="visible">
            <SectionHeader title="계산기" subtitle="내 권리, 항목별로 빠르게 확인" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
              {calcCards.map(card => (
                <CardButton
                  key={card.label}
                  padding="md"
                  onClick={card.onClick}
                  className="flex flex-col items-start h-full"
                >
                  <div className="w-11 h-11 rounded-md bg-brand-bg flex items-center justify-center mb-3">
                    <card.icon className="w-5 h-5 text-brand" strokeWidth={1.9} />
                  </div>
                  <p className="font-bold text-ink-900 text-[15px]">{card.label}</p>
                  <p className="text-[12px] text-ink-600 mt-0.5">{card.sub}</p>
                </CardButton>
              ))}
            </div>
          </motion.section>

          {/* ════════════ 노동법 가이드 ════════════ */}
          <motion.button
            custom={4}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            type="button"
            onClick={() => navigate('/guide')}
            className="group w-full rounded-xl border border-brand-700 bg-gradient-to-br from-brand-strong to-brand-700 p-6 flex items-center gap-4 text-left shadow-[0_8px_24px_rgba(27,100,218,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(27,100,218,0.32)] active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-md bg-white/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-[16px]">노동법 가이드</p>
              <p className="text-white/90 text-[13px] break-keep">퇴직금 · 실업급여 · 주휴수당 · 연차수당</p>
            </div>
            <ChevronRight className="w-5 h-5 text-white flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </motion.button>

          {/* ── 푸터 ── */}
          <p className="text-center text-[11px] font-normal text-ink-600 leading-relaxed mt-1">
            © 2026 CATCH. All rights reserved.
            <br />
            <span className="text-[10px]">이 결과는 참고용이에요. 정확한 금액은 노무사 상담을 받으세요.</span>
          </p>
        </Container>
      </main>

      {/* 모바일 하단 탭 (데스크톱은 TopNav가 대체) */}
      <BottomNav />
    </>
  )
}
