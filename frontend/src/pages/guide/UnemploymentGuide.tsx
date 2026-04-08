import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calculator, ChevronRight } from 'lucide-react'

// ── 섹션 ID 및 목차 ──
const TABLE_OF_CONTENTS = [
  { id: 'definition', label: '실업급여란?' },
  { id: 'conditions', label: '수급 조건' },
  { id: 'amount', label: '수급액 계산' },
  { id: 'period', label: '수급 기간' },
  { id: 'application', label: '신청 방법' },
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
function GuideCard({ title, icon: Icon, href }: { title: string; icon: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      className="block bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-4 hover:shadow-md transition-all"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{Icon}</div>
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
    document.title = '실업급여 가이드 - CATCH'

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
    <div className="relative z-[1] min-h-screen flex flex-col items-center px-4 pt-2 pb-8 bg-gray-50">
      <div className="w-full max-w-[460px] flex flex-col gap-4">

        {/* ── 히어로 섹션 ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-700 p-6 text-white overflow-hidden relative"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -z-10" />
          <h2 className="text-2xl font-black mb-2">퇴직 후 생활을 지켜줘요</h2>
          <p className="text-cyan-100 text-sm mb-4">최대 270일 | 일 수급액 최대 66,000원</p>
          <div className="text-3xl font-black">조건 충족 시 신청 가능</div>
        </motion.div>

        {/* ── 목차 ── */}
        <TableOfContents activeSection={activeSection} />

        {/* ── 섹션: 실업급여란? ── */}
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
            실업급여는 직장을 잃은 근로자의 생활을 지원하는 <span className="font-semibold">고용보험 제도</span>입니다. <br />
            조건을 충족하면 일정 기간 동안 정기적으로 급여를 받을 수 있습니다.
          </p>
          <InfoBox
            title="정의 (고용보험법)"
            variant="default"
          >
            실업급여는 근로자가 실직한 상태에서 <br />
            새로운 직장을 구할 때까지 생활을 지원하는 제도입니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 수급 조건 ── */}
        <motion.section
          id="conditions"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">수급 조건</h2>

          <div className="mb-4">
            <h3 className="font-bold text-sm text-gray-900 mb-3">기본 조건</h3>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">가입 기간</h4>
                  <p className="text-xs text-gray-600 mt-1">최근 18개월 중 180일 이상 고용보험 가입</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">이직 사유</h4>
                  <p className="text-xs text-gray-600 mt-1">비자발적 실직 (해고, 계약 종료 등)</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-600 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">구직 활동</h4>
                  <p className="text-xs text-gray-600 mt-1">성실하게 재취업을 추진해야 함</p>
                </div>
              </div>
            </div>
          </div>

          <InfoBox
            title="일용직 특례 조건"
            variant="tip"
          >
            최종이직일 전 1개월간 10일 미만 근무했다면<br />
            실업급여 수급이 제한될 수 있습니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 수급액 계산 ── */}
        <motion.section
          id="amount"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">수급액 계산</h2>

          <div className="mb-4">
            <h3 className="font-bold text-sm text-gray-900 mb-3">계산 공식</h3>
            <InfoBox
              title="일 수급액 = 이직 전 평균임금 × 60%"
              variant="default"
            >
              <div className="space-y-2 text-xs">
                <p><span className="font-semibold">상한액</span> 66,000원/일</p>
                <p><span className="font-semibold">하한액</span> 최저임금의 80%</p>
              </div>
            </InfoBox>
          </div>

          <div className="mb-4">
            <h3 className="font-bold text-sm text-gray-900 mb-3">계산 예시</h3>
            <div className="bg-cyan-50 rounded-lg p-3 text-xs space-y-1 text-gray-700">
              <p>• 월 급여: 200만원</p>
              <p>• 평균임금: 200만원</p>
              <p>• 60% 계산: 200만원 × 60% = 120만원</p>
              <p>• 일 수급액: 120만원 ÷ 30일 = 40,000원</p>
              <p className="font-bold text-cyan-700 pt-2">
                → 상한액 66,000원 미만이므로 40,000원/일 수급
              </p>
            </div>
          </div>

          <InfoBox
            title="⚠️ 추가 수입 발생 시"
            variant="warning"
          >
            실업급여 수급 중 구직활동비나 임시 수입이 있으면<br />
            신고해야 합니다. 미신고 시 환수 대상이 될 수 있습니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 수급 기간 ── */}
        <motion.section
          id="period"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">수급 기간</h2>

          <div className="mb-4 text-sm text-gray-700">
            <p className="mb-3">수급 기간은 <span className="font-bold">나이와 가입 기간</span>에 따라 다릅니다.</p>
          </div>

          <div className="space-y-2 mb-4">
            <div className="bg-cyan-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-gray-900 mb-1">30세 미만</p>
              <p className="text-gray-600">가입 1~5년: 90일 / 5~10년: 120일 / 10년~: 150일</p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-gray-900 mb-1">30~50세 미만</p>
              <p className="text-gray-600">가입 1~5년: 120일 / 5~10년: 150일 / 10년~: 180일</p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-3 text-xs">
              <p className="font-bold text-gray-900 mb-1">50세 이상</p>
              <p className="text-gray-600">가입 1~5년: 150일 / 5~10년: 210일 / 10년~: 270일</p>
            </div>
          </div>

          <InfoBox
            title="💡 최대 수급액"
            variant="tip"
          >
            최대 수급액 = 일 수급액 × 수급 일수<br />
            예) 40,000원 × 270일 = 1,080만원
          </InfoBox>
        </motion.section>

        {/* ── 섹션: 신청 방법 ── */}
        <motion.section
          id="application"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">신청 방법</h2>

          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 text-sm font-bold flex items-center justify-center flex-shrink-0">1</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">워크넷 사전등록</h4>
                <p className="text-xs text-gray-600 mt-1">워크넷(www.worknet.go.kr)에 구직자로 등록</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 text-sm font-bold flex items-center justify-center flex-shrink-0">2</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">고용센터 방문</h4>
                <p className="text-xs text-gray-600 mt-1">주소지 관할 고용센터에 신청 (퇴직 후 12개월 이내)</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 text-sm font-bold flex items-center justify-center flex-shrink-0">3</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">필요 서류</h4>
                <p className="text-xs text-gray-600 mt-1">이직확인서, 신분증, 통장 사본</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 text-sm font-bold flex items-center justify-center flex-shrink-0">4</div>
              <div>
                <h4 className="font-bold text-sm text-gray-900">구직활동 및 수급</h4>
                <p className="text-xs text-gray-600 mt-1">주 1회 이상 구직활동 필수, 신청 후 7일 이내 지급 시작</p>
              </div>
            </div>
          </div>

          <InfoBox
            title="⏰ 신청 기간"
            variant="warning"
          >
            퇴직일로부터 <span className="font-bold">12개월 이내</span>에 신청해야 합니다.<br />
            기한을 놓치면 수급할 수 없습니다.
          </InfoBox>
        </motion.section>

        {/* ── 섹션: FAQ ── */}
        <motion.section
          id="faq"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="bg-white rounded-xl p-5"
        >
          <h2 className="text-xl font-black text-gray-900 mb-4">자주 묻는 질문</h2>
          <div className="space-y-3">
            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                180일을 정확히 어떻게 계산하나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">최근 18개월(540일) 중 고용보험료를 낸 일수가 180일 이상이면 됩니다. 고용센터에서 확인해줍니다.</p>
            </details>

            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                자발적 퇴직도 받을 수 있나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">원칙적으로 불가입니다. 다만 정당한 사유(임금 체불, 안전 미흡 등)가 있으면 예외적으로 인정될 수 있습니다.</p>
            </details>

            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                신청 후 언제부터 받나요?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">신청 후 7일 이내에 지급이 시작됩니다. 다만 심사 기간이 필요할 수 있습니다.</p>
            </details>

            <details className="border border-gray-200 rounded-lg p-3">
              <summary className="font-bold text-sm cursor-pointer text-gray-900 flex justify-between items-center">
                여러 회사에서 일했으면?
                <span>▼</span>
              </summary>
              <p className="text-xs text-gray-600 mt-2">최종이직일 기준으로 과거 18개월 기간의 모든 가입 기간을 합산합니다. 각 회사의 가입 기록이 필요합니다.</p>
            </details>
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
            지금 바로 실업급여 계산하기
          </button>

          <h3 className="font-bold text-sm text-gray-900 mb-3">다른 가이드</h3>
          <div className="space-y-2">
            <GuideCard
              title="퇴직금 가이드"
              icon="💼"
              href="/guide/severance"
            />
            <GuideCard
              title="주휴수당 가이드"
              icon="⏰"
              href="/guide/weekly-allowance"
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
            className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← 전체 가이드 목록 보기
          </button>
        </motion.div>

      </div>
    </div>
  )
}
