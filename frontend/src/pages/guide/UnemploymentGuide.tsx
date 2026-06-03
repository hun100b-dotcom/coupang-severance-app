import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calculator, ChevronRight } from 'lucide-react'
import PageMeta from '../../components/PageMeta'

// ── Article JSON-LD (구글 기사 리치 스니펫) ──
const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '쿠팡 일용직 실업급여 계산기 | 2026년 최신 기준 완전정복',
  description: '쿠팡·CFS 일용직 실업급여 수급 조건(180일), 2026년 상한액/하한액, 신청 절차를 단계별로 완전 정리했습니다.',
  author: { '@type': 'Organization', name: 'CATCH' },
  publisher: {
    '@type': 'Organization',
    name: 'CATCH',
    logo: { '@type': 'ImageObject', url: 'https://catch-daily-worker.vercel.app/catch-logo.png' },
  },
  datePublished: '2026-04-10',
  dateModified: '2026-04-10',
  mainEntityOfPage: { '@type': 'WebPage', '@id': 'https://catch-daily-worker.vercel.app/guide/unemployment' },
}

// ── HowTo JSON-LD (단계별 신청 방법) ──
const HOW_TO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: '일용직 실업급여 신청 방법',
  description: '쿠팡 일용직 근로자가 실업급여를 신청하는 단계별 방법입니다.',
  step: [
    {
      '@type': 'HowToStep',
      name: '1단계: 피보험단위기간 확인',
      text: '최근 18개월 중 고용보험 가입 일수가 180일 이상인지 확인합니다. 여러 사업장 기간을 합산할 수 있습니다.',
    },
    {
      '@type': 'HowToStep',
      name: '2단계: 워크넷 구직등록',
      text: '워크넷(www.worknet.go.kr)에 구직자로 먼저 등록해야 합니다. 이를 완료해야 고용센터 방문이 가능합니다.',
    },
    {
      '@type': 'HowToStep',
      name: '3단계: 고용센터 방문 신청',
      text: '주소지 관할 고용센터에 방문해 이직확인서, 신분증, 통장 사본을 제출합니다. 퇴직 후 12개월 이내에 신청해야 합니다.',
    },
    {
      '@type': 'HowToStep',
      name: '4단계: 구직활동 및 수급',
      text: '수급 기간 중 매 4주마다 고용센터에 실업 인정을 신청하고, 주 1회 이상 구직활동을 해야 합니다.',
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
      name: '일용직 근로자도 실업급여를 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 받을 수 있습니다. 최근 18개월 중 고용보험 가입 기간이 180일 이상이고, 비자발적으로 이직했다면 일용직도 실업급여 수급 자격이 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '실업급여 180일은 어떻게 계산하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '최근 18개월(540일) 중 고용보험료를 납부한 근무일수가 180일 이상이면 됩니다. 여러 사업장의 가입 기간도 합산됩니다. 정확한 가입 이력은 고용센터 또는 근로복지공단에서 확인할 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '자발적으로 퇴직해도 실업급여를 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '원칙적으로 자발적 퇴직은 실업급여 수급이 불가합니다. 다만 임금 체불, 직장 내 괴롭힘, 근로조건 일방 변경 등 정당한 사유가 있다면 예외적으로 인정될 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '여러 회사에서 일용직으로 근무했는데 합산되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 합산됩니다. 최종이직일 기준으로 과거 18개월 기간 내 모든 사업장의 고용보험 가입 기간이 합산됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '2026년 실업급여 상한액은 얼마인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '2026년 실업급여 1일 상한액은 68,100원입니다 (2019년 이후 7년 만에 인상). 실제 수급액이 상한액을 초과하면 68,100원으로 제한됩니다. 하한액은 2026년 최저임금(10,320원) × 80% × 8시간 = 66,048원/일입니다.',
      },
    },
    {
      '@type': 'Question',
      name: '일용직 실업급여 신청 시 특별히 주의할 점은?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '일용직의 경우 최종이직일 전 1개월간 10일 미만 근무했는지 확인해야 합니다. 이 조건을 충족하지 못하면 수급이 제한될 수 있습니다. 또한 이직확인서는 마지막 사업주에게 요청해야 합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '실업급여를 반복해서 받으면 감액되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 2019년 개정으로 반복 수급 시 감액 규정이 생겼습니다. 5년간 3회 이상 실업급여를 받으면 최대 50%까지 감액될 수 있습니다. 10년간 5회 이상이면 더 큰 폭으로 감액됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '실업급여 신청 기한이 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직일로부터 12개월 이내에 신청해야 합니다. 12개월이 지나면 남은 수급 기간이 있어도 수급할 수 없으니, 퇴직 후 가능한 빨리 신청하세요.',
      },
    },
    {
      '@type': 'Question',
      name: '수급 중 알바를 하면 실업급여가 끊기나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '수급 중 근로를 하면 반드시 고용센터에 신고해야 합니다. 1일 4시간 이상 근무하거나 월 60만원 이상 소득 발생 시 해당 기간 수급이 정지됩니다. 미신고 시 부정 수급으로 환수 대상이 됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '이직확인서를 회사가 안 주면 어떻게 하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '고용보험법 제62조에 따라 사업주는 근로자 요청 시 10일 이내 이직확인서를 제출해야 합니다. 거부 시 과태료 처분 대상입니다. 고용센터에 직접 신청서를 제출하면 고용센터가 사업주에게 제출을 요청합니다.',
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
    { '@type': 'ListItem', position: 3, name: '실업급여 가이드', item: 'https://catch-daily-worker.vercel.app/guide/unemployment' },
  ],
}

