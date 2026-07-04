import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  ChevronRight, ArrowRight, MapPin, Clock, Briefcase, BookOpen,
  Building2, CalendarDays, Gift, FileText, Banknote, Palmtree,
  Upload, Calculator, CheckCircle2, ShieldCheck, BadgeCheck, Headphones, Megaphone,
} from 'lucide-react'
import PageMeta from '../components/PageMeta'
import TopNav from '../components/TopNav'
import BottomNav from '../components/BottomNav'
import { api, registerClick } from '../lib/api'
import { getCompanyLogoUrl } from '../lib/jobUtils'
import type { JobPosting } from '../types/supabase'
import { INTRO_COPIES } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { useNotices } from '../hooks/useNotices'
import { consumePendingSaveDone } from '../lib/pendingSave'
// 어드민 CMS(긴급공지 띠 + 진입 팝업) 실소비 — 2026-07-04 연동 전수조사 신설
import { AnnouncementBar, PopupBanner, useCmsBanners } from '../components/CmsBanners'

// ─────────────────────────────────────────────────────────────
// 🎨 업비트풍 시안 전용 로컬 색 토큰 (홈 시안 범위에서만 인라인)
//    전역 tailwind 토큰은 미변경 → 되돌리기 쉽게 Home 내부에만 둠 (워크트리 Phase3에서 전역화 예정)
//    값 출처: upbit.com/home 라이브 실측 (docs/design/upbit_home_analysis.md)
//    ※ 보조 텍스트는 더블리뷰 교훈 반영해 #565D6A(흰 위 AA 6.7:1) 사용. 흐린 #8E929B는 비필수 캡션만.
// ─────────────────────────────────────────────────────────────
const UP = {
  page:    '#EEF1F5', // 페이지 배경(옅은 청회색)
  surface: '#FFFFFF', // 카드/면
  sunken:  '#F2F5FA', // 구획/표 헤더 배경
  navy:    '#1A2434', // 헤딩(남색 잉크)
  body:    '#333D4B', // 본문
  sub:     '#565D6A', // 보조 텍스트 (AA 6.7:1)
  caption: '#8E929B', // 캡션/날짜 (비필수만)
  hair:    '#E1E4EA', // 헤어라인 보더
  brand:   '#3182F6', // 포인트 블루
  strong:  '#1B64DA', // 주 CTA·금액 강조 (AA 5.4:1)
  bgBrand: '#EAF2FE', // 옅은 블루 배경
  green:   '#047857', // 채용(AA용 진한 그린)
  bgGreen: '#E6F8F1',
  danger:  '#F04452', // 긴급 전용
}

// ── count-up hook ──
// reduce=true(prefers-reduced-motion)면 굴리지 않고 목표값을 즉시 표시한다.
// (히어로 헤드라인·타일은 이미 reduceMotion 분기 → 금액 카운트업도 일관되게 맞춤)
function useCountUp(target: number, duration = 1600, reduce = false) {
  const [value, setValue] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (reduce) { setValue(target); return } // 모션 최소화: 즉시 최종값
    if (target <= 0 || started.current) return
    started.current = true
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setValue(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, reduce])
  return value
}

