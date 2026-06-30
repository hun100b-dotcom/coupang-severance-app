import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Briefcase, ShieldCheck, Clock, CalendarDays, Calculator, ChevronRight } from 'lucide-react'
import PageMeta from '../../components/PageMeta'

// ── GuideHub — BreadcrumbList JSON-LD (가이드 허브 계층) ──
const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://catch-daily-worker.vercel.app/home' },
    { '@type': 'ListItem', position: 2, name: '가이드', item: 'https://catch-daily-worker.vercel.app/guide' },
  ],
}

// ── 가이드 데이터 ──
const GUIDES = [
  {
    id: 'severance',
    title: '퇴직금 가이드',
    description: '일용직도 받을 수 있어요. 조건, 계산법, 청구 절차를 알려드립니다.',
    icon: Briefcase,
    href: '/guide/severance',
    color: 'bg-brand-bg',
    accentColor: 'text-brand-strong',
  },
  {
    id: 'unemployment',
    title: '실업급여 가이드',
    description: '퇴직 후 생활을 지킬 수 있어요. 수급 조건과 신청 방법을 알려드립니다.',
    icon: ShieldCheck,
    href: '/guide/unemployment',
    color: 'bg-brand-bg',
    accentColor: 'text-brand-strong',
  },
  {
    id: 'weekly',
    title: '주휴수당 가이드',
    description: '주 15시간 이상 일하면 발생해요. 계산 방법과 미지급 대처법을 알려드립니다.',
    icon: Clock,
    href: '/guide/weekly-allowance',
    color: 'bg-accent-bg',
    accentColor: 'text-accent-700',
  },
  {
    id: 'annual',
    title: '연차수당 가이드',
    description: '미사용 연차를 돈으로 받을 수 있어요. 발생 조건과 계산법을 알려드립니다.',
    icon: CalendarDays,
    href: '/guide/annual-leave',
    color: 'bg-accent-bg',
    accentColor: 'text-accent-700',
  },
]

// ── 메인 가이드 허브 ──
export default function GuideHub() {
  const navigate = useNavigate()

  useEffect(() => {
    // PageMeta 컴포넌트가 title을 관리하므로 document.title 직접 설정 제거
  }, [])

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-2 pb-10 bg-up-page">
      {/* ── SEO 메타태그: title, description, canonical, JSON-LD 구조화 데이터 ── */}
      <PageMeta
        title="노동법 가이드 — 퇴직금·실업급여·주휴수당·연차수당 완전 정리 | CATCH"
        description="쿠팡·컬리 일용직 근로자를 위한 노동법 가이드. 퇴직금, 실업급여, 주휴수당, 연차수당 조건과 계산 방법을 한 곳에서 확인하세요."
        canonical="https://catch-daily-worker.vercel.app/guide"
        jsonLd={BREADCRUMB_SCHEMA}
      />

      <div className="w-full max-w-[840px] flex flex-col gap-7 md:gap-8">

        {/* ── 히어로 섹션 (홈 톤 계승: 파랑→진파랑 그래디언트, 큰 헤드라인) ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl bg-gradient-to-br from-brand to-brand-strong p-8 md:p-10 text-white overflow-hidden relative"
        >
          {/* 배경 장식 */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -z-10" />

          <div className="relative z-10 flex items-start gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>

          <h1 className="text-[28px] md:text-[36px] font-black mb-3 tracking-tight leading-tight">CATCH 노동법 가이드</h1>
          <p className="text-white/90 text-[15px] md:text-base leading-relaxed">
            일용직 근로자를 위한 핵심 노동법 정보를 한눈에 확인하세요.
          </p>
        </motion.div>

        {/* ── 가이드 카드 그리드 (솔리드 흰 카드 + 헤어라인, 색 구분은 아이콘 칩) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {GUIDES.map((guide, i) => {
            const Icon = guide.icon
            return (
              <motion.div
                key={guide.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.08 }}
                whileHover={{ y: -4 }}
                className="h-full"
              >
                <Link
                  to={guide.href}
                  className="flex flex-col h-full bg-up-surface border border-up-hair rounded-2xl p-6 shadow-card transition-all hover:border-brand-200 hover:shadow-float"
                >
                  {/* 아이콘 칩 (가이드별 색 구분: 블루/그린) */}
                  <div className={`w-11 h-11 rounded-xl ${guide.color} ${guide.accentColor} mb-4 flex items-center justify-center`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* 내용 */}
                  <h3 className="text-[17px] font-bold text-up-navy mb-2">
                    {guide.title}
                  </h3>
                  <p className="text-[14px] text-up-sub leading-relaxed mb-5 flex-1">
                    {guide.description}
                  </p>

                  {/* 링크 */}
                  <div className={`flex items-center gap-1.5 ${guide.accentColor} text-[14px] font-semibold`}>
                    자세히 보기
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* ── 하단 CTA (홈 톤 계승: 브랜드 그래디언트, 흰 텍스트 AA) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="pt-1 pb-4"
        >
          <button
            onClick={() => navigate('/severance')}
            className="w-full bg-gradient-to-r from-brand to-brand-strong text-white rounded-2xl min-h-[56px] py-4 font-bold text-base flex items-center justify-center gap-2 hover:shadow-float transition-all active:scale-[0.99]"
          >
            <Calculator className="w-5 h-5" />
            지금 바로 계산해보기
          </button>
        </motion.div>
      </div>
    </div>
  )
}
