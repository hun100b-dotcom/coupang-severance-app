import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calculator, ChevronRight } from 'lucide-react'
import PageMeta from '../../components/PageMeta'
import RelatedLinks from '../../components/seo/RelatedLinks'

// ── 주휴수당 가이드 — FAQPage JSON-LD (구글 FAQ 리치 스니펫) ──
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '알바·일용직도 주휴수당을 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 받을 수 있습니다. 고용 형태(정규직·계약직·아르바이트·일용직)와 관계없이 주 15시간 이상 근무하고 소정근로일을 모두 출근하면 주휴수당이 발생합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '주 15시간은 정확히 어떻게 계산하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '1주일(월~일) 동안 실제 근무한 시간의 합계입니다. 단, 최근 4주간의 평균 근로시간이 기준이 될 수도 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '한 날 결근하면 주휴수당을 못 받나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '그 주의 소정근로일을 모두 출근해야 주휴수당이 발생합니다. 정당한 사유 없이 결근하면 그 주 주휴수당은 발생하지 않습니다. 단, 유급휴가·질병 등 정당한 사유는 출근한 것으로 간주될 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '주휴수당 계산 방법이 어떻게 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '주휴수당 = 시급 × 주 소정근로시간 ÷ 5입니다. 주 40시간 근무자 기준 시급 × 8시간, 단시간 근로자는 시급 × (주 소정근로시간 × 8 ÷ 40)으로 계산합니다.',
      },
    },
  ],
}

// ── BreadcrumbList JSON-LD (페이지 계층 구조) ──
const BREADCRUMB_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: '홈', item: 'https://catch-daily-worker.vercel.app/home' },
    { '@type': 'ListItem', position: 2, name: '가이드', item: 'https://catch-daily-worker.vercel.app/guide' },
    { '@type': 'ListItem', position: 3, name: '주휴수당 가이드', item: 'https://catch-daily-worker.vercel.app/guide/weekly-allowance' },
  ],
}

// ── 섹션 ID 및 목차 ──
const TABLE_OF_CONTENTS = [
  { id: 'definition', label: '주휴수당이란?' },
  { id: 'conditions', label: '발생 조건' },
  { id: 'calculation', label: '계산 방법' },
  { id: 'application', label: '일용직 적용' },
  { id: 'remedy', label: '미지급 대처' },
  { id: 'faq', label: 'FAQ' },
]

// ── Framer Motion 애니메이션 설정 ──
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

// ── 정보 박스 컴포넌트 ──
function InfoBox({ title, children, variant = 'default' }: { title: string; children: React.ReactNode; variant?: 'default' | 'warning' | 'tip' }) {
  const variantStyles = {
    default: 'bg-accent-bg border-accent/30',
    warning: 'bg-warning/10 border-warning/30',
    tip: 'bg-accent-bg border-accent/30',
  }
  return (
    <div className={`border-l-4 ${variant === 'warning' ? 'border-warning' : variant === 'tip' ? 'border-accent' : 'border-accent'} ${variantStyles[variant]} rounded-lg p-4 mb-4`}>
      <h4 className="font-bold text-sm mb-2 text-up-navy">{title}</h4>
      <div className="text-sm text-up-body">{children}</div>
    </div>
  )
}

