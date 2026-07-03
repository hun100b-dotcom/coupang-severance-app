import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calculator, ChevronRight } from 'lucide-react'
import PageMeta from '../../components/PageMeta'
import RelatedLinks from '../../components/seo/RelatedLinks'

// ── Article JSON-LD (구글 기사 리치 스니펫) ──
const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '쿠팡 일용직 퇴직금 계산기 | 2026년 최신 기준 완전정복',
  description: '쿠팡·CFS(쿠팡풀필먼트서비스) 일용직 근로자 퇴직금 수급 조건, 계산 공식, 청구 절차를 2026년 최신 기준으로 완전 정리했습니다.',
  author: { '@type': 'Organization', name: 'CATCH' },
  publisher: {
    '@type': 'Organization',
    name: 'CATCH',
    logo: { '@type': 'ImageObject', url: 'https://catch-daily-worker.vercel.app/catch-logo.png' },
  },
  datePublished: '2026-04-10',
  dateModified: '2026-04-10',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://catch-daily-worker.vercel.app/guide/severance' },
}

// ── HowTo JSON-LD (단계별 계산 방법) ──
const HOW_TO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: '쿠팡 일용직 퇴직금 계산 방법',
  description: '쿠팡 일용직 근로자가 직접 퇴직금을 계산하는 단계별 방법입니다.',
  step: [
    {
      '@type': 'HowToStep',
      name: '1단계: 근속 기간 확인',
      text: '입사일부터 퇴직일까지의 총 근속일수를 확인합니다. 365일(1년) 이상이어야 퇴직금을 받을 수 있습니다.',
    },
    {
      '@type': 'HowToStep',
      name: '2단계: 최근 3개월 급여 합산',
      text: '퇴직일 직전 3개월(90일) 동안 받은 급여 총액을 구합니다. 기본급, 시간외수당, 각종 수당을 모두 포함합니다.',
    },
    {
      '@type': 'HowToStep',
      name: '3단계: 1일 평균임금 계산',
      text: '3개월 급여 합계 ÷ 90일 = 1일 평균임금. 법정 최저 평균임금(연도별 최저임금 기준)보다 낮으면 최저 기준을 적용합니다.',
    },
    {
      '@type': 'HowToStep',
      name: '4단계: 퇴직금 산정',
      text: '(1일 평균임금 × 30) × (근속일수 ÷ 365) = 최종 퇴직금. CATCH 퇴직금 계산기에 급여명세서를 업로드하면 자동으로 계산됩니다.',
    },
  ],
}