// ── 섹션 ID 및 목차 ──
const TABLE_OF_CONTENTS = [
  { id: 'definition',   label: '실업급여란?' },
  { id: 'conditions',   label: '수급 조건' },
  { id: 'amount',       label: '2026년 수급액' },
  { id: 'period',       label: '수급 기간 표' },
  { id: 'application',  label: '신청 방법' },
  { id: 'repeat',       label: '반복 수급 감액' },
  { id: 'cautions',     label: '주의사항' },
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
    default: 'bg-cyan-50 border-cyan-200',
    warning: 'bg-amber-50 border-amber-200',
    tip: 'bg-green-50 border-green-200',
  }
  return (
    <div className={`border-l-4 ${variant === 'warning' ? 'border-amber-500' : variant === 'tip' ? 'border-green-500' : 'border-cyan-500'} ${variantStyles[variant]} rounded-lg p-4 mb-4`}>
      <h4 className="font-bold text-sm mb-2 text-gray-900">{title}</h4>
      <div className="text-sm text-gray-700">{children}</div>
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
      className="bg-white border border-gray-200 rounded-lg p-4 mb-6 sticky top-4 z-20"
    >
      <button
        onClick={() => setShowContents(!showContents)}
        className="w-full text-left font-bold text-gray-900 flex items-center justify-between mb-2"
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
                  ? 'bg-cyan-100 text-cyan-700 font-semibold'
                  : 'text-gray-600 hover:text-cyan-600'
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
    <a
      href={href}
      className="block bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{icon}</div>
        <div>
          <h4 className="font-bold text-sm text-gray-900">{title}</h4>
          <p className="text-xs text-gray-600 mt-1">가이드 보기</p>
        </div>
        <ChevronRight className="w-4 h-4 text-cyan-600 ml-auto" />
      </div>
    </a>
  )
}

