// 쿠팡 알바 퇴직금 받는 법 — 롱테일 SEO 랜딩 페이지
// 검색어: "쿠팡 알바 퇴직금 받는 법", "쿠팡 알바 퇴직금", "쿠팡 파트타임 퇴직금"
// 목적: 검색 유입 → 퇴직금 계산기 전환

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calculator, ChevronRight, CheckCircle, AlertTriangle, Clock, FileText, HelpCircle } from 'lucide-react'
import PageMeta from '../../components/PageMeta'

// ── FAQ JSON-LD (구글 FAQ 리치 스니펫: 검색결과에 Q&A 박스로 노출되는 구조화 데이터) ──
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '쿠팡 알바도 퇴직금을 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 받을 수 있습니다. "알바"라는 호칭과 관계없이 ① 같은 사업장(쿠팡/CFS 동일 물류센터)에서 ② 1년(365일) 이상 근무하고 ③ 최근 4주 평균 주 15시간 이상 근무했다면 퇴직금 청구 권리가 있습니다. 근로자퇴직급여보장법 제4조가 근거입니다.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 알바 퇴직금은 어떻게 신청하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '① CATCH 계산기로 예상 퇴직금 확인 → ② 퇴직금 지급 내용증명 발송(우체국 내용증명) → ③ 14일 이내 미지급 시 고용노동부 민원마당(moel.go.kr) 진정 접수. 접수 후 근로감독관이 사업주를 조사합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡에서 1년 이상 일했는데 퇴직금을 안 준다고 합니다. 어떻게 하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직금 미지급은 근로기준법 위반입니다. 고용노동부 민원마당(moel.go.kr) → 민원신청 → 임금 체불 진정으로 신고하세요. 근로감독관이 퇴직금 지급을 강제할 수 있습니다. 회사 파산 시에는 체당금(국가 대지급제도)을 이용할 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '퇴직금 계산에 필요한 서류는 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '① 급여명세서(PDF) — 쿠팡 앱 또는 고용24에서 다운로드 ② 근로계약서 ③ 출근 기록(없으면 근무 일정 캡처 등). CATCH 계산기에 PDF를 업로드하면 서류 없이도 자동 분석이 가능합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 알바 퇴직금 소멸시효는 언제까지인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직금 청구권 소멸시효는 퇴직일로부터 3년입니다(근로기준법 제49조). 3년이 지나면 법적으로 청구가 불가능하니 지금 바로 확인하세요.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 알바 퇴직금 평균 수령액은 얼마인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '쿠팡 일용직 퇴직금 평균 수령액은 약 150만~300만 원 수준입니다. 정확한 금액은 근무 기간, 평균 임금에 따라 달라집니다. CATCH 계산기에 PDF를 업로드하면 3분 안에 내 퇴직금을 정확히 계산할 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '1년 미만 근무자도 퇴직금을 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '1년(365일) 미만 근무는 퇴직금 대상이 아닙니다. 그러나 1년 미만 근무자도 ① 주휴수당 ② 연차수당 ③ 실업급여(조건 충족 시)를 받을 수 있습니다. CATCH에서 모두 한 번에 확인 가능합니다.',
      },
    },
  ],
}

// ── Article JSON-LD (기사 형태 콘텐츠 페이지임을 구글에 알림) ──
const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '쿠팡 알바 퇴직금 받는 법 — 2026년 신청 완전 가이드',
  description: '쿠팡·CFS 알바·일용직의 퇴직금 수급 조건, 계산 방법, 신청 절차를 단계별로 안내합니다.',
  author: { '@type': 'Organization', name: 'CATCH' },
  publisher: {
    '@type': 'Organization',
    name: 'CATCH',
    logo: { '@type': 'ImageObject', url: 'https://catch-daily-worker.vercel.app/catch-logo.png' },
  },
  datePublished: '2026-05-24',
  dateModified: '2026-05-24',
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://catch-daily-worker.vercel.app/coupang-part-time-severance-method',
  },
}

// ── 신청 단계 ────────────────────────────────────────────────
const STEPS = [
  { step: '1', title: '수급 조건 확인', desc: '1년 이상 근무 + 주 15시간 이상 → 조건 충족 시 청구 가능' },
  { step: '2', title: '예상 금액 계산', desc: 'CATCH 계산기에 PDF 업로드 → 3분 만에 정확한 금액 확인' },
  { step: '3', title: '내용증명 발송', desc: '우체국에서 퇴직금 청구 내용증명을 회사 앞으로 발송' },
  { step: '4', title: '미지급 시 진정', desc: '14일 이내 미지급 → 고용노동부 민원마당 진정 접수' },
]

// ── 자격 조건 ────────────────────────────────────────────────
const CONDITIONS = [
  { ok: true, text: '같은 사업장(쿠팡/CFS 동일 센터)에서 1년(365일) 이상 근무' },
  { ok: true, text: '최근 4주 평균 주 15시간 이상 근무' },
  { ok: true, text: '자발적 퇴사·계약 만료·권고사직 모두 해당' },
  { ok: false, text: '1년 미만 근무 → 퇴직금 미해당 (주휴수당·연차는 가능)' },
]