// ── FAQPage JSON-LD (구글 FAQ 리치 스니펫) ──
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '일용직 근로자도 퇴직금을 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 받을 수 있습니다. 동일 사업장에서 1년 이상 근무하고 최근 4주 평균 주 15시간 이상 근무했다면 정규직·계약직·일용직 구분 없이 퇴직금 청구 권리가 있습니다 (근로자퇴직급여보장법 제4조).',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 퇴직금은 어떻게 계산하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직금 공식은 (1일 평균임금 × 30일) × (재직일수 ÷ 365)입니다. 1일 평균임금은 최근 3개월 급여 총액을 90일로 나눈 값입니다. CATCH 퇴직금 계산기에 PDF 급여명세서를 업로드하면 자동으로 계산됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '1년 미만 근무했으면 퇴직금을 못 받나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 근로기준법상 퇴직금은 1년 이상 근무가 필수 조건입니다. 단, 여러 계약이 이어지더라도 사실상 계속 근로로 인정되면 합산할 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '회사가 퇴직금을 안 줄 때 어떻게 하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직일로부터 3년 이내에 고용노동부에 진정을 제기할 수 있습니다. 회사가 파산하거나 지급 불능 상태라면 국가 대지급제도를 통해 받을 수 있습니다. 관할 고용센터에 신청하세요.',
      },
    },
    {
      '@type': 'Question',
      name: '퇴직금 청구 소멸시효는 언제까지인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직금 청구권은 퇴직일로부터 3년입니다 (근로기준법 제49조). 3년이 지나면 법적 청구권이 소멸되므로 가능한 빨리 청구하시기 바랍니다.',
      },
    },
    {
      '@type': 'Question',
      name: 'CFS(쿠팡풀필먼트서비스) 일용직은 퇴직금 계산이 다른가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CFS는 일용직이라도 동일한 근무지에서 지속적으로 근무하면 계속 근로로 인정됩니다. 공백 기간이 3개월 미만이면 하나의 근로 세그먼트로 합산되어 1년을 초과하면 퇴직금을 받을 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '28일 블록이란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '쿠팡·CFS 퇴직금 계산에서는 마지막 근무일부터 28일씩 역순으로 블록을 나눕니다. 각 블록에서 근무일이 8일 이상이면 적격 블록으로 인정되며, 총 적격일수가 365일 이상이면 퇴직금 수급 자격이 생깁니다.',
      },
    },
    {
      '@type': 'Question',
      name: '퇴직금에서 세금은 얼마나 공제되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직금은 퇴직소득세 과세 대상입니다. 근속연수에 따른 공제가 적용되므로 실제 세율은 낮습니다. 근속 1~5년은 대부분 세금이 거의 없거나 소액입니다. 정확한 세액은 홈택스 퇴직소득세 계산기를 이용하세요.',
      },
    },
    {
      '@type': 'Question',
      name: '퇴직금과 실업급여를 동시에 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 퇴직금과 실업급여는 별개의 제도입니다. 퇴직금은 사용자(회사)가 지급하고, 실업급여는 고용보험에서 지급합니다. 둘 다 조건을 충족하면 동시에 받을 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '급여명세서가 없어도 퇴직금을 계산할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '통장 입금 내역으로도 계산 가능합니다. 급여명세서가 없을 경우 CATCH 수동 입력 계산기를 이용하거나, 고용노동부에 근로내역 확인서를 요청할 수 있습니다.',
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
    { '@type': 'ListItem', position: 3, name: '퇴직금 가이드', item: 'https://catch-daily-worker.vercel.app/guide/severance' },
  ],
}

// ── 섹션 ID 및 목차 ──
const TABLE_OF_CONTENTS = [
  { id: 'definition',   label: '퇴직금이란?' },
  { id: 'conditions',   label: '수급 조건' },
  { id: 'cfs',          label: 'CFS 일용직 특수성' },
  { id: 'calculation',  label: '계산 공식' },
  { id: 'example',      label: '실제 계산 예시' },
  { id: 'claim',        label: '청구 절차' },
  { id: 'tax',          label: '세금 & 주의사항' },
  { id: 'faq',          label: 'FAQ 10선' },
]

// ── Framer Motion 애니메이션 설정 ──
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