// ── 메인 페이지 ──
export default function UnemploymentGuide() {
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
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-2 pb-8 bg-white">{/* bg-white: blob 완전 차단 */}
      {/* ── SEO 메타태그: title, description, canonical, JSON-LD 구조화 데이터 ── */}
      <PageMeta
        title="쿠팡 일용직 실업급여 계산기 | 2026년 최신 기준 완전정복 | CATCH"
        description="쿠팡·CFS 일용직 실업급여 수급 조건(180일), 2026년 상한액 68,100원/일, 신청 절차까지 단계별로 완전 정리. 퇴직 후 12개월 이내 신청 필수."
        canonical="https://catch-daily-worker.vercel.app/guide/unemployment"
        jsonLd={[ARTICLE_SCHEMA, HOW_TO_SCHEMA, FAQ_SCHEMA, BREADCRUMB_SCHEMA]}
      />

      <div className="w-full max-w-[460px] flex flex-col gap-4">

        {/* ── 히어로 섹션 ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-700 p-6 text-white overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-10" />
          {/* H1 — SEO 타겟 키워드 포함 */}
          <h1 className="text-xl font-black mb-1 leading-tight">쿠팡 일용직 실업급여 계산기</h1>
          <p className="text-cyan-100 text-sm mb-3">2026년 최신 기준 완전정복</p>
          <div className="flex gap-2 flex-wrap text-xs">
            <span className="bg-white/20 rounded-full px-2.5 py-1 font-bold">최대 270일</span>
            <span className="bg-white/20 rounded-full px-2.5 py-1 font-bold">1일 상한 68,100원</span>
            <span className="bg-white/20 rounded-full px-2.5 py-1 font-bold">신청기한 12개월</span>
          </div>
          <p className="text-cyan-200 text-[11px] mt-3">마지막 업데이트: 2026-04-10</p>
        </motion.div>

        {/* ── 목차 ── */}
        <TableOfContents activeSection={activeSection} />

        {/* ── 섹션 1: 실업급여란? ── */}
        <motion.section
          id="definition"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">실업급여란?</h2>
          <p className="text-sm text-gray-700 mb-4 leading-relaxed">
            실업급여는 비자발적으로 직장을 잃은 근로자가 재취업 활동을 하는 동안
            생활비를 지원받는 <span className="font-semibold">고용보험 제도</span>입니다.
            <br /><br />
            정확히는 <span className="font-semibold">구직급여</span>라 불리며,
            고용보험법에 따라 고용보험에 가입된 근로자라면 일용직도 받을 수 있습니다.
          </p>
          <InfoBox title="실업급여 구성" variant="default">
            <ul className="text-xs space-y-1">
              <li>• <span className="font-semibold">구직급여</span>: 퇴직 후 재취업 기간 동안 지급 (흔히 '실업급여'로 불림)</li>
              <li>• <span className="font-semibold">취업촉진수당</span>: 조기 재취업 시 남은 수급 기간 일부를 일시에 지급</li>
              <li>• <span className="font-semibold">연장급여</span>: 취업 어려움 인정 시 수급 기간 연장 가능</li>
            </ul>
          </InfoBox>
          <p className="text-sm text-gray-700 leading-relaxed">
            퇴직금과 달리 실업급여는 회사가 아닌 <span className="font-semibold">고용보험기금</span>에서 지급합니다.
            따라서 퇴직금과 실업급여는 별개로 둘 다 받을 수 있습니다.
          </p>
        </motion.section>

        {/* ── 섹션 2: 수급 조건 ── */}
        <motion.section
          id="conditions"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">수급 조건</h2>

          <h3 className="font-bold text-sm text-gray-900 mb-3">기본 3가지 조건</h3>
          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">피보험단위기간 180일 이상</h4>
                <p className="text-xs text-gray-600 mt-1">
                  최근 18개월(540일) 중 고용보험 가입 일수가 <span className="font-semibold">180일 이상</span>이어야 합니다.
                  여러 사업장의 기간을 합산할 수 있습니다.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">비자발적 이직 (실직)</h4>
                <p className="text-xs text-gray-600 mt-1">
                  해고, 계약 만료, 권고사직 등 비자발적 사유여야 합니다.
                  자발적 사직의 경우 임금 체불·직장 내 괴롭힘 등 정당한 사유가 있으면 예외 인정됩니다.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">적극적 구직 활동</h4>
                <p className="text-xs text-gray-600 mt-1">
                  수급 기간 중 성실하게 재취업 활동을 해야 합니다.
                  4주마다 고용센터에 실업 인정 신청을 해야 수급이 유지됩니다.
                </p>
              </div>
            </div>
          </div>

          <InfoBox title="일용직 특례 조건 (중요)" variant="warning">
            <p className="text-xs leading-relaxed">
              일용직의 경우 <span className="font-semibold">최종이직일 전 1개월간 근무일수가 10일 미만</span>이어야 합니다.
              쿠팡·CFS의 경우 마지막 달에 많이 일하지 않은 상태여야 수급 조건을 충족합니다.
              이 조건은 일반 근로자에게는 없는 일용직 특수 요건입니다.
            </p>
          </InfoBox>
        </motion.section>

        {/* ── 섹션 3: 2026년 수급액 ── */}
        <motion.section
          id="amount"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">2026년 수급액 계산</h2>

          <InfoBox title="1일 구직급여액 = 이직 전 평균임금 × 60%" variant="default">
            <div className="space-y-2 text-xs">
              <p><span className="font-semibold">2026년 상한액</span>: <span className="text-cyan-700 font-bold">68,100원/일</span> (2026년 인상)</p>
              <p><span className="font-semibold">2026년 하한액</span>: 최저임금(10,320원) × 80% × 8시간 = <span className="font-bold">66,048원/일</span></p>
            </div>
          </InfoBox>

          <h3 className="font-bold text-sm text-gray-900 mb-2 mt-2">계산 예시</h3>
          <div className="bg-cyan-50 rounded-lg p-3 text-xs space-y-1.5 text-gray-700 mb-4">
            <p>• 퇴직 전 3개월 평균 월급: 200만원</p>
            <p>• 1일 평균임금: 200만원 ÷ 30일 ≈ 66,667원</p>
            <p>• 60% 적용: 66,667원 × 60% = 40,000원</p>
            <p className="font-bold text-cyan-700 pt-1.5 border-t border-cyan-200">
              → 40,000원/일 수급 (상한액 68,100원 미만이므로 그대로 적용)
            </p>
          </div>

          <div className="bg-cyan-50 rounded-lg p-3 text-xs space-y-1.5 text-gray-700">
            <p className="font-bold text-gray-900">고임금 근로자 예시</p>
            <p>• 퇴직 전 월급: 350만원</p>
            <p>• 1일 평균임금: 350만원 ÷ 30일 ≈ 116,667원</p>
            <p>• 60% 적용: 116,667원 × 60% = 70,000원</p>
            <p className="font-bold text-cyan-700 pt-1.5 border-t border-cyan-200">
              → 상한액 68,100원 초과 → <span className="font-bold">68,100원/일</span> 적용
            </p>
          </div>
        </motion.section>

        {/* ── 섹션 4: 수급 기간 표 ── */}
        <motion.section
          id="period"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">수급 기간 (나이·가입 기간별)</h2>
          <p className="text-sm text-gray-700 mb-3 leading-relaxed">
            수급 기간은 <span className="font-semibold">나이와 피보험기간(고용보험 가입 기간)</span>에 따라 다릅니다.
          </p>

          <div className="space-y-2 mb-4">
            <div className="bg-cyan-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-gray-900 mb-2">30세 미만</p>
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="bg-white rounded p-1"><p className="text-[10px] text-gray-500">1~3년</p><p className="font-bold text-cyan-700">90일</p></div>
                <div className="bg-white rounded p-1"><p className="text-[10px] text-gray-500">3~5년</p><p className="font-bold text-cyan-700">90일</p></div>
                <div className="bg-white rounded p-1"><p className="text-[10px] text-gray-500">5~10년</p><p className="font-bold text-cyan-700">120일</p></div>
              </div>
            </div>
            <div className="bg-cyan-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-gray-900 mb-2">30~50세 미만</p>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="bg-white rounded p-1"><p className="text-[10px] text-gray-500">1~3년</p><p className="font-bold text-cyan-700">90일</p></div>
                <div className="bg-white rounded p-1"><p className="text-[10px] text-gray-500">3~5년</p><p className="font-bold text-cyan-700">120일</p></div>
                <div className="bg-white rounded p-1"><p className="text-[10px] text-gray-500">5~10년</p><p className="font-bold text-cyan-700">150일</p></div>
                <div className="bg-white rounded p-1"><p className="text-[10px] text-gray-500">10년~</p><p className="font-bold text-cyan-700">180일</p></div>
              </div>
            </div>
            <div className="bg-cyan-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-gray-900 mb-2">50세 이상 / 장애인</p>
              <div className="grid grid-cols-4 gap-1 text-center">
                <div className="bg-white rounded p-1"><p className="text-[10px] text-gray-500">1~3년</p><p className="font-bold text-cyan-700">120일</p></div>
                <div className="bg-white rounded p-1"><p className="text-[10px] text-gray-500">3~5년</p><p className="font-bold text-cyan-700">150일</p></div>
                <div className="bg-white rounded p-1"><p className="text-[10px] text-gray-500">5~10년</p><p className="font-bold text-cyan-700">210일</p></div>
                <div className="bg-white rounded p-1"><p className="text-[10px] text-gray-500">10년~</p><p className="font-bold text-cyan-700">270일</p></div>
              </div>
            </div>
          </div>

          <InfoBox title="최대 수급 총액 계산" variant="tip">
            <p className="text-xs">예) 30대, 가입 2년, 일급 40,000원 → 120일 수급</p>
            <p className="text-xs font-bold text-green-700 mt-1">40,000원 × 120일 = 480만원</p>
            <p className="text-xs mt-1 text-gray-600">※ 이 금액이 실제 생활비로 지원됩니다</p>
          </InfoBox>
        </motion.section>

        {/* ── 섹션 5: 신청 방법 ── */}
        <motion.section
          id="application"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">신청 방법 (단계별)</h2>

          <div className="space-y-3 mb-4">
            {[
              {
                step: '1', color: 'bg-cyan-100 text-cyan-600',
                title: '워크넷 구직등록',
                desc: '워크넷(www.worknet.go.kr)에 먼저 구직자 등록을 완료하세요. 미등록 시 고용센터 방문이 불가합니다.',
              },
              {
                step: '2', color: 'bg-cyan-100 text-cyan-600',
                title: '이직확인서 요청',
                desc: '마지막 사업주(쿠팡/CFS)에게 이직확인서 발급을 요청합니다. 거부 시 고용센터에 신청하면 대신 요청해 줍니다.',
              },
              {
                step: '3', color: 'bg-cyan-100 text-cyan-600',
                title: '고용센터 방문 신청',
                desc: '주소지 관할 고용센터에 이직확인서 + 신분증 + 통장 사본을 가져가 신청합니다. 퇴직 후 12개월 이내여야 합니다.',
              },
              {
                step: '4', color: 'bg-cyan-100 text-cyan-600',
                title: '수급자격 결정 면접',
                desc: '고용센터에서 수급자격 인정 여부를 심사합니다. 통상 1~2주 내 결정됩니다.',
              },
              {
                step: '5', color: 'bg-cyan-100 text-cyan-600',
                title: '구직활동 및 실업 인정',
                desc: '매 4주마다 구직활동 증명을 제출하고 실업 인정을 받으면 수급일 7일 이내에 급여가 지급됩니다.',
              },
            ].map(item => (
              <div key={item.step} className="flex gap-3">
                <div className={`w-8 h-8 rounded-full ${item.color} text-sm font-bold flex items-center justify-center flex-shrink-0`}>{item.step}</div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-600 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <InfoBox title="⏰ 신청 기한: 퇴직 후 12개월 이내" variant="warning">
            퇴직일로부터 <span className="font-bold">12개월</span>이 지나면 남은 수급 기간이 있어도
            더 이상 받을 수 없습니다. 가능한 빨리 신청하세요.
          </InfoBox>
        </motion.section>

        {/* ── 섹션 6: 반복 수급 감액 ── */}
        <motion.section
          id="repeat"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">반복 수급 감액 규정</h2>
          <p className="text-sm text-gray-700 mb-3 leading-relaxed">
            2019년 고용보험법 개정으로 <span className="font-semibold">반복 수급 시 감액</span> 규정이 도입됐습니다.
            자주 퇴직을 반복하며 실업급여를 받으면 지급액이 줄어듭니다.
          </p>
          <div className="space-y-2 mb-4">
            <div className="bg-amber-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-amber-800 mb-1">5년간 3회: 최대 10% 감액</p>
              <p className="text-amber-700">5년 이내에 3번 이상 실업급여를 수급하면 세 번째부터 10%가 감액됩니다.</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-amber-800 mb-1">5년간 4회: 최대 25% 감액</p>
              <p className="text-amber-700">네 번째 수급부터 25%가 감액됩니다.</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-amber-800 mb-1">5년간 5회 이상: 최대 50% 감액</p>
              <p className="text-amber-700">다섯 번째 이상 수급부터 최대 50%까지 감액됩니다.</p>
            </div>
          </div>
          <InfoBox title="쿠팡 일용직은 해당 가능성 낮음" variant="tip">
            쿠팡·CFS 일용직의 경우 퇴직 후 장기 구직 기간을 갖는 경우가 많아
            반복 수급 감액이 적용되는 경우는 많지 않습니다.
            단, 해마다 계약이 반복되어 여러 번 수급했다면 이력을 확인하세요.
          </InfoBox>
        </motion.section>

        {/* ── 섹션 7: 주의사항 ── */}
        <motion.section
          id="cautions"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">꼭 알아야 할 주의사항</h2>
          <div className="space-y-3">
            <InfoBox title="수급 중 근로 시 반드시 신고" variant="warning">
              <p className="text-xs leading-relaxed">
                수급 기간 중 알바나 임시 근로를 하면 <span className="font-semibold">반드시 고용센터에 신고</span>해야 합니다.
                1일 4시간 이상 근무 또는 월 60만원 이상 소득 발생 시 해당 기간 수급이 정지됩니다.
                미신고 시 부정 수급으로 환수 + 추가 제재를 받습니다.
              </p>
            </InfoBox>
            <InfoBox title="퇴직금과 실업급여는 동시 수령 가능" variant="tip">
              <p className="text-xs leading-relaxed">
                퇴직금(사용자 지급)과 실업급여(고용보험 지급)는 별개 제도입니다.
                둘 다 조건을 충족하면 동시에 받을 수 있습니다.
                퇴직금 계산 →{' '}
                <a href="/guide/severance" className="text-cyan-600 underline font-bold">퇴직금 가이드</a>
              </p>
            </InfoBox>
            <InfoBox title="온라인 신청 가능 (고용24)" variant="default">
              <p className="text-xs leading-relaxed">
                고용24(www.work24.go.kr)에서 온라인 신청이 가능하나,
                처음 신청 시에는 고용센터 방문이 원칙입니다.
                이후 계속 수급 신청은 온라인으로 가능합니다.
              </p>
            </InfoBox>
          </div>
        </motion.section>

        {/* ── 섹션 8: FAQ ── */}
        <motion.section
          id="faq"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">자주 묻는 질문 10선</h2>
          <div className="space-y-2.5">
            {[
              { q: '일용직도 실업급여를 받을 수 있나요?', a: '네, 최근 18개월 중 180일 이상 고용보험 가입 + 비자발적 이직 조건을 충족하면 받을 수 있습니다.' },
              { q: '180일을 어떻게 확인하나요?', a: '고용센터 방문 또는 고용24(work24.go.kr)에서 본인 피보험이력을 조회할 수 있습니다.' },
              { q: '2026년 1일 상한액은 얼마인가요?', a: '2026년 기준 1일 상한액은 68,100원입니다 (2019년 이후 7년 만에 인상). 하한액은 최저임금(10,320원) × 80% × 8시간 = 66,048원/일입니다.' },
              { q: '자발적으로 그만뒀는데 받을 수 있나요?', a: '원칙적으로 불가하지만 임금 체불, 직장 내 괴롭힘, 근로조건 불이익 변경 등 정당한 사유가 있으면 예외 인정됩니다.' },
              { q: '최종이직일 전 1개월 10일 미만 조건이란?', a: '일용직은 마지막으로 퇴직하기 1개월 전 한 달 동안 근무일수가 10일 미만이어야 합니다. 이 조건 미충족 시 수급이 제한됩니다.' },
              { q: '이직확인서를 회사가 안 주면?', a: '고용보험법 제62조 위반으로 과태료 처분 대상입니다. 고용센터에 이직확인서 발급 요청을 대신해 달라고 신청하세요.' },
              { q: '수급 중 알바를 하면 어떻게 되나요?', a: '고용센터에 신고해야 합니다. 1일 4시간 이상이면 해당일 수급 정지, 월 60만원 이상 소득이면 수급 일부 감액됩니다. 미신고 시 부정 수급으로 환수됩니다.' },
              { q: '반복 수급하면 감액되나요?', a: '5년간 3회 이상 수급 시 세 번째부터 최대 50%까지 감액됩니다 (2019년 개정 고용보험법).' },
              { q: '퇴직금과 실업급여를 동시에 받을 수 있나요?', a: '네, 완전히 별개 제도입니다. 퇴직금은 회사에서, 실업급여는 고용보험에서 지급하므로 둘 다 수령 가능합니다.' },
              { q: '신청 기한을 놓치면 어떻게 되나요?', a: '퇴직 후 12개월이 지나면 남은 수급 기간이 있어도 받을 수 없습니다. 퇴직 직후 가능한 빨리 신청하세요.' },
            ].map((item, i) => (
              <details key={i} className="border border-gray-200 rounded-lg p-3">
                <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                  <span className="flex-1 pr-2">{item.q}</span>
                  <span className="flex-shrink-0">▼</span>
                </summary>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </motion.section>

        {/* ── 하단 CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl p-5 mt-2"
        >
          <button
            onClick={() => navigate('/unemployment')}
            className="w-full bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl py-4 font-bold text-base flex items-center justify-center gap-2 hover:shadow-lg transition-all mb-4"
          >
            <Calculator className="w-5 h-5" />
            지금 바로 CATCH로 실업급여 계산하기
          </button>

          <h3 className="font-bold text-sm text-gray-900 mb-3">관련 가이드</h3>
          <div className="space-y-2">
            <GuideCard title="퇴직금 가이드" icon="💼" href="/guide/severance" />
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
            className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← 전체 가이드 목록 보기
          </button>
        </motion.div>

      </div>
    </div>
  )
}
