import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ChevronRight, ArrowRight, MapPin, Clock, Briefcase, BookOpen,
  Building2, CalendarDays, Gift, FileText, Megaphone, Sparkles, Palmtree, Banknote,
} from 'lucide-react'
import PageMeta from '../components/PageMeta'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import Container from '../components/ui/Container'
import { api, registerClick } from '../lib/api'
import { getCompanyLogoUrl } from '../lib/jobUtils'
import type { JobPosting } from '../types/supabase'
import { INTRO_COPIES } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { useNotices } from '../hooks/useNotices'
import { consumePendingSaveDone } from '../lib/pendingSave'

// ─────────────────────────────────────────────────────────────
// 🎨 업비트풍 시안 전용 로컬 색 토큰 (이번 시안 범위에서만 인라인 사용)
//    전역 tailwind 토큰은 건드리지 않음 → 되돌리기 쉽도록 Home 내부에만 둠.
//    값 출처: 2026-06-30 upbit.com 라이브 getComputedStyle 실측 (docs/design/upbit_direction.md)
// ─────────────────────────────────────────────────────────────
const UP = {
  page:    '#EEF1F5', // 페이지 배경(옅은 청회색) — 업비트 #E9ECF1보다 살짝 밝게
  navy:    '#1A2434', // 헤딩/짙은 잉크(남색) — 업비트 실측
  ink:     '#4E5968', // 본문 보조
  sub:     '#8B95A1', // 캡션
  hair:    '#E1E4EA', // 헤어라인 보더
  head:    '#F4F6F9', // 데이터 헤더/표 배경
  brand:   '#3182F6', // 포인트 블루
  strong:  '#1B64DA', // 주 CTA(업비트 #0062DF와 근접)
  danger:  '#F04452', // 긴급/위험 전용(빨강) — 업비트의 '상승 빨강'을 의미 전환해 보존
  card:    '#FFFFFF',
}

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
          <span key={i} style={{ color: UP.brand }} className="font-black">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ── 섹션 입장 애니메이션 ──
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
}