export default function CoupangPartTimeSeverance() {
  const navigate = useNavigate()

  return (
    <>
      {/* SEO 메타태그 + JSON-LD (검색결과 타이틀·설명·구조화데이터 결정) */}
      <PageMeta
        title="쿠팡 알바 퇴직금 받는 법 | 2026년 신청 완전 가이드 — CATCH"
        description="쿠팡·CFS 알바·일용직 퇴직금 수급 조건(1년 이상·주 15시간), 계산 방법, 신청 절차를 단계별로 안내합니다. 무료 계산기로 내 퇴직금을 3분 안에 확인하세요."
        canonical="https://catch-daily-worker.vercel.app/coupang-part-time-severance-method"
        jsonLd={[FAQ_SCHEMA, ARTICLE_SCHEMA]}
      />

      <div className="min-h-screen bg-[#F2F4F6] pb-20">
        {/* ── 헤더 히어로 섹션 ── */}
        <div className="bg-gradient-to-br from-[#3182f6] to-[#1d4ed8] px-4 pt-12 pb-10 text-white">
          <motion.div
            className="max-w-lg mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* 뱃지 */}
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
              쿠팡·CFS 알바·일용직 전용
            </span>

            {/* H1 — 주 타깃 키워드 배치 */}
            <h1 className="text-2xl font-bold leading-snug mb-3">
              쿠팡 알바 퇴직금 받는 법<br />
              <span className="text-yellow-300">2026년 신청 완전 가이드</span>
            </h1>

            <p className="text-white/85 text-sm leading-relaxed mb-6">
              "알바"라는 호칭과 관계없이 1년 이상·주 15시간 이상 근무했다면
              퇴직금을 받을 권리가 있습니다. 아래 단계를 따라 바로 신청하세요.
            </p>

            <button
              onClick={() => navigate('/severance')}
              className="flex items-center gap-2 bg-white text-[#3182f6] font-bold px-6 py-3 rounded-full text-sm shadow-lg hover:shadow-xl transition-all"
            >
              <Calculator className="w-4 h-4" />
              무료로 퇴직금 계산하기
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* ── 본문 컨텐츠 ── */}
        <div className="max-w-lg mx-auto px-4 mt-6 space-y-5">

          {/* 수급 조건 */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* H2 */}
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              쿠팡 알바 퇴직금 수급 조건
            </h2>
            <div className="space-y-3">
              {CONDITIONS.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  {c.ok
                    ? <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  }
                  <p className="text-sm text-gray-700">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-blue-50 rounded-xl p-3 text-xs text-blue-700">
              <strong>핵심:</strong> "알바"·"일용직"·"파트타임" 명칭과 무관하게 실제 근무 기간과 시간이 기준입니다.
              근로자퇴직급여보장법 제4조 적용.
            </div>
          </motion.section>

          {/* 신청 단계 */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              퇴직금 신청 4단계
            </h2>
            <div className="space-y-4">
              {STEPS.map((s) => (
                <div key={s.step} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-[#3182f6] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* 퇴직금 계산 방법 */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-brand" />
              퇴직금 계산 공식 (2026년 기준)
            </h2>
            <div className="bg-gray-50 rounded-xl p-4 font-mono text-sm text-center text-gray-800 mb-3">
              퇴직금 = <span className="text-[#3182f6] font-bold">(1일 평균임금 × 30일)</span> × (재직일수 ÷ 365)
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• <strong>1일 평균임금</strong> = 퇴직 직전 3개월 급여 합계 ÷ 90일</p>
              <p>• <strong>쿠팡 28일 블록</strong>: 급여 주기 28일 단위로 적격 근무일 계산</p>
              <p>• <strong>계산 예시</strong>: 월 230만 원, 2년 근무 → 약 151만 원</p>
            </div>
          </motion.section>

          {/* 소멸시효 경고 */}
          <motion.section
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">퇴직금 소멸시효 — 퇴직 후 3년</p>
                <p className="text-xs text-amber-700 mt-1">
                  퇴직일로부터 3년이 지나면 법적으로 퇴직금을 청구할 수 없습니다.
                  쿠팡에서 퇴사한 지 3년이 안 됐다면 지금 바로 확인하세요.
                </p>
              </div>
            </div>
          </motion.section>

          {/* FAQ 섹션 */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-gray-500" />
              자주 묻는 질문
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: '쿠팡 알바 퇴직금 평균 수령액은?',
                  a: '근무 기간과 급여에 따라 다르지만 1년 근무 기준 약 65~80만 원, 2년 기준 약 130~160만 원 수준입니다. 정확한 금액은 CATCH 계산기로 확인하세요.',
                },
                {
                  q: '쿠팡 본사 직원이 아닌 CFS 소속도 퇴직금을 받나요?',
                  a: '네, 받을 수 있습니다. CFS(쿠팡풀필먼트서비스) 소속 일용직도 동일한 근로기준법이 적용됩니다.',
                },
                {
                  q: '급여명세서를 못 구하면 어떻게 하나요?',
                  a: 'CATCH는 수동 입력 간편계산도 지원합니다. 고용24(www.work.go.kr)에서 근로내역 조회도 가능합니다.',
                },
              ].map((faq, i) => (
                <div key={i} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-gray-900 mb-1">Q. {faq.q}</p>
                  <p className="text-sm text-gray-600">A. {faq.a}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* CTA 버튼 */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <button
              onClick={() => navigate('/severance')}
              className="w-full bg-[#3182f6] text-white font-bold py-4 rounded-2xl text-base shadow-lg hover:bg-[#2563eb] transition-colors flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              내 퇴직금 무료로 계산하기
              <ChevronRight className="w-5 h-5" />
            </button>
            <p className="text-center text-xs text-gray-400 mt-2">3분 소요 · 완전 무료 · PDF 업로드 지원</p>
          </motion.div>

        </div>
      </div>
    </>
  )
}