// ── 정보 박스 컴포넌트 ──
function InfoBox({ title, children, variant = 'default' }: { title: string; children: React.ReactNode; variant?: 'default' | 'warning' | 'tip' }) {
  const variantStyles = {
    default: 'bg-brand-bg border-brand-200',
    warning: 'bg-warning/10 border-warning/30',
    tip: 'bg-accent-bg border-accent/30',
  }
  return (
    <div className={`border-l-4 ${variant === 'warning' ? 'border-warning' : variant === 'tip' ? 'border-accent' : 'border-brand'} ${variantStyles[variant]} rounded-lg p-4 mb-4`}>
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
                  ? 'bg-brand-bg text-up-strong font-semibold'
                  : 'text-up-sub hover:text-up-strong'
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
function GuideCard({ title, icon, href }: { title: string; icon: React.ReactNode; href: string }) {
  return (
    <Link
      to={href}
      className="block bg-gradient-to-br from-brand-bg to-brand-strong border border-brand-200 rounded-xl p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <h4 className="font-bold text-sm text-up-navy">{title}</h4>
          <p className="text-xs text-up-sub mt-1">가이드 보기</p>
        </div>
        <ChevronRight className="w-4 h-4 text-up-strong ml-auto" />
      </div>
    </Link>
  )
}

// ── 메인 페이지 ──
export default function SeveranceGuide() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('definition')

  useEffect(() => {
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
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-2 pb-8 bg-up-page">{/* bg-up-surface: blob 완전 차단 */}
      {/* ── SEO 메타태그: title, description, canonical, JSON-LD 구조화 데이터 ── */}
      <PageMeta
        title="쿠팡 일용직 퇴직금 계산기 | 2026년 최신 기준 완전정복 | CATCH"
        description="쿠팡·CFS(쿠팡풀필먼트서비스) 일용직 퇴직금 수급 조건, 28일 블록 계산법, 청구 절차까지 2026년 기준으로 완전 정리. 평균 수령액 250만원, 미청구율 70% — 지금 바로 확인하세요."
        canonical="https://catch-daily-worker.vercel.app/guide/severance"
        jsonLd={[ARTICLE_SCHEMA, HOW_TO_SCHEMA, FAQ_SCHEMA, BREADCRUMB_SCHEMA]}
      />

      <div className="w-full max-w-[680px] flex flex-col gap-4">

        {/* ── 히어로 섹션 ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-brand to-brand-strong p-6 text-white overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-up-surface/10 rounded-full blur-2xl -z-10" />
          {/* H1 — SEO 타겟 키워드 포함 */}
          <h1 className="text-[clamp(22px,5.5vw,28px)] font-black mb-1 leading-tight text-white">쿠팡 일용직 퇴직금 계산기</h1>
          <p className="text-white/85 text-sm mb-3">2026년 최신 기준 완전정복</p>
          {/* flex-wrap으로 뱃지가 375px 이하에서 줄바꿈 허용 */}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="bg-up-surface/20 rounded-full px-2.5 py-1 font-bold">평균 수령 250만원</span>
            <span className="bg-up-surface/20 rounded-full px-2.5 py-1 font-bold">미청구율 70%</span>
            <span className="bg-up-surface/20 rounded-full px-2.5 py-1 font-bold">소멸시효 3년</span>
          </div>
          <p className="text-white/70 text-[11px] mt-3">마지막 업데이트: 2026-04-10</p>
        </motion.div>

        {/* ── 목차 ── */}
        <TableOfContents activeSection={activeSection} />

        {/* ── 섹션 1: 퇴직금이란? ── */}
        <motion.section
          id="definition"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">퇴직금이란?</h2>
          <p className="text-sm text-up-body mb-4 leading-relaxed">
            퇴직금은 근로자가 일정 기간 이상 근무한 후 퇴직할 때 사용자(회사)가 의무적으로 지급해야 하는
            <span className="font-semibold"> 법정 보상금</span>입니다.
            <br /><br />
            근거 법령은 <span className="font-semibold">근로자퇴직급여보장법 제8조</span>이며, 근로 형태(정규직·계약직·일용직)에 관계없이 조건을 충족하면 모든 근로자에게 적용됩니다.
          </p>
          <InfoBox title="법적 정의 (근로자퇴직급여보장법 제8조)" variant="default">
            사용자는 퇴직하는 근로자에게 계속 근로 기간 1년에 대해 30일분 이상의
            평균임금을 퇴직금으로 지급해야 한다.
          </InfoBox>
          <p className="text-sm text-up-body leading-relaxed">
            쿠팡·CFS 일용직 근로자들은 이 권리를 잘 모르거나 청구를 포기하는 경우가 많습니다.
            실제로 미청구율이 <span className="font-bold text-up-strong">약 70%</span>에 달합니다.
          </p>
        </motion.section>

        {/* ── 섹션 2: 수급 조건 ── */}
        <motion.section
          id="conditions"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">누가 받을 수 있나요?</h2>
          <p className="text-sm text-up-body mb-4 leading-relaxed">
            아래 두 가지 조건을 <span className="font-semibold">모두</span> 충족해야 합니다.
          </p>
          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-bg text-up-strong text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
              <div>
                <h3 className="font-bold text-sm text-up-navy">계속 근로 기간 1년 이상</h3>
                <p className="text-xs text-up-sub mt-1">
                  입사일부터 퇴직일까지 계속 근무한 기간이 365일 이상이어야 합니다.
                  공백(무급 휴가·휴직 등)이 있어도 <span className="font-semibold">3개월 미만</span>이면 계속 근로로 인정됩니다.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-bg text-up-strong text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
              <div>
                <h3 className="font-bold text-sm text-up-navy">주 평균 15시간 이상 근무</h3>
                <p className="text-xs text-up-sub mt-1">
                  최근 4주를 평균했을 때 주당 근로 시간이 15시간 이상이어야 합니다.
                  쿠팡 물류센터 일반 근무(8시간/일, 주 2~3일 이상)는 대부분 해당됩니다.
                </p>
              </div>
            </div>
          </div>
          <InfoBox title="✅ 쿠팡 일용직 해당 여부 체크" variant="tip">
            <ul className="space-y-1 text-xs">
              <li>• 동일 물류센터(또는 CFS)에서 1년 이상 근무 → ✅</li>
              <li>• 3개월 이상 공백 없이 계속 출근 → ✅</li>
              <li>• 주당 평균 15시간 이상 → ✅ (보통 1일 8시간 × 주 3일 이상)</li>
            </ul>
          </InfoBox>
        </motion.section>

        {/* ── 섹션 3: CFS 일용직 특수성 ── */}
        <motion.section
          id="cfs"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">CFS(쿠팡풀필먼트서비스) 일용직 특수성</h2>
          <p className="text-sm text-up-body mb-4 leading-relaxed">
            CFS는 쿠팡이 운영하는 물류 자회사로, 계약상 '일용직'이어도 실질적으로는
            <span className="font-semibold"> 상시 반복 근무</span>를 하는 경우가 많습니다.
            이때 법원은 '계속 근로 관계'를 인정합니다.
          </p>
          <div className="space-y-3 mb-4">
            <InfoBox title="28일 블록 계산이란?" variant="default">
              <p className="text-xs leading-relaxed">
                CFS 퇴직금 계산에서는 <span className="font-semibold">마지막 근무일부터 28일씩 역순으로 블록</span>을 나눕니다.
                각 블록에서 근무일이 <span className="font-semibold">8일 이상</span>이면 '적격 블록'이며,
                적격 블록의 총 일수가 <span className="font-semibold">365일 이상</span>이면 퇴직금 수급 자격이 생깁니다.
              </p>
            </InfoBox>
            <InfoBox title="3개월 공백 = 세그먼트 분리" variant="warning">
              <p className="text-xs leading-relaxed">
                근무 이력 중 <span className="font-semibold">3개월(90일) 이상 공백</span>이 있으면
                전후를 별도 근로 세그먼트로 분리해 각각 1년 요건을 따져야 합니다.
                공백이 짧으면(90일 미만) 이어서 계산합니다.
              </p>
            </InfoBox>
          </div>
          <p className="text-sm text-up-body leading-relaxed">
            CATCH 퇴직금 계산기는 이 <span className="font-semibold">28일 블록 알고리즘</span>을 정확하게 적용합니다.
            PDF 급여명세서를 업로드하면 블록별 적격 여부까지 자동 계산됩니다.
          </p>
        </motion.section>

        {/* ── 섹션 4: 계산 공식 ── */}
        <motion.section
          id="calculation"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">퇴직금 계산 공식</h2>

          <InfoBox title="퇴직금 = (1일 평균임금 × 30일) × (재직일수 ÷ 365)" variant="default">
            <div className="space-y-2 text-xs">
              <p><span className="font-semibold">1일 평균임금</span> = 최근 3개월 급여 총액 ÷ 90일</p>
              <p><span className="font-semibold">재직일수</span> = 입사일부터 퇴직일까지의 날짜 수</p>
              <p className="text-up-strong font-semibold mt-1">
                ※ 1일 평균임금이 최저임금보다 낮을 경우 최저임금으로 대체 적용
              </p>
            </div>
          </InfoBox>

          <h3 className="font-bold text-sm text-up-navy mb-2 mt-4">평균임금 산정 방법</h3>
          <p className="text-xs text-up-body mb-3 leading-relaxed">
            평균임금은 퇴직일 직전 <span className="font-semibold">3개월(90일)</span> 동안 지급된 임금 총액을 90일로 나눈 값입니다.
            기본급 외에도 시간외수당, 야간수당, 휴일수당 등 정기적으로 받은 수당도 포함합니다.
          </p>
          <InfoBox title="2026년 최저임금 기준 최저 평균임금" variant="tip">
            <p className="text-xs">2026년 최저임금: 시간당 10,030원 (2026년 고용노동부 고시 — 공식 확인 권장)</p>
            <p className="text-xs mt-1">1일 8시간 기준 일급: 약 80,240원</p>
          </InfoBox>
        </motion.section>

        {/* ── 섹션 5: 실제 계산 예시 ── */}
        <motion.section
          id="example"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">실제 계산 예시</h2>

          <h3 className="font-bold text-sm text-up-navy mb-2">예시 1 — 월급 210만원, 근속 400일</h3>
          <div className="bg-brand-bg rounded-lg p-3 text-xs space-y-1.5 text-up-body mb-4">
            <p>• 최근 3개월 합계: 630만원</p>
            <p>• 1일 평균임금: 630만원 ÷ 90일 = <span className="font-bold">70,000원</span></p>
            <p>• 재직일수: 400일</p>
            <p className="font-bold text-up-strong pt-1.5 border-t border-brand-200">
              퇴직금 = (70,000 × 30) × (400 ÷ 365) ≈ <span className="text-base">약 230만원</span>
            </p>
          </div>

          <h3 className="font-bold text-sm text-up-navy mb-2">예시 2 — 시급 11,000원, 주 5일, 근속 2년</h3>
          <div className="bg-brand-bg rounded-lg p-3 text-xs space-y-1.5 text-up-body mb-4">
            <p>• 월 급여: 11,000원 × 8시간 × 22일 = 1,936,000원</p>
            <p>• 최근 3개월 합계: 약 580만원</p>
            <p>• 1일 평균임금: 580만원 ÷ 90일 ≈ <span className="font-bold">64,444원</span></p>
            <p>• 재직일수: 730일</p>
            <p className="font-bold text-up-strong pt-1.5 border-t border-brand-200">
              퇴직금 = (64,444 × 30) × (730 ÷ 365) ≈ <span className="text-base">약 386만원</span>
            </p>
          </div>

          <InfoBox title="⚠️ 일용직은 급여가 불규칙할 수 있어요" variant="warning">
            정확한 계산을 위해 급여명세서나 통장 입금 내역이 필요합니다.
            CATCH PDF 계산기를 이용하면 급여명세서를 자동 분석해 드립니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션 6: 청구 절차 ── */}
        <motion.section
          id="claim"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">퇴직금 받는 법 (단계별 안내)</h2>

          <div className="space-y-3 mb-4">
            {[
              { step: '1', title: '증거 자료 수집', desc: '급여명세서(PDF), 근무 기록, 계약서, 통장 입금 내역 등 최대한 확보합니다.' },
              { step: '2', title: 'CATCH로 예상 금액 확인', desc: 'PDF를 업로드하거나 수동 입력으로 퇴직금 예상액을 먼저 계산합니다.' },
              { step: '3', title: '회사에 서면 청구', desc: '내용증명 우편으로 퇴직금 지급 요청을 발송합니다. 지급 기한은 퇴직 후 14일 이내입니다.' },
              { step: '4', title: '미지급 시 고용노동부 진정', desc: '14일이 지나도 지급 안 되면 관할 고용노동부에 진정서를 제출합니다.' },
              { step: '5', title: '파산 시 국가 대지급제 신청', desc: '회사가 파산하거나 지급 불능이면 국가에서 대신 지급합니다. 관할 고용센터에 신청하세요.' },
            ].map(item => (
              <div key={item.step} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-bg text-brand-strong text-sm font-bold flex items-center justify-center flex-shrink-0">{item.step}</div>
                <div>
                  <h3 className="font-bold text-sm text-up-navy">{item.title}</h3>
                  <p className="text-xs text-up-sub mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <InfoBox title="소멸시효 — 퇴직 후 3년" variant="tip">
            퇴직금 청구권은 퇴직일로부터 <span className="font-bold">3년</span>이 지나면 소멸합니다 (근로기준법 제49조).
            지금 당장 청구하기 어렵더라도 시효가 지나기 전에 반드시 행동하세요.
          </InfoBox>
        </motion.section>

        {/* ── 섹션 7: 세금 & 주의사항 ── */}
        <motion.section
          id="tax"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">세금 & 주의사항</h2>
          <p className="text-sm text-up-body mb-3 leading-relaxed">
            퇴직금에는 <span className="font-semibold">퇴직소득세</span>가 부과됩니다.
            단, 근속 연수가 길수록 공제액이 커져 실제 세율은 매우 낮습니다.
          </p>
          <div className="bg-up-sunken rounded-lg p-3 text-xs space-y-1.5 text-up-body mb-4">
            <p className="font-bold text-up-navy">근속연수별 퇴직소득 공제 (참고)</p>
            <p>• 5년 이하: 근속연수 × 30만원</p>
            <p>• 5~10년: 150만원 + (근속연수-5) × 50만원</p>
            <p>• 10~20년: 400만원 + (근속연수-10) × 80만원</p>
            <p>• 20년 초과: 1,200만원 + (근속연수-20) × 120만원</p>
            <p className="text-up-strong mt-1">※ 2026년 기준 — 정확한 세액은 홈택스 계산기 이용 권장</p>
          </div>
          <InfoBox title="퇴직금과 실업급여는 별개" variant="tip">
            퇴직금(근로자퇴직급여보장법)과 실업급여(고용보험법)는 완전히 다른 제도입니다.
            조건을 충족하면 둘 다 받을 수 있습니다.
            실업급여 조건 확인 →{' '}
            <Link to="/guide/unemployment" className="text-up-strong underline font-bold">실업급여 가이드</Link>
          </InfoBox>
        </motion.section>

        {/* ── 섹션 8: FAQ ── */}
        <motion.section
          id="faq"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-up-surface rounded-xl p-5 border border-up-hair shadow-card"
        >
          <h2 className="text-[clamp(22px,5.5vw,28px)] font-black text-up-navy mb-4">자주 묻는 질문 10선</h2>
          <div className="space-y-2.5">
            {[
              { q: '일용직도 정말 퇴직금을 받을 수 있나요?', a: '네, 1년 이상·주 15시간 이상 조건만 충족하면 고용 형태에 관계없이 받을 수 있습니다 (근로자퇴직급여보장법 제4조).' },
              { q: '28일 블록 계산이란 무엇인가요?', a: '마지막 근무일부터 28일씩 역순으로 블록을 나누어 블록당 근무일이 8일 이상이면 적격, 적격 블록 합산이 365일 이상이면 퇴직금 자격이 생깁니다.' },
              { q: '3개월 공백이 있으면 퇴직금을 못 받나요?', a: '3개월(90일) 미만 공백은 계속 근로로 인정됩니다. 3개월 이상 공백이면 세그먼트를 나눠 각각 1년 요건을 충족해야 합니다.' },
              { q: '급여명세서가 없어도 계산할 수 있나요?', a: '통장 입금 내역으로 대체 가능합니다. CATCH 수동 입력 계산기를 이용하거나 고용노동부에 근로내역 확인서를 요청하세요.' },
              { q: '회사가 퇴직금을 안 주면 어떻게 하나요?', a: '퇴직 후 14일이 지났는데 지급이 없으면 관할 고용노동부에 진정서를 제출하세요. 형사 처벌(징역 또는 벌금)이 가능합니다.' },
              { q: '퇴직금과 실업급여를 동시에 받을 수 있나요?', a: '네, 퇴직금은 회사, 실업급여는 고용보험에서 지급하므로 각각 조건 충족 시 동시 수령 가능합니다.' },
              { q: '세금을 얼마나 내나요?', a: '퇴직소득세는 근속연수 공제 후 과세합니다. 근속 1~3년의 경우 대부분 세금이 매우 적거나 없습니다. 홈택스 퇴직소득세 계산기로 정확히 확인하세요.' },
              { q: '소멸시효가 지났으면 아무것도 못 받나요?', a: '3년 소멸시효가 지나면 법적 청구가 어렵습니다. 단, 회사 측에서 자발적으로 지급하는 경우가 있으니 포기하지 말고 먼저 연락해 보세요.' },
              { q: '국가 대지급제도는 어떻게 신청하나요?', a: '회사 파산 또는 지급 불능 시 근로복지공단에 체불 임금 대지급을 신청합니다. 근로복지공단 고객센터(1588-0075) 또는 관할 지사에 문의하세요.' },
              { q: 'PDF가 없어도 CATCH 계산기를 쓸 수 있나요?', a: '네, CATCH는 PDF 정밀계산과 수동 입력 간편계산을 모두 지원합니다. 날짜와 금액만 알면 간편계산으로 예상 금액을 확인할 수 있습니다.' },
            ].map((item, i) => (
              <details key={i} className="border border-up-hair rounded-lg p-3">
                <summary className="font-bold text-sm cursor-pointer text-up-navy flex justify-between items-center">
                  <span className="flex-1 pr-2">{item.q}</span>
                  <span className="flex-shrink-0">▼</span>
                </summary>
                <p className="text-xs text-up-sub mt-2 leading-relaxed">{item.a}</p>
              </details>
            ))}
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
            onClick={() => navigate('/severance')}
            className="w-full bg-gradient-to-r from-brand to-brand-strong text-white rounded-xl py-4 font-bold text-base flex items-center justify-center gap-2 hover:shadow-lg transition-all mb-4"
          >
            <Calculator className="w-5 h-5" />
            지금 바로 CATCH로 퇴직금 계산하기
          </button>

          <h3 className="font-bold text-sm text-up-navy mb-3">관련 가이드</h3>
          <div className="space-y-2">
            <GuideCard title="실업급여 가이드" icon="💼" href="/guide/unemployment" />
            <GuideCard title="주휴수당 가이드" icon="⏰" href="/guide/weekly-allowance" />
            <GuideCard title="연차수당 가이드" icon="📅" href="/guide/annual-leave" />
          </div>
        </motion.div>

        {/* ── 가이드 허브로 돌아가기 ── */}
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-2 mb-4"
        >
          <button
            onClick={() => navigate('/guide')}
            className="w-full py-3 rounded-xl border border-up-hair text-sm font-semibold text-up-sub hover:bg-up-sunken transition-colors"
          >
            ← 전체 가이드 목록 보기
          </button>
        </motion.div>

        {/* SEO 내부 링크 메시(P5) — 크롤 가능한 관련 계산기·랜딩 */}
        <RelatedLinks current="/guide/severance" />

      </div>
    </div>
  )
}
