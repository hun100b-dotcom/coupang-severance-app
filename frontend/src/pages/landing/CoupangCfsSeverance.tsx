// 쿠팡 CFS 퇴직금 계산 방법 — 롱테일 SEO 랜딩 페이지
// 검색어: "쿠팡 CFS 퇴직금 계산 방법", "쿠팡 풀필먼트 퇴직금", "CFS 퇴직금"
// 목적: CFS 재판 SERP 옆 롱테일 진입 → 계산기 전환

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calculator, ChevronRight, CheckCircle, AlertTriangle, Clock, FileText, HelpCircle, Scale } from 'lucide-react'
import PageMeta from '../../components/PageMeta'
import RelatedLinks from '../../components/seo/RelatedLinks'

// ── FAQ JSON-LD ──────────────────────────────────────────────
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '쿠팡 CFS 퇴직금 계산 방법은 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '① CFS 급여명세서 PDF를 쿠팡 앱에서 다운로드 → ② CATCH 계산기에 업로드 → ③ 28일 블록 알고리즘 자동 적용 → ④ 적격 근무일 계산 → ⑤ 퇴직금 = (1일 평균임금 × 30) × (적격일수 ÷ 365). 3분 안에 정확한 금액이 나옵니다.',
      },
    },
    {
      '@type': 'Question',
      name: 'CFS(쿠팡풀필먼트서비스)란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CFS(쿠팡풀필먼트서비스)는 쿠팡의 물류 자회사로, 전국 주요 물류센터의 피킹·패킹·배송 업무를 담당합니다. CFS 소속 일용직 근로자도 쿠팡 본사 직원과 동일한 근로기준법 적용을 받으며 퇴직금 청구 권리가 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: 'CFS 재판 이후에도 퇴직금을 청구할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '네, 청구할 수 있습니다. 재판 진행 여부와 관계없이 퇴직금 청구권은 퇴직일로부터 3년간 유효합니다. 회사가 재판 중이라도 근로자의 퇴직금 청구는 별개의 민사 권리입니다. 3년 이내라면 지금 바로 청구하세요.',
      },
    },
    {
      '@type': 'Question',
      name: 'CFS 퇴직금이 일반 회사와 다른 점이 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '계산 기준은 동일하지만, CFS는 급여 주기가 28일이어서 "28일 블록 알고리즘"을 적용해야 합니다. 일반 월급제 계산(단순 월수)으로 하면 과소 또는 과대 계산이 됩니다. CATCH는 CFS 전용 28일 블록을 자동 적용합니다.',
      },
    },
    {
      '@type': 'Question',
      name: 'CFS 퇴직금 소멸시효는 언제까지인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '퇴직금 청구권 소멸시효는 퇴직일로부터 3년입니다(근로기준법 제49조). 2022년 이후 퇴직자라면 아직 청구 기간 내에 있을 가능성이 있습니다. 퇴직일을 먼저 확인하세요.',
      },
    },
    {
      '@type': 'Question',
      name: 'CFS 급여명세서를 어디서 받을 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '① 쿠팡 앱 → 마이페이지 → 급여명세서 PDF 다운로드 ② 고용24(www.work.go.kr) → 개인서비스 → 근로내역 조회 ③ 회사 인사팀 요청. 명세서가 없어도 CATCH 수동 계산으로 예상액을 확인할 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: 'CFS가 파산하면 퇴직금을 못 받나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '아닙니다. 회사 파산 시 국가 대지급제도(체당금)를 통해 정부가 퇴직금을 대신 지급합니다. 고용노동부에 체당금을 신청하면 최대 3개월치 평균임금 한도 내에서 지급됩니다.',
      },
    },
  ],
}

// ── Article JSON-LD ──────────────────────────────────────────
const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '쿠팡 CFS 퇴직금 계산 방법 — 2026년 재판 이후 청구 완전 가이드',
  description: '쿠팡풀필먼트서비스(CFS) 일용직 퇴직금 계산 방법, 28일 블록 알고리즘, 재판 이후 청구 절차를 안내합니다.',
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
    '@id': 'https://catch-daily-worker.vercel.app/coupang-cfs-severance-calculation',
  },
}