// ── CATCH 브랜드 텍스트 하이라이트 ──
function HighlightCatch({ text }: { text: string }) {
  const parts = text.split(/(CATCH)/g)
  return (
    <>
      {parts.map((part, i) =>
        part === 'CATCH'
          ? <span key={i} style={{ color: UP.brand }} className="font-black">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

// ── 홈 전용 와이드 컨테이너(업스케일: 1080→1280, 데스크톱 위주) ──
function Wrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`w-full max-w-[1280px] mx-auto px-5 md:px-8 ${className}`}>{children}</div>
}

// ── 섹션 큰 제목 ──
function SectionTitle({ kicker, title, desc }: { kicker?: string; title: string; desc?: string }) {
  return (
    <div className="mb-7 md:mb-9">
      {kicker && <p className="text-[13px] font-bold mb-2" style={{ color: UP.brand }}>{kicker}</p>}
      <h2 className="text-[24px] md:text-[30px] font-extrabold tracking-tight break-keep" style={{ color: UP.navy }}>{title}</h2>
      {desc && <p className="text-[15px] md:text-[16px] mt-2.5 break-keep" style={{ color: UP.sub }}>{desc}</p>}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const { notices } = useNotices()
  // 어드민 CMS 배너 (긴급공지 띠 + 진입 팝업) — 실패 시 null이라 홈 렌더 영향 없음
  const cmsBanners = useCmsBanners()
  const [count, setCount] = useState(0)
  const [countLoaded, setCountLoaded] = useState(false)
  const [copyIdx, setCopyIdx] = useState(0)
  const animatedCount = useCountUp(count, 1600, !!reduceMotion)
  const heroAmount = useCountUp(250, 1600, !!reduceMotion) // 히어로 우측 수령액 카운트업(만원 단위)

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
      } catch { /* 폴백 */ }
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

  // 7초 간격 카피 슬라이드 (캐러셀 점과 연동)
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

  // 4계산기 + 혜택
  const calcCards = [
    { label: '퇴직금',   sub: 'PDF 한 번이면 정밀 계산',  icon: Banknote,     onClick: handleSeverance,    primary: true },
    { label: '실업급여', sub: '일용직 수급 자격 확인',     icon: Building2,    onClick: handleUnemployment },
    { label: '주휴수당', sub: '이번 주 받을 수당',         icon: CalendarDays, onClick: handleWeekly },
    { label: '연차수당', sub: '남은 연차 정산',            icon: Palmtree,     onClick: handleAnnual },
  ]

  // 히어로 우측 모션 타일 4종 (수당)
  const heroTiles = [
    { label: '퇴직금',   icon: Banknote,     onClick: handleSeverance },
    { label: '실업급여', icon: Building2,    onClick: handleUnemployment },
    { label: '주휴수당', icon: CalendarDays, onClick: handleWeekly },
    { label: '연차수당', icon: Palmtree,     onClick: handleAnnual },
  ]

  // 작동방식 3스텝
  const steps = [
    { icon: Upload,       title: 'PDF 올리기',   desc: '급여명세서 PDF 한 장이면 끝. 없으면 수동 입력도 가능해요.' },
    { icon: Calculator,   title: '자동 계산',     desc: '28일 블록 알고리즘으로 적격 일수·평균임금을 정확히 계산해요.' },
    { icon: CheckCircle2, title: '결과 확인',     desc: '내 퇴직금·실업급여·수당을 3분 안에 확인하고 저장하세요.' },
  ]

  // 신뢰/혜택 피처카드 3 (업비트 cold-wallet 피처 차용)
  const features = [
    { icon: BadgeCheck, title: '100% 무료',   desc: '4대 수당 계산 전부 무료. 회원가입 없이 간편계산도 가능해요.' },
    { icon: ShieldCheck, title: '안전한 보관', desc: '업로드한 PDF와 결과는 본인만 볼 수 있게 안전하게 보관돼요.' },
    { icon: FileText,    title: '정밀 계산',   desc: '노동법 기준 28일 블록 알고리즘으로 정확하게 계산해요.' },
  ]

  // 풋터 링크 컬럼
  const footerCols: { title: string; links: { label: string; to: string }[] }[] = [
    { title: '계산기', links: [
      { label: '퇴직금 계산', to: '/severance' },
      { label: '실업급여 계산', to: '/unemployment' },
      { label: '주휴수당 계산', to: '/weekly-allowance' },
      { label: '연차수당 계산', to: '/annual-leave' },
    ]},
    { title: '가이드', links: [
      { label: '노동법 가이드', to: '/guide' },
      { label: '퇴직금 가이드', to: '/guide/severance' },
      { label: '실업급여 가이드', to: '/guide/unemployment' },
    ]},
    { title: '고객지원', links: [
      { label: '1:1 문의', to: '/inquiry' },
      { label: '공지사항', to: '/notices' },
      { label: '나의 혜택', to: '/my-benefits' },
    ]},
    { title: '회사·정책', links: [
      { label: '서비스 소개', to: '/landing' },
      { label: '이용약관', to: '/terms-of-service' },
      { label: '개인정보처리방침', to: '/privacy-policy' },
    ]},
  ]

  return (
    <>
      <TopNav />

      <main className="relative z-[1] min-h-screen pt-14 pb-[96px] md:pb-0" style={{ background: UP.page }}>

        {/* ── 어드민 CMS: 긴급 공지 띠 (활성+문구 있을 때만) + 진입 팝업 ── */}
        <AnnouncementBar data={cmsBanners} />
        <PopupBanner data={cmsBanners} />

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

        {/* ════════════════════ ① 히어로 (화면의 주인공·큼직) ════════════════════ */}
        <section className="border-b" style={{ borderColor: UP.hair, background: UP.surface }}>
          <Wrap className="py-12 md:py-20">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">

              {/* 좌: 큰 헤드라인 + CTA + 캐러셀 점 */}
              <div className="flex flex-col">
                <span
                  className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full text-[13px] font-bold mb-5"
                  style={{ background: UP.bgBrand, color: UP.strong }}
                >
                  일용직 권리 찾기 · 무료
                </span>

                {/* 7초 로테이션 헤드라인 (업스케일: 최대 52px, 데스크톱 주인공) */}
                <div className="min-h-[7rem] md:min-h-[9rem] w-full overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.h1
                      key={copyIdx}
                      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="text-[clamp(28px,6vw,52px)] font-extrabold leading-[1.28] tracking-tight break-keep"
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

                <p className="text-[16px] md:text-[18px] leading-relaxed mt-4 mb-7 break-keep" style={{ color: UP.sub }}>
                  퇴직금 · 실업급여 · 주휴 · 연차수당, PDF 한 번으로 3분 만에 확인하세요.
                </p>

                {/* CTA 2개 (업스케일: 높이 60px) */}
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    type="button"
                    onClick={handleSeverance}
                    className="group flex-1 inline-flex items-center justify-center gap-2 min-h-[60px] rounded-xl font-bold text-white text-[17px] whitespace-nowrap transition-all active:scale-[0.98]"
                    style={{ background: UP.strong }}
                  >
                    <FileText className="w-5 h-5 flex-shrink-0" />
                    내 퇴직금 캐치하기
                    <ArrowRight className="w-5 h-5 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/jobs')}
                    className="group flex-1 inline-flex items-center justify-center gap-2 min-h-[60px] rounded-xl font-bold text-[17px] whitespace-nowrap transition-all active:scale-[0.98]"
                    style={{ background: '#EDEEF1', color: UP.navy }}
                  >
                    <Briefcase className="w-5 h-5 flex-shrink-0" />
                    단기알바 캐치하기
                  </button>
                </div>

                {/* 캐러셀 점 (헤드라인 로테이션 인디케이터)
                    - tablist/tab은 대응 tabpanel이 없어 부적절 → 단순 버튼 그룹(role=group)+aria-current로 정정
                    - 시각 점은 작게(8/28px) 두되, 클릭 히트영역은 44x44 확보(WCAG 2.5.5) */}
                <div className="flex items-center mt-5" role="group" aria-label="헤드라인 슬라이드 선택">
                  {INTRO_COPIES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCopyIdx(i)}
                      aria-label={`${i + 1}번째 문구 보기`}
                      aria-current={i === copyIdx}
                      className="inline-flex items-center justify-center w-11 h-11 -mx-1.5 first:-ml-3"
                    >
                      <span
                        className="block h-2 rounded-full transition-all"
                        style={{
                          width: i === copyIdx ? 28 : 8,
                          background: i === copyIdx ? UP.strong : UP.hair,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* 우: 깔끔한 Framer 모션 비주얼 (트리맵 대신 — 수령액 카운트업 + 수당 타일 등장) */}
              <div className="w-full">
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl p-6 md:p-8"
                  style={{ background: UP.surface, border: `1px solid ${UP.hair}`, boxShadow: '0 12px 40px rgba(16,24,40,0.08)' }}
                >
                  {/* 로고 + 라벨 */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: UP.brand }}>
                      <img src="/catch-logo.png" alt="CATCH" className="w-full h-full object-contain p-1.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] font-black leading-tight" style={{ color: UP.strong }}>내 예상 수령액</p>
                      <p className="text-[12px] font-semibold" style={{ color: UP.sub }}>쿠팡·CFS 일용직 평균 퇴직금</p>
                    </div>
                  </div>

                  {/* 카운트업 큰 금액 */}
                  <div className="rounded-xl px-5 py-6 mb-5" style={{ background: UP.sunken }}>
                    <p className="flex items-baseline gap-1.5">
                      <span className="text-[44px] md:text-[56px] font-black font-mono tabular-nums tracking-tight leading-none" style={{ color: UP.strong }}>
                        {heroAmount}
                      </span>
                      <span className="text-[22px] font-black" style={{ color: UP.strong }}>만원</span>
                    </p>
                    <p className="text-[13px] mt-2.5" style={{ color: UP.sub }}>1년 이상·주 15시간 이상 근무 시 청구 가능</p>
                  </div>

                  {/* 4대 수당 타일 — stagger 등장 (절제된 모션) */}
                  <div className="grid grid-cols-2 gap-3">
                    {heroTiles.map((t, i) => (
                      <motion.button
                        key={t.label}
                        onClick={t.onClick}
                        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                        className="flex items-center gap-2.5 rounded-xl px-3.5 py-3 text-left transition-colors hover:bg-[#F2F5FA]"
                        style={{ border: `1px solid ${UP.hair}` }}
                      >
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: UP.bgBrand }}>
                          <t.icon className="w-[18px] h-[18px]" style={{ color: UP.strong }} strokeWidth={1.9} />
                        </div>
                        <span className="text-[14px] font-bold" style={{ color: UP.navy }}>{t.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </Wrap>
        </section>

        {/* ════════════════════ ② 작동 방식 3스텝 ════════════════════ */}
        <section className="border-b" style={{ borderColor: UP.hair }}>
          <Wrap className="py-14 md:py-20">
            <SectionTitle kicker="HOW IT WORKS" title="3분이면 충분해요" desc="복잡한 노동법, CATCH가 대신 계산해 드릴게요." />
            <div className="grid md:grid-cols-3 gap-4 md:gap-5">
              {steps.map((s, i) => (
                <div key={s.title} className="rounded-2xl p-6 md:p-7" style={{ background: UP.surface, border: `1px solid ${UP.hair}` }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: UP.bgBrand }}>
                      <s.icon className="w-5 h-5" style={{ color: UP.strong }} strokeWidth={1.9} />
                    </div>
                    <span className="text-[14px] font-black font-mono" style={{ color: UP.caption }}>STEP {i + 1}</span>
                  </div>
                  <h3 className="text-[19px] font-extrabold mb-2" style={{ color: UP.navy }}>{s.title}</h3>
                  <p className="text-[14px] leading-relaxed break-keep" style={{ color: UP.sub }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </Wrap>
        </section>

        {/* ════════════════════ ③ 4계산기 큰 카드 ════════════════════ */}
        <section className="border-b" style={{ borderColor: UP.hair, background: UP.surface }}>
          <Wrap className="py-14 md:py-20">
            <SectionTitle kicker="CALCULATORS" title="내 권리, 항목별로 계산하기" desc="필요한 계산기를 골라 바로 시작하세요." />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {calcCards.map(card => (
                <button
                  key={card.label}
                  onClick={card.onClick}
                  className="group flex flex-col items-start rounded-2xl p-5 md:p-6 text-left transition-all hover:-translate-y-0.5"
                  style={{
                    background: card.primary ? UP.strong : UP.surface,
                    border: `1px solid ${card.primary ? UP.strong : UP.hair}`,
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: card.primary ? 'rgba(255,255,255,0.16)' : UP.bgBrand }}
                  >
                    <card.icon className="w-6 h-6" style={{ color: card.primary ? '#fff' : UP.strong }} strokeWidth={1.9} />
                  </div>
                  <p className="text-[17px] font-extrabold" style={{ color: card.primary ? '#fff' : UP.navy }}>{card.label}</p>
                  <p className="text-[13px] mt-1 break-keep" style={{ color: card.primary ? 'rgba(255,255,255,0.85)' : UP.sub }}>{card.sub}</p>
                  <span className="inline-flex items-center gap-0.5 text-[13px] font-bold mt-4" style={{ color: card.primary ? '#fff' : UP.strong }}>
                    계산하기 <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              ))}
            </div>
            {/* 혜택 진입 */}
            <button
              onClick={handleBenefits}
              className="mt-4 w-full flex items-center gap-3 rounded-2xl px-5 py-4 transition-colors hover:bg-[#F2F5FA]"
              style={{ border: `1px solid ${UP.hair}` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: UP.bgGreen }}>
                <Gift className="w-5 h-5" style={{ color: UP.green }} strokeWidth={1.9} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[15px] font-bold" style={{ color: UP.navy }}>나의 혜택 — 숨은 지원금 찾기</p>
                <p className="text-[13px]" style={{ color: UP.sub }}>내게 맞는 정부·지자체 지원금을 추천받으세요</p>
              </div>
              <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: UP.caption }} />
            </button>
          </Wrap>
        </section>

        {/* ════════════════════ ④ 채용 ════════════════════ */}
        <section className="border-b" style={{ borderColor: UP.hair }}>
          <Wrap className="py-14 md:py-20">
            <div className="flex items-end justify-between gap-4 mb-7 md:mb-9">
              <div>
                <p className="text-[13px] font-bold mb-2" style={{ color: UP.green }}>JOBS</p>
                <h2 className="text-[24px] md:text-[30px] font-extrabold tracking-tight" style={{ color: UP.navy }}>오늘의 단기알바</h2>
              </div>
              <button
                onClick={() => navigate('/jobs')}
                className="inline-flex items-center gap-0.5 min-h-[44px] px-2 text-[14px] font-bold whitespace-nowrap"
                style={{ color: UP.green }}
              >
                전체 보기 <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 로딩 */}
            {jobsLoading && (
              <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl p-5" style={{ background: UP.surface, border: `1px solid ${UP.hair}` }}>
                    <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: UP.hair }} />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-3.5 w-32 rounded" style={{ background: UP.hair }} />
                      <div className="h-3 w-24 rounded" style={{ background: UP.sunken }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 에러 */}
            {!jobsLoading && jobsError && (
              <div className="flex flex-col items-center gap-2 py-10 rounded-2xl" style={{ background: UP.surface, border: `1px solid ${UP.hair}` }}>
                <p className="text-[14px]" style={{ color: UP.sub }}>공고를 불러오지 못했어요</p>
                <button onClick={fetchRecentJobs} className="text-[14px] font-bold min-h-[44px] px-4 hover:underline" style={{ color: UP.brand }}>다시 시도</button>
              </div>
            )}

            {/* 빈 상태 */}
            {!jobsLoading && !jobsError && recentJobs.length === 0 && (
              <div className="flex flex-col items-center gap-1.5 text-center py-12 rounded-2xl" style={{ background: UP.surface, border: `1px solid ${UP.hair}` }}>
                <Briefcase className="w-8 h-8 mb-1" style={{ color: UP.caption }} strokeWidth={1.5} />
                <p className="text-[15px] font-bold" style={{ color: UP.navy }}>아직 등록된 공고가 없어요</p>
                <p className="text-[13px]" style={{ color: UP.sub }}>새 채용공고가 올라오면 가장 먼저 알려드릴게요</p>
              </div>
            )}

            {/* 공고 카드 (2열, 큼직) */}
            {!jobsLoading && !jobsError && recentJobs.length > 0 && (
              <div className="grid md:grid-cols-2 gap-3 md:gap-4">
                {recentJobs.map(job => {
                  const isUrgent = job.section === 'today-urgent' || (job.section !== 'tomorrow-urgent' && job.is_urgent)
                  const isTomorrow = job.section === 'tomorrow-urgent'
                  const logoUrl = getCompanyLogoUrl(job.company_name)
                  const wage = job.daily_wage > 0 ? job.daily_wage : job.hourly_wage
                  const wageLabel = job.daily_wage > 0 ? '일급' : '시급'
                  const benefits: string[] = Array.isArray(job.benefits) ? job.benefits.slice(0, 2) : []

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
                      className="flex items-start gap-3.5 rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5 min-w-0"
                      style={{ background: UP.surface, border: `1px solid ${UP.hair}` }}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: UP.sunken }}>
                        {logoUrl !== '/logos/default.svg'
                          ? <img src={logoUrl} alt={job.company_name} className="w-7 h-7 object-contain" />
                          : <span className="text-[15px] font-bold" style={{ color: UP.sub }}>{job.company_name.charAt(0)}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[15px] font-bold truncate" style={{ color: UP.navy }}>{job.company_name}</span>
                            {isUrgent && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 text-white" style={{ background: UP.danger }}>긴급</span>}
                            {isTomorrow && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 text-white" style={{ background: '#B7791F' }}>내일</span>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-[10px] leading-tight" style={{ color: UP.caption }}>{wageLabel}{dDay ? ` · ${dDay}` : ''}</p>
                            <p className="text-[15px] font-black font-mono tabular-nums leading-tight" style={{ color: UP.strong }}>{wage.toLocaleString('ko-KR')}</p>
                          </div>
                        </div>
                        {job.center_name && <p className="text-[12px] mt-1 truncate" style={{ color: UP.sub }}>{job.center_name}</p>}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[12px]" style={{ color: UP.sub }}>
                          {job.region && <span className="inline-flex items-center gap-0.5 min-w-0"><MapPin className="w-3 h-3 flex-shrink-0" /><span className="truncate">{job.region}</span></span>}
                          {job.work_hours && <span className="inline-flex items-center gap-0.5 min-w-0"><Clock className="w-3 h-3 flex-shrink-0" /><span className="truncate">{job.work_hours}</span></span>}
                        </div>
                        {benefits.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-2">
                            {benefits.map(b => (
                              <span key={b} className="px-2 py-0.5 rounded text-[10px] font-semibold" style={{ background: UP.bgBrand, color: UP.strong }}>{b}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Wrap>
        </section>

        {/* ════════════════════ ⑤ 신뢰/혜택 피처카드 3 + 공지 ════════════════════ */}
        <section className="border-b" style={{ borderColor: UP.hair, background: UP.surface }}>
          <Wrap className="py-14 md:py-20">
            <SectionTitle kicker="WHY CATCH" title="믿고 쓰는 이유" />
            <div className="grid md:grid-cols-3 gap-4 md:gap-5">
              {features.map(f => (
                <div key={f.title} className="rounded-2xl p-6 md:p-7" style={{ background: UP.page, border: `1px solid ${UP.hair}` }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: UP.bgBrand }}>
                    <f.icon className="w-6 h-6" style={{ color: UP.strong }} strokeWidth={1.9} />
                  </div>
                  <h3 className="text-[18px] font-extrabold mb-2" style={{ color: UP.navy }}>{f.title}</h3>
                  <p className="text-[14px] leading-relaxed break-keep" style={{ color: UP.sub }}>{f.desc}</p>
                </div>
              ))}
            </div>

            {/* 공지 + 가이드 (2단) */}
            <div className="grid lg:grid-cols-2 gap-4 md:gap-5 mt-4 md:mt-5">
              {/* 공지 */}
              <div className="rounded-2xl overflow-hidden min-w-0" style={{ background: UP.page, border: `1px solid ${UP.hair}` }}>
                <div className="flex items-center justify-between px-5 h-12 border-b" style={{ borderColor: UP.hair }}>
                  <span className="inline-flex items-center gap-2 text-[15px] font-extrabold" style={{ color: UP.navy }}>
                    <Megaphone className="w-4 h-4" style={{ color: UP.brand }} /> 공지사항
                  </span>
                  <button onClick={() => navigate('/notices')} className="text-[13px] font-semibold" style={{ color: UP.sub }}>더 보기</button>
                </div>
                {notices.length === 0 ? (
                  <p className="px-5 py-6 text-[13px]" style={{ color: UP.caption }}>등록된 공지가 없어요</p>
                ) : (
                  <div className="divide-y" style={{ borderColor: UP.hair }}>
                    {notices.slice(0, 3).map(n => {
                      const d = new Date(n.created_at)
                      const dateStr = Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
                      return (
                        <button key={n.id} onClick={() => navigate('/notices')} className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-white transition-colors min-w-0">
                          <span className="text-[14px] truncate min-w-0" style={{ color: UP.navy }}>{n.title}</span>
                          {/* 날짜: 패널 배경(#EEF1F5) 위라 caption(2.6:1)은 AA 미달 → sub(#565D6A)로 상향 */}
                          {dateStr && <span className="text-[12px] font-mono tabular-nums flex-shrink-0" style={{ color: UP.sub }}>{dateStr}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* 가이드 배너 */}
              <button
                onClick={() => navigate('/guide')}
                className="group rounded-2xl p-6 md:p-7 flex items-center gap-4 text-left transition-all hover:-translate-y-0.5 min-w-0"
                style={{ background: UP.navy }}
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-extrabold text-[17px]">노동법 가이드</p>
                  <p className="text-[13px] break-keep" style={{ color: 'rgba(255,255,255,0.75)' }}>퇴직금 · 실업급여 · 주휴 · 연차, 쉽게 정리했어요</p>
                </div>
                <ChevronRight className="w-5 h-5 text-white flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </Wrap>
        </section>

        {/* ════════════════════ ⑥ 리치 풋터 ════════════════════ */}
        <footer style={{ background: UP.surface }}>
          <Wrap className="py-12 md:py-16">

            {/* 상단: 고객센터 블록 + 4단 링크 컬럼 */}
            <div className="grid lg:grid-cols-[1.2fr_2fr] gap-10 lg:gap-12">

              {/* 고객센터 */}
              <div>
                <div className="flex items-center gap-2 mb-3" style={{ color: UP.navy }}>
                  <Headphones className="w-5 h-5" />
                  <span className="text-[15px] font-bold">고객센터</span>
                  <span className="text-[12px]" style={{ color: UP.sub }}>평일 10:00–18:00</span>
                </div>
                <button
                  onClick={() => navigate('/inquiry')}
                  className="inline-flex items-center gap-2 text-[26px] md:text-[30px] font-black tracking-tight transition-colors hover:underline"
                  style={{ color: UP.navy }}
                >
                  1:1 문의하기 <ArrowRight className="w-6 h-6" style={{ color: UP.strong }} />
                </button>
                <p className="text-[13px] mt-3 break-keep" style={{ color: UP.sub }}>
                  계산 결과·자격 문의는 1:1 문의 또는 카카오 채널로 남겨주세요. 빠르게 답변드릴게요.
                </p>
                {/* 카카오 채널: 실제 채널 개설 전이라 데드링크 대신 1:1 문의로 연결.
                    채널 URL(pf.kakao.com/_xxxxx) 확정 시 onClick을 외부 링크로 교체. */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  <button
                    onClick={() => navigate('/inquiry')}
                    className="inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl text-[14px] font-bold transition-colors"
                    style={{ background: '#FEE500', color: '#3A1D1D' }}
                  >
                    💬 카카오 채널 문의
                  </button>
                  <span className="text-[12px]" style={{ color: UP.caption }}>채널 개설 예정</span>
                </div>
              </div>

              {/* 4단 링크 컬럼 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                {footerCols.map(col => (
                  <div key={col.title} className="min-w-0">
                    <p className="text-[14px] font-bold mb-3" style={{ color: UP.navy }}>{col.title}</p>
                    <ul className="flex flex-col gap-2.5">
                      {col.links.map(l => (
                        <li key={l.label}>
                          <button onClick={() => navigate(l.to)} className="text-[13px] text-left hover:underline transition-colors" style={{ color: UP.sub }}>
                            {l.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* 구분선 */}
            <div className="h-px my-8" style={{ background: UP.hair }} />

            {/* 하단: 회사정보 + 누적 + 면책 */}
            <div className="flex flex-col gap-3">
              <p className="text-[12px] leading-relaxed break-keep" style={{ color: UP.sub }}>
                CATCH (퇴직금 한번에) · 일용직 근로자 권리 찾기 서비스
                {countLoaded && (
                  <> · 지금까지 <span className="font-bold font-mono tabular-nums" style={{ color: UP.strong }}>{animatedCount.toLocaleString()}</span>명이 이용</>
                )}
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: UP.caption }}>
                © 2026 CATCH. All rights reserved.<br />
                이 계산 결과는 참고용이에요. 정확한 금액과 법적 판단은 노무사 상담을 받으세요.
              </p>
            </div>
          </Wrap>
        </footer>
      </main>

      {/* 모바일 하단 탭 (데스크톱은 TopNav가 대체) */}
      <BottomNav />
    </>
  )
}