// ── 목차 바 ──
function TableOfContents({ activeSection }: { activeSection: string }) {
  const [showContents, setShowContents] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="bg-up-surface border border-up-hair rounded-lg p-4 mb-6 sticky top-14 z-20"
    >
      <button
        onClick={() => setShowContents(!showContents)}
        className="w-full text-left font-bold text-up-navy flex items-center justify-between mb-2"
      >
        <span className="text-sm">목차</span>
        <ChevronRight className={`w-4 h-4 transition-transform ${showContents ? 'rotate-90' : ''}`} />
      </button>
      {showContents && (
        <div className="space-y-2">
          {TABLE_OF_CONTENTS.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`block text-sm py-1 px-2 rounded transition-colors ${
                activeSection === item.id
                  ? 'bg-accent-bg text-accent-700 font-semibold'
                  : 'text-up-sub hover:text-accent-700'
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ── 가이드 카드 (하단 추천 가이드) ──
function GuideCard({ title, icon: Icon, href }: { title: string; icon: React.ReactNode; href: string }) {
  return (
    <Link
      to={href}
      className="block bg-gradient-to-br from-accent-700 to-accent border border-accent/30 rounded-xl p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{Icon}</div>
        <div>
          <h4 className="font-bold text-sm text-up-navy">{title}</h4>
          <p className="text-xs text-up-sub mt-1">가이드 보기</p>
        </div>
        <ChevronRight className="w-4 h-4 text-accent-700 ml-auto" />
      </div>
    </Link>
  )
}

// ── 메인 페이지 ──
export default function WeeklyAllowanceGuide() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('definition')

  useEffect(() => {
    // PageMeta 컴포넌트가 title을 관리하므로 document.title 직접 설정 제거

    // ── 스크롤 위치 감지 ──
    const handleScroll = () => {
      const sections = TABLE_OF_CONTENTS.map((item) => document.getElementById(item.id)).filter(Boolean)
      for (const section of sections) {
        if (!section) continue
        const rect = section.getBoundingClientRect()
        if (rect.top < 200) {
          setActiveSection(section.id)
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-2 pb-8 bg-up-page">
      {/* ── SEO 메타태그: title, description, canonical, JSON-LD 구조화 데이터 ── */}
      <PageMeta
        title="주휴수당 가이드 — 알바·일용직 주휴수당 조건·계산법 완전 정리 | CATCH"
        description="주 15시간 이상 근무하면 주휴수당을 받을 수 있습니다. 쿠팡·컬리 일용직·알바 주휴수당 발생 조건과 계산 방법을 안내합니다."
        canonical="https://catch-daily-worker.vercel.app/guide/weekly-allowance"
        jsonLd={[FAQ_SCHEMA, BREADCRUMB_SCHEMA]}
      />

      <div className="w-full max-w-[680px] flex flex-col gap-4">

        {/* ── 히어로 섹션 ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-accent-700 to-accent p-6 text-white overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-up-surface/10 rounded-full blur-2xl -z-10" />
          {/* ★SEO: 페이지 유일 H1(키워드 선두) — 기존 h2는 h1 부재(h1=0) 원인이라 승격 */}
          <h1 className="text-2xl font-black mb-2 text-white">주휴수당, 매주 빠짐없이 받아야 해요</h1>
          <p className="text-white/85 text-sm mb-4">주 15시간 이상 근무 시 발생</p>
          <div className="text-3xl font-black">근로기준법 55조 보장</div>
        </motion.div>

        {/* ── 목차 ── */}
        <TableOfContents activeSection={activeSection} />

        {/* ── 섹션: 주휴수당이란? ── */}
        <motion.section
          id="definition"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">주휴수당이란?</h2>
          <p className="text-sm text-up-body mb-4 leading-relaxed">
            주휴수당은 주중에 소정의 근로를 수행한 근로자가 <span className="font-semibold">주휴일에 받는 보상금</span>입니다. <br />
            근로기준법 제55조에서 보장하는 법정 급여입니다.
          </p>
          <InfoBox
            title="정의 (근로기준법 제55조)"
            variant="default"
          >
            1주 소정근로일을 모두 근무한 근로자에게는 <br />
            그 주의 유급주휴일이 보장되어야 합니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 발생 조건 ── */}
        <motion.section
          id="conditions"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">발생 조건</h2>

          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-accent-bg text-accent-700 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
              <div>
                <h4 className="font-bold text-sm text-up-navy">주간 근로 시간</h4>
                <p className="text-xs text-up-sub mt-1">1주 15시간 이상 근무</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-accent-bg text-accent-700 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
              <div>
                <h4 className="font-bold text-sm text-up-navy">주간 개근</h4>
                <p className="text-xs text-up-sub mt-1">그 주의 소정근로일을 모두 근무해야 함</p>
              </div>
            </div>
          </div>

          <InfoBox
            title="💡 예시"
            variant="tip"
          >
            월요일부터 금요일까지 주 3일 근무, 1일 6시간 = 주 18시간<br />
            5일 모두 출근했다면 주휴수당 발생!
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 계산 방법 ── */}
        <motion.section
          id="calculation"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">계산 방법</h2>

          <div className="mb-4">
            <h3 className="font-bold text-sm text-up-navy mb-3">계산 공식</h3>
            <InfoBox
              title="주휴수당 = 1일 통상임금 × 1일"
              variant="default"
            >
              <div className="space-y-2 text-xs">
                <p><span className="font-semibold">1일 통상임금</span> = 시급 × 1일 근로시간</p>
                <p>또는 월급 ÷ 월 평균 근로일수</p>
              </div>
            </InfoBox>
          </div>

          <div className="mb-4">
            <h3 className="font-bold text-sm text-up-navy mb-3">계산 예시</h3>
            <div className="bg-accent-bg rounded-lg p-3 text-xs space-y-1 text-up-body">
              <p>• 시급: 12,000원</p>
              <p>• 1일 근로시간: 8시간</p>
              <p>• 1일 통상임금: 12,000원 × 8시간 = 96,000원</p>
              <p className="font-bold text-accent-700 pt-2">
                → 주휴수당: 96,000원/주
              </p>
            </div>
          </div>

          <InfoBox
            title="⚠️ 통상임금 범위"
            variant="warning"
          >
            통상임금은 기본급, 고정 수당, 초과근무수당 등을 포함합니다. <br />
            월급이 정해진 경우 월급을 기준으로 계산합니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 일용직 적용 ── */}
        <motion.section
          id="application"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">일용직 적용</h2>

          <p className="text-sm text-up-body mb-4 leading-relaxed">
            일용직 근로자도 주휴수당 발생 조건을 충족하면 <br />
            받을 권리가 있습니다.
          </p>

          <div className="space-y-3 mb-4">
            <div className="bg-accent-bg rounded-lg p-3 text-xs">
              <p className="font-bold text-up-navy mb-1">✓ 받을 수 있는 경우</p>
              <p className="text-up-sub">매주 정해진 요일에 출근하는 일용직 근로자</p>
            </div>
            <div className="bg-accent-bg rounded-lg p-3 text-xs">
              <p className="font-bold text-up-navy mb-1">✗ 받기 어려운 경우</p>
              <p className="text-up-sub">출근 패턴이 불규칙하거나 주 15시간 미만의 경우</p>
            </div>
          </div>

          <InfoBox
            title="💡 확인 방법"
            variant="tip"
          >
            최근 4주 근무 기록을 확인하세요.<br />
            주당 15시간 이상이고 소정근로일 개근했다면<br />
            주휴수당을 청구할 수 있습니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 미지급 대처 ── */}
        <motion.section
          id="remedy"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">미지급 시 대처법</h2>

          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-bg text-accent-700 text-sm font-bold flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <h4 className="font-bold text-sm text-up-navy">근무 기록 확인</h4>
                <p className="text-xs text-up-sub mt-1">지난 4주 동안의 일한 날짜와 시간 정리</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-bg text-accent-700 text-sm font-bold flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <h4 className="font-bold text-sm text-up-navy">급여 명세서 확인</h4>
                <p className="text-xs text-up-sub mt-1">주휴수당 항목이 있는지 확인</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-bg text-accent-700 text-sm font-bold flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <h4 className="font-bold text-sm text-up-navy">회사에 청구</h4>
                <p className="text-xs text-up-sub mt-1">내용증명으로 미지급 주휴수당 지급 요청</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-bg text-accent-700 text-sm font-bold flex items-center justify-center flex-shrink-0">4</div>
              <div>
                <h4 className="font-bold text-sm text-up-navy">행정기관 신고</h4>
                <p className="text-xs text-up-sub mt-1">고용노동부 고용센터에 신고 (미지급 임금 문제)</p>
              </div>
            </div>
          </div>

          <InfoBox
            title="⏰ 청구 기한"
            variant="warning"
          >
            임금 청구권은 3년으로 제한됩니다.<br />
            미지급된 주휴수당을 발견했다면 빨리 청구하세요.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: FAQ ── */}
        <motion.section
          id="faq"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">자주 묻는 질문</h2>
          <div className="space-y-3">
            <details className="border border-up-hair rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-up-navy flex justify-between items-center">
                주 15시간은 정확히 어떻게 계산하나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-up-sub mt-2">1주일(월~일) 동안 일한 시간의 합계입니다. 최근 4주의 평균이 기준이 될 수도 있습니다.</p>
            </details>

            <details className="border border-up-hair rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-up-navy flex justify-between items-center">
                한 날만 못 나가도 못 받나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-up-sub mt-2">그 주의 소정근로일을 모두 근무해야 발생합니다. 정당한 사유 없이 한 날 결근하면 그 주 주휴수당은 발생하지 않습니다.</p>
            </details>

            <details className="border border-up-hair rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-up-navy flex justify-between items-center">
                휴가나 질병으로 못 나갔으면?
                <span>▼</span>
              </summary>
              <p className="text-xs text-up-sub mt-2">정당한 사유(유급휴가, 질병 등)는 근무한 것으로 간주될 수 있습니다. 회사와 협의하세요.</p>
            </details>

            <details className="border border-up-hair rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-up-navy flex justify-between items-center">
                주휴수당을 현금으로 받을 수 있나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-up-sub mt-2">네, 주휴수당도 임금이므로 현금 또는 통장으로 지급받을 수 있습니다.</p>
            </details>
          </div>
        </motion.section>

        {/* ── 하단 CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-up-surface rounded-xl p-5 mt-2"
        >
          <button
            onClick={() => navigate('/weekly-allowance')}
            className="w-full bg-gradient-to-r from-accent-700 to-accent text-white rounded-xl py-4 font-bold text-base flex items-center justify-center gap-2 hover:shadow-lg transition-all mb-4"
          >
            <Calculator className="w-5 h-5" />
            지금 바로 주휴수당 계산하기
          </button>

          <h3 className="font-bold text-sm text-up-navy mb-3">다른 가이드</h3>
          <div className="space-y-2">
            <GuideCard
              title="퇴직금 가이드"
              icon="💼"
              href="/guide/severance"
            />
            <GuideCard
              title="실업급여 가이드"
              icon="🛡️"
              href="/guide/unemployment"
            />
            <GuideCard
              title="연차수당 가이드"
              icon="📅"
              href="/guide/annual-leave"
            />
          </div>
        </motion.div>

        {/* ── 가이드 허브로 돌아가기 ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-4 mb-4"
        >
          <button
            onClick={() => navigate('/guide')}
            className="w-full py-3 rounded-xl border border-up-hair text-sm font-semibold text-up-sub hover:bg-up-sunken transition-colors"
          >
            ← 전체 가이드 목록 보기
          </button>
        </motion.div>

        {/* SEO 내부 링크 메시(P5) — 크롤 가능한 관련 계산기·가이드 */}
        <RelatedLinks current="/guide/weekly-allowance" />

      </div>
    </div>
  )
}