// ── CFS 특화 수급 조건 ──
const CFS_CONDITIONS = [
  { ok: true, text: 'CFS 물류센터(동일 사업장)에서 1년(365일) 이상 적격 근무' },
  { ok: true, text: '최근 4주(1블록) 평균 주 15시간 이상 근무' },
  { ok: true, text: '계약 만료·권고사직·자발적 퇴사 모두 해당' },
  { ok: false, text: '적격 근무일 합산이 365일 미만 → 퇴직금 미해당' },
]

// ── 계산 단계 ──
const CALC_STEPS = [
  { step: '1', title: '급여명세서 준비', desc: '쿠팡 앱 또는 고용24에서 PDF 다운로드' },
  { step: '2', title: 'PDF 업로드', desc: 'CATCH 계산기에 업로드 → 28일 블록 자동 분석' },
  { step: '3', title: '결과 확인', desc: '적격 근무일수·퇴직금 예상액 3분 안에 확인' },
  { step: '4', title: '청구 진행', desc: '내용증명 발송 → 미지급 시 고용노동부 진정' },
]

export default function CoupangCfsSeverance() {
  const navigate = useNavigate()

  return (
    <>
      {/* SEO 메타태그 + JSON-LD */}
      <PageMeta
        title="쿠팡 CFS 퇴직금 계산 방법 | 재판 이후 청구 완전 가이드 — CATCH"
        description="쿠팡풀필먼트서비스(CFS) 일용직 퇴직금 계산 방법을 안내합니다. 28일 블록 알고리즘 자동 적용, PDF 업로드 3분 계산. 재판 진행 중에도 퇴직금 청구 가능합니다."
        canonical="https://catch-daily-worker.vercel.app/coupang-cfs-severance-calculation"
        jsonLd={[FAQ_SCHEMA, ARTICLE_SCHEMA]}
      />

      <div className="min-h-screen bg-up-sunken pb-20">
        {/* ── 헤더 히어로 ── */}
        <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] px-4 pt-12 pb-10 text-white">
          <motion.div
            className="max-w-lg mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
              CFS(쿠팡풀필먼트서비스) 일용직 전용
            </span>
            {/* H1 */}
            <h1 className="text-2xl font-bold leading-snug mb-3">
              쿠팡 CFS 퇴직금 계산 방법<br />
              <span className="text-blue-300">재판 이후에도 청구 가능합니다</span>
            </h1>
            <p className="text-white/85 text-sm leading-relaxed mb-6">
              CFS 재판 진행 여부와 관계없이 퇴직금은 퇴직일부터 3년간 청구할 수 있습니다.
              28일 블록 알고리즘으로 내 정확한 퇴직금을 지금 확인하세요.
            </p>
            <button
              onClick={() => navigate('/severance')}
              className="flex items-center gap-2 bg-white text-[#1a1a2e] font-bold px-6 py-3 rounded-full text-sm shadow-lg hover:shadow-xl transition-all"
            >
              <Calculator className="w-4 h-4" />
              CFS 퇴직금 계산하기
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* ── 본문 ── */}
        <div className="max-w-lg mx-auto px-4 mt-6 space-y-5">

          {/* CFS 특화 수급 조건 */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-base font-bold text-up-navy mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-accent-700" />
              CFS 퇴직금 수급 조건
            </h2>
            <div className="space-y-3">
              {CFS_CONDITIONS.map((c, i) => (
                <div key={i} className="flex items-start gap-3">
                  {c.ok
                    ? <CheckCircle className="w-4 h-4 text-accent-700 mt-0.5 flex-shrink-0" />
                    : <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  }
                  <p className="text-sm text-up-body">{c.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-up-sunken rounded-xl p-3 text-xs text-up-sub">
              <strong>⚖️ 법적 근거:</strong> 근로자퇴직급여보장법 제4조. CFS 소속 일용직도 동일 적용.
              재판 진행과 무관하게 근로자의 청구권은 별개로 보호됩니다.
            </div>
          </motion.section>

          {/* CFS 계산 단계 */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-base font-bold text-up-navy mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand" />
              CFS 퇴직금 계산 4단계
            </h2>
            <div className="space-y-4">
              {CALC_STEPS.map((s) => (
                <div key={s.step} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-up-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-up-navy">{s.title}</p>
                    <p className="text-xs text-up-sub mt-0.5">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>

          {/* 28일 블록 CFS 특화 설명 */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-base font-bold text-up-navy mb-3">
              CFS 28일 블록 — 왜 중요한가?
            </h2>
            <p className="text-sm text-up-body leading-relaxed mb-3">
              CFS는 급여를 <strong>28일(4주) 주기</strong>로 지급합니다.
              일반 월급제 계산(30일 기준)으로는 블록 경계에서 근무일 계산 오류가 발생합니다.
              정확한 퇴직금은 반드시 <strong>28일 단위 블록 알고리즘</strong>을 적용해야 합니다.
            </p>
            <div className="bg-up-sunken rounded-xl p-3 font-mono text-xs text-up-body space-y-1">
              <p>퇴직금 = (1일 평균임금 × 30) × (적격근무일수 ÷ 365)</p>
              <p className="text-accent-700 font-bold">예: 적격일수 450일, 평균일급 80,000원</p>
              <p className="text-accent-700">→ 80,000 × 30 × (450÷365) ≒ <strong>295만 원</strong></p>
            </div>
          </motion.section>

          {/* 재판 관련 안내 */}
          <motion.section
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-start gap-3">
              <Scale className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-800">CFS 재판 중에도 퇴직금 청구 가능</p>
                <p className="text-xs text-amber-700 mt-1">
                  회사 재판·수사 진행 여부와 퇴직금 청구권은 별개입니다.
                  형사 재판 결과를 기다릴 필요 없이 지금 바로 청구할 수 있습니다.
                  단, 소멸시효(퇴직 후 3년) 내에 신청해야 합니다.
                </p>
              </div>
            </div>
          </motion.section>

          {/* 소멸시효 */}
          <motion.section
            className="bg-danger/10 border border-danger/30 rounded-2xl p-4"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-danger mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-danger">소멸시효 — 퇴직 후 3년</p>
                <p className="text-xs text-danger mt-1">
                  2023년 이후 퇴직자는 아직 청구 가능합니다.
                  2022년 퇴직자는 2025년 말까지만 청구 가능합니다. 지금 확인하세요.
                </p>
              </div>
            </div>
          </motion.section>

          {/* FAQ */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <h2 className="text-base font-bold text-up-navy mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-up-sub" />
              자주 묻는 질문
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: 'CFS에서 퇴직금을 이미 받았는데 더 받을 수 있나요?',
                  a: '28일 블록 알고리즘을 정확히 적용하지 않은 경우 과소 지급됐을 수 있습니다. CATCH로 계산 후 차액이 있으면 추가 청구가 가능합니다.',
                },
                {
                  q: 'CFS가 아닌 쿠팡 직영 물류센터도 동일한가요?',
                  a: '물류센터에 따라 급여 주기가 다를 수 있습니다. PDF를 업로드하면 CATCH가 자동으로 판별합니다.',
                },
                {
                  q: '회사에서 퇴직금을 거부할 때 어떻게 하나요?',
                  a: '고용노동부 민원마당(moel.go.kr)에 진정을 접수하면 근로감독관이 조사합니다. 퇴직금 미지급은 3년 이하 징역 또는 2,000만 원 이하 벌금에 해당합니다.',
                },
              ].map((faq, i) => (
                <div key={i} className="border-b border-up-hair pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-semibold text-up-navy mb-1">Q. {faq.q}</p>
                  <p className="text-sm text-up-sub">A. {faq.a}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <button
              onClick={() => navigate('/severance')}
              className="w-full bg-up-navy text-white font-bold py-4 rounded-2xl text-base shadow-lg hover:bg-ink-900 transition-colors flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              CFS 퇴직금 지금 계산하기
              <ChevronRight className="w-5 h-5" />
            </button>
            <p className="text-center text-xs text-up-sub mt-2">28일 블록 자동 적용 · PDF 업로드 · 3분 · 완전 무료</p>
          </motion.div>

          {/* SEO 내부 링크 메시(P5) — 크롤 가능한 관련 계산기·가이드 */}
          <RelatedLinks current="/coupang-cfs-severance-calculation" />

        </div>
      </div>
    </>
  )
}