// ── 표/패널 공통 헤더(업비트 시세표 헤더 차용: 남색 제목 + 우측 '더보기') ──
function PanelHeader({ title, onMore, moreLabel = '더 보기' }: { title: string; onMore?: () => void; moreLabel?: string }) {
  return (
    <div className="flex items-center justify-between px-4 h-11 border-b" style={{ borderColor: UP.hair }}>
      <h2 className="text-[15px] font-extrabold tracking-tight" style={{ color: UP.navy }}>{title}</h2>
      {onMore && (
        <button
          onClick={onMore}
          className="inline-flex items-center gap-0.5 text-[12px] font-semibold hover:underline"
          style={{ color: UP.ink }}
        >
          {moreLabel} <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
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

  // 채용정보 프리뷰 (긴급 우선, 최대 4건)
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
        .limit(4)
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

  // ── 계산기 5종: 업비트 시세표처럼 '행(row)' 으로 촘촘하게 나열 ──
  //    좌(아이콘+제목+부제) / 우(대표 수치 라벨 + 화살표)
  const calcRows = [
    { label: '퇴직금',   sub: 'PDF 한 번이면 정밀 계산',  icon: Banknote,     fig: '평균 약 250만원', onClick: handleSeverance,    primary: true },
    { label: '실업급여', sub: '일용직 수급 자격 확인',     icon: Building2,    fig: '일 상한 68,100원', onClick: handleUnemployment },
    { label: '주휴수당', sub: '이번 주 받을 수당',         icon: CalendarDays, fig: '주 15시간~',       onClick: handleWeekly },
    { label: '연차수당', sub: '남은 연차 정산',            icon: Palmtree,     fig: '미사용분 환산',     onClick: handleAnnual },
    { label: '나의 혜택', sub: '숨은 지원금 찾기',          icon: Gift,         fig: '맞춤 추천',         onClick: handleBenefits },
  ]

  // ── 지표 스트립 값(업비트 종합지수 띠 차용) ──
  const indexItems = [
    { label: '쿠팡·CFS 평균 퇴직금', value: '약 250만원' },
    { label: '실업급여 일 상한',     value: '68,100원' },
    { label: '2026 최저시급',        value: '10,320원' },
    { label: '누적 확인',            value: countLoaded ? `${animatedCount.toLocaleString()}명` : '…' },
  ]

  return (
    <>
      <TopNav />

      {/* 업비트풍: 페이지 배경을 옅은 청회색으로(시안 범위 한정 인라인) — relative z-[1] 필수 */}
      <main className="relative z-[1] min-h-screen pt-14 pb-[96px] md:pb-12" style={{ background: UP.page }}>

        {/* ── SEO 메타 (원본 보존) ── */}
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

        {/* ── 자동 저장 완료 알림 배너 (원본 보존) ── */}
        <AnimatePresence>
          {autoSaved && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="fixed top-16 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-32px)] max-w-sm"
            >
              <div className="flex items-center gap-3 text-white px-4 py-3 rounded-lg shadow-lg" style={{ background: UP.strong }}>
                <span className="text-lg">✅</span>
                <div>
                  <p className="text-sm font-bold">계산결과가 저장됐어요!</p>
                  <p className="text-xs opacity-80">마이페이지에서 언제든지 다시 확인할 수 있어요</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ════════════ 지표 스트립 (업비트 종합지수 띠 차용) ════════════ */}
        {/* 흰 배경 + 헤어라인 + 구분선으로 핵심 숫자 4개를 한 줄에 압축. 모바일은 2×2 */}
        <div className="border-b" style={{ background: UP.card, borderColor: UP.hair }}>
          <Container className="!px-0">
            <div className="grid grid-cols-2 md:grid-cols-4">
              {indexItems.map((it, i) => (
                <div
                  key={it.label}
                  className="flex items-center justify-between gap-2 px-4 md:px-5 py-2.5 border-b md:border-b-0 md:border-r last:border-r-0"
                  style={{ borderColor: UP.hair, ...(i >= 2 ? { borderBottomWidth: 0 } : {}) }}
                >
                  <span className="text-[12px] font-medium truncate" style={{ color: UP.sub }}>{it.label}</span>
                  <span className="text-[13px] font-bold font-mono tabular-nums whitespace-nowrap" style={{ color: UP.navy }}>
                    {it.value}
                  </span>
                </div>
              ))}
            </div>
          </Container>
        </div>

        <Container className="flex flex-col gap-5 md:gap-6 pt-5 md:pt-6">

          {/* ════════════ 히어로 (업비트: 평평한 면 + 큰 타이포 + 데이터 패널) ════════════ */}
          <motion.section
            custom={0}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5"
          >
            {/* 좌: 카피 + CTA (흰 패널, 얇은 보더, radius 8px) */}
            <div
              className="rounded-lg p-6 md:p-7 flex flex-col"
              style={{ background: UP.card, border: `1px solid ${UP.hair}` }}
            >
              <span
                className="inline-flex items-center gap-1 self-start px-2 py-1 rounded text-[11px] font-bold mb-4"
                style={{ background: '#EAF2FE', color: UP.strong }}
              >
                <Sparkles className="w-3 h-3" /> 일용직 권리 찾기
              </span>

              {/* 7초 로테이션 헤드라인 */}
              <div className="min-h-[5.4rem] md:min-h-[6rem] w-full overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.h1
                    key={copyIdx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="text-[clamp(23px,5vw,32px)] font-extrabold leading-[1.3] tracking-tight break-keep"
                    style={{ color: UP.navy }}
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

              <p className="text-[14px] leading-relaxed mt-2 mb-6 break-keep" style={{ color: UP.ink }}>
                퇴직금 · 실업급여 · 주휴 · 연차수당, PDF 한 번으로 3분 만에.
              </p>

              {/* CTA 2개 — 업비트 버튼 톤(작은 radius 8px, 평평) */}
              <div className="flex flex-col sm:flex-row gap-2.5 w-full mt-auto">
                <button
                  type="button"
                  onClick={handleSeverance}
                  className="group flex-1 inline-flex items-center justify-center gap-2 min-h-[52px] rounded-lg font-bold text-white text-[15px] whitespace-nowrap transition-all active:scale-[0.98]"
                  style={{ background: UP.strong }}
                >
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  내 퇴직금 캐치하기
                  <ArrowRight className="w-4 h-4 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/jobs')}
                  className="group flex-1 inline-flex items-center justify-center gap-2 min-h-[52px] rounded-lg font-bold text-[15px] whitespace-nowrap transition-all active:scale-[0.98]"
                  style={{ background: '#EDEEF1', color: UP.navy }}
                >
                  <Briefcase className="w-5 h-5 flex-shrink-0" />
                  단기알바 캐치하기
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate('/landing')}
                className="mt-3 min-h-[40px] -ml-1 self-start px-1 text-[13px] font-semibold inline-flex items-center gap-1 transition-colors"
                style={{ color: UP.sub }}
              >
                왜 CATCH인가요? <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 우: 내 권리 요약 데이터 패널 (업비트 시세 카드 차용 — tabular 숫자) */}
            <div
              className="rounded-lg overflow-hidden flex flex-col"
              style={{ background: UP.card, border: `1px solid ${UP.hair}` }}
            >
              <div className="flex items-center gap-2.5 px-5 h-14 border-b" style={{ borderColor: UP.hair }}>
                <div className="w-9 h-9 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: UP.brand }}>
                  <img src="/catch-logo.png" alt="CATCH" className="w-full h-full object-contain p-1.5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-black leading-tight" style={{ color: UP.strong }}>내 권리 요약</p>
                  <p className="text-[11px] font-semibold" style={{ color: UP.sub }}>일용직 4대 수당 자동계산</p>
                </div>
              </div>

              {/* 대표 수치(퇴직금) — 업비트 '현재가' 강조 차용. 단, 색은 브랜드 블루(빨강 금지) */}
              <div className="px-5 py-4 border-b" style={{ borderColor: UP.hair, background: UP.head }}>
                <p className="text-[12px] font-semibold mb-1" style={{ color: UP.ink }}>쿠팡·CFS 일용직 평균 퇴직금</p>
                <p className="flex items-baseline gap-1">
                  <span className="text-[32px] md:text-[36px] font-black font-mono tabular-nums tracking-tight" style={{ color: UP.strong }}>250</span>
                  <span className="text-[16px] font-bold" style={{ color: UP.strong }}>만원</span>
                  <span className="ml-1.5 text-[12px] font-bold" style={{ color: UP.danger }}>예상</span>
                </p>
              </div>

              {/* 미니 지표 행 2개 */}
              <div className="divide-y" style={{ borderColor: UP.hair }}>
                {[
                  { k: '실업급여 일 상한', v: '68,100원' },
                  { k: '2026 최저시급',   v: '10,320원' },
                ].map(row => (
                  <div key={row.k} className="flex items-center justify-between px-5 py-2.5" style={{ borderColor: UP.hair }}>
                    <span className="text-[12px]" style={{ color: UP.ink }}>{row.k}</span>
                    <span className="text-[13px] font-bold font-mono tabular-nums" style={{ color: UP.navy }}>{row.v}</span>
                  </div>
                ))}
              </div>

              {/* 누적 카운트 + CTA */}
              <div className="flex items-center justify-between px-5 py-3 mt-auto border-t" style={{ borderColor: UP.hair }}>
                {!countLoaded ? (
                  <div className="w-[140px] h-4 rounded" style={{ background: UP.hair }} />
                ) : (
                  <p className="text-[12px]" style={{ color: UP.ink }}>
                    지금까지{' '}
                    <span className="font-extrabold font-mono tabular-nums" style={{ color: UP.brand }}>{animatedCount.toLocaleString()}</span>
                    명이 확인했어요
                  </p>
                )}
                <button
                  onClick={handleSeverance}
                  className="flex items-center justify-center min-h-[40px] min-w-[40px] -mr-1.5 rounded-md transition-colors"
                  style={{ color: UP.brand }}
                  aria-label="퇴직금 계산하러 가기"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.section>

          {/* ════════════ 데이터 2단 그리드 (업비트: 좌 시세표 + 우 공지) ════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">

            {/* ── 좌 2/3: 계산기 + 채용 (행 리스트) ── */}
            <div className="lg:col-span-2 min-w-0 flex flex-col gap-4 lg:gap-5">

              {/* 계산기 — 촘촘한 행 리스트 */}
              <motion.section custom={1} variants={fadeUp} initial="hidden" animate="visible">
                <div className="rounded-lg overflow-hidden" style={{ background: UP.card, border: `1px solid ${UP.hair}` }}>
                  <PanelHeader title="계산기" onMore={() => navigate('/calculator')} />
                  <div className="divide-y" style={{ borderColor: UP.hair }}>
                    {calcRows.map(row => (
                      <button
                        key={row.label}
                        onClick={row.onClick}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F4F6F9] active:bg-[#EEF1F5]"
                      >
                        <div
                          className="w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0"
                          style={{ background: row.primary ? UP.brand : '#EAF2FE' }}
                        >
                          <row.icon className="w-[18px] h-[18px]" style={{ color: row.primary ? '#fff' : UP.strong }} strokeWidth={1.9} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold leading-tight" style={{ color: UP.navy }}>{row.label}</p>
                          <p className="text-[12px] mt-0.5 truncate" style={{ color: UP.sub }}>{row.sub}</p>
                        </div>
                        <span className="text-[12px] font-semibold font-mono tabular-nums whitespace-nowrap hidden xs:inline" style={{ color: UP.ink }}>
                          {row.fig}
                        </span>
                        <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: UP.sub }} />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.section>

              {/* 채용 — 행 리스트 (업비트 시세표 톤) */}
              <motion.section custom={2} variants={fadeUp} initial="hidden" animate="visible">
                <div className="rounded-lg overflow-hidden" style={{ background: UP.card, border: `1px solid ${UP.hair}` }}>
                  <PanelHeader title="오늘의 채용정보" onMore={() => navigate('/jobs')} />

                  {/* 로딩 스켈레톤 */}
                  {jobsLoading && (
                    <div className="divide-y" style={{ borderColor: UP.hair }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-8 h-8 rounded-md flex-shrink-0" style={{ background: UP.hair }} />
                          <div className="flex-1 flex flex-col gap-1.5">
                            <div className="h-3 w-28 rounded" style={{ background: UP.hair }} />
                            <div className="h-2.5 w-20 rounded" style={{ background: UP.head }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 에러 */}
                  {!jobsLoading && jobsError && (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <p className="text-[13px]" style={{ color: UP.ink }}>공고를 불러오지 못했어요</p>
                      <button onClick={fetchRecentJobs} className="text-[13px] font-semibold min-h-[40px] px-3 hover:underline" style={{ color: UP.brand }}>
                        다시 시도
                      </button>
                    </div>
                  )}

                  {/* 빈 상태 */}
                  {!jobsLoading && !jobsError && recentJobs.length === 0 && (
                    <div className="flex flex-col items-center gap-1 text-center py-8 px-4">
                      <Briefcase className="w-6 h-6 mb-1" style={{ color: UP.sub }} strokeWidth={1.6} />
                      <p className="text-[13px] font-semibold" style={{ color: UP.ink }}>아직 등록된 공고가 없어요</p>
                      <p className="text-[12px]" style={{ color: UP.sub }}>새 공고가 올라오면 가장 먼저 알려드릴게요</p>
                    </div>
                  )}

                  {/* 공고 행 */}
                  {!jobsLoading && !jobsError && recentJobs.length > 0 && (
                    <div className="divide-y" style={{ borderColor: UP.hair }}>
                      {recentJobs.map(job => {
                        const isUrgent = job.section === 'today-urgent' || (job.section !== 'tomorrow-urgent' && job.is_urgent)
                        const isTomorrow = job.section === 'tomorrow-urgent'
                        const logoUrl = getCompanyLogoUrl(job.company_name)
                        const wage = job.daily_wage > 0 ? job.daily_wage : job.hourly_wage
                        const wageLabel = job.daily_wage > 0 ? '일급' : '시급'

                        // D-day
                        let dDay: string | null = null
                        if (job.expires_at) {
                          const today = new Date(); today.setHours(0, 0, 0, 0)
                          const exp = new Date(job.expires_at); exp.setHours(0, 0, 0, 0)
                          const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                          if (diff === 0) dDay = 'D-Day'
                          else if (diff > 0) dDay = `D-${diff}`
                        }

                        return (
                          <button
                            key={job.id}
                            onClick={() => navigate(`/jobs?focus=${job.id}`)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F4F6F9] active:bg-[#EEF1F5]"
                          >
                            <div className="w-8 h-8 rounded-md flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: UP.head }}>
                              {logoUrl !== '/logos/default.svg' ? (
                                <img src={logoUrl} alt={job.company_name} className="w-5 h-5 object-contain" />
                              ) : (
                                <span className="text-[13px] font-bold" style={{ color: UP.ink }}>{job.company_name.charAt(0)}</span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-[14px] font-bold truncate" style={{ color: UP.navy }}>{job.company_name}</span>
                                {isUrgent && (
                                  <span className="px-1 py-0.5 rounded text-[10px] font-bold flex-shrink-0" style={{ background: '#FDECEE', color: UP.danger }}>긴급</span>
                                )}
                                {isTomorrow && (
                                  <span className="px-1 py-0.5 rounded text-[10px] font-bold flex-shrink-0" style={{ background: '#FFF4E5', color: '#B7791F' }}>내일</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[12px]" style={{ color: UP.sub }}>
                                {job.region && (
                                  <span className="inline-flex items-center gap-0.5 min-w-0 truncate"><MapPin className="w-3 h-3 flex-shrink-0" />{job.region}</span>
                                )}
                                {job.work_hours && (
                                  <span className="inline-flex items-center gap-0.5 min-w-0 truncate"><Clock className="w-3 h-3 flex-shrink-0" />{job.work_hours}</span>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex-shrink-0">
                              <p className="text-[10px] leading-tight" style={{ color: UP.sub }}>{wageLabel}{dDay ? ` · ${dDay}` : ''}</p>
                              <p className="text-[14px] font-black font-mono tabular-nums leading-tight" style={{ color: UP.brand }}>
                                {wage.toLocaleString('ko-KR')}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: UP.sub }} />
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </motion.section>
            </div>

            {/* ── 우 1/3: 공지 패널 + 가이드 배너 ── */}
            <motion.aside custom={3} variants={fadeUp} initial="hidden" animate="visible" className="min-w-0 flex flex-col gap-4 lg:gap-5">

              {/* 공지사항 (업비트 우측 공지 리스트 차용) */}
              <div className="rounded-lg overflow-hidden" style={{ background: UP.card, border: `1px solid ${UP.hair}` }}>
                <PanelHeader title="공지사항" onMore={() => navigate('/notices')} />
                {notices.length === 0 ? (
                  <div className="flex items-center gap-2 px-4 py-6">
                    <Megaphone className="w-4 h-4 flex-shrink-0" style={{ color: UP.sub }} />
                    <p className="text-[13px]" style={{ color: UP.sub }}>등록된 공지가 없어요</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: UP.hair }}>
                    {notices.slice(0, 5).map(n => {
                      const d = new Date(n.created_at)
                      const dateStr = Number.isNaN(d.getTime())
                        ? ''
                        : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
                      return (
                        <button
                          key={n.id}
                          onClick={() => navigate('/notices')}
                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[#F4F6F9]"
                        >
                          <span className="text-[13px] truncate min-w-0" style={{ color: UP.navy }}>{n.title}</span>
                          {dateStr && <span className="text-[11px] font-mono tabular-nums flex-shrink-0" style={{ color: UP.sub }}>{dateStr}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 노동법 가이드 배너 (평평한 남색 면) */}
              <button
                type="button"
                onClick={() => navigate('/guide')}
                className="group w-full rounded-lg p-5 flex items-center gap-3 text-left transition-all active:scale-[0.99]"
                style={{ background: UP.navy }}
              >
                <div className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-[15px]">노동법 가이드</p>
                  <p className="text-[12px] break-keep" style={{ color: 'rgba(255,255,255,0.72)' }}>퇴직금 · 실업급여 · 주휴 · 연차</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </motion.aside>
          </div>

          {/* ── 푸터 ── */}
          <p className="text-center text-[11px] leading-relaxed mt-1" style={{ color: UP.sub }}>
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
