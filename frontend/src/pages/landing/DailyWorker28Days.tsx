// 일용직 퇴직금 28일 계산 — 롱테일 SEO 랜딩 페이지
// 검색어: "일용직 퇴직금 28일 계산", "28일 블록 퇴직금", "쿠팡 28일 블록"
// 목적: 28일 블록 알고리즘 검색 유입 → 정밀계산기 전환

import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calculator, ChevronRight, CheckCircle, AlertTriangle, HelpCircle, BarChart3 } from 'lucide-react'
import PageMeta from '../../components/PageMeta'

// ── FAQ JSON-LD ──────────────────────────────────────────────
const FAQ_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '일용직 퇴직금 28일 블록이란 무엇인가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '쿠팡·CFS 등 일부 사업장은 급여 지급 주기가 28일(4주) 단위입니다. 퇴직금 적격 근무일 계산 시 마지막 근무일부터 역순으로 28일씩 블록을 나눠, 각 블록 내 근무일이 8일 이상이어야 "적격 블록"으로 인정합니다. CATCH는 이 알고리즘을 자동 적용합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '28일 블록에서 근무일이 8일 미만이면 어떻게 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '해당 블록은 "비적격 블록"으로 처리되어 퇴직금 계산 시 적격 근무일에서 제외됩니다. 단, 비적격 블록이 있어도 전체 적격 근무일이 365일 이상이면 퇴직금 청구 권리는 유지됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 일용직 퇴직금 계산 시 28일 블록을 반드시 적용해야 하나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '쿠팡·CFS처럼 급여 주기가 28일인 사업장 근로자는 28일 블록 기준을 적용해야 정확한 퇴직금이 계산됩니다. 일반 월급제 직장은 해당 없으며 근무일 기준 단순 계산을 사용합니다. CATCH는 사업장에 맞는 알고리즘을 자동으로 적용합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '일용직 퇴직금 28일 계산 공식이 어떻게 되나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '① 마지막 근무일부터 28일씩 역산 → ② 각 블록 근무일 8일 이상이면 적격 블록 → ③ 적격 블록 전체 일수 합산(qualifying_days) → ④ qualifying_days ÷ 365가 1 이상이면 퇴직금 대상 → ⑤ 퇴직금 = (1일 평균임금 × 30) × (qualifying_days ÷ 365). CATCH PDF 업로드로 자동 계산됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '28일 블록 계산을 직접 할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '수동 계산은 급여명세서를 일일이 확인하며 블록을 나눠야 해서 복잡하고 오류가 납니다. CATCH 정밀계산기에 PDF를 업로드하면 자동으로 블록 분할, 적격 여부 판정, 퇴직금 계산까지 3분 안에 완료됩니다.',
      },
    },
    {
      '@type': 'Question',
      name: '3개월 공백이 있으면 퇴직금에 어떤 영향을 주나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '90일(3개월) 이상 근무 공백이 있으면 근무 기간이 별도 세그먼트로 분리됩니다. 각 세그먼트가 1년(365일) 이상이어야 해당 기간의 퇴직금이 발생합니다. 짧은 공백은 통산 근무 기간에 포함될 수 있습니다.',
      },
    },
    {
      '@type': 'Question',
      name: '쿠팡 28일 블록 계산기를 무료로 사용할 수 있나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CATCH 퇴직금 계산기는 28일 블록 알고리즘 포함, 완전 무료입니다. PDF 업로드 정밀계산(3분)과 수동 입력 간편계산 모두 무료로 이용 가능합니다.',
      },
    },
  ],
}

// ── Article JSON-LD ──────────────────────────────────────────
const ARTICLE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '일용직 퇴직금 28일 계산법 — 블록 알고리즘 완전 해석 2026',
  description: '쿠팡·CFS 일용직 퇴직금 계산의 핵심인 28일 블록 알고리즘을 쉽게 설명합니다. 적격 블록 기준, 계산 공식, CATCH 자동계산 방법 안내.',
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
    '@id': 'https://catch-daily-worker.vercel.app/daily-worker-severance-28days',
  },
}

// ── 28일 블록 예시 데이터 ──
const BLOCK_EXAMPLE = [
  { block: 'Block 1', days: '2025-10-01 ~ 2025-10-28', workDays: 12, eligible: true },
  { block: 'Block 2', days: '2025-09-03 ~ 2025-09-30', workDays: 10, eligible: true },
  { block: 'Block 3', days: '2025-08-06 ~ 2025-09-02', workDays: 6, eligible: false },
  { block: 'Block 4', days: '2025-07-09 ~ 2025-08-05', workDays: 11, eligible: true },
]

export default function DailyWorker28Days() {
  const navigate = useNavigate()

  return (
    <>
      {/* SEO 메타태그 + JSON-LD */}
      <PageMeta
        title="일용직 퇴직금 28일 계산 | 블록 알고리즘 완전 해석 — CATCH"
        description="쿠팡·CFS 일용직 퇴직금의 핵심 '28일 블록 알고리즘'을 쉽게 설명합니다. 적격 블록 기준, 계산 공식, CATCH 무료 자동계산기로 3분 안에 확인하세요."
        canonical="https://catch-daily-worker.vercel.app/daily-worker-severance-28days"
        jsonLd={[FAQ_SCHEMA, ARTICLE_SCHEMA]}
      />

      <div className="min-h-screen bg-up-sunken pb-20">
        {/* ── 헤더 히어로 ── */}
        <div className="bg-gradient-to-br from-up-navy to-[#1e40af] px-4 pt-12 pb-10 text-white">
          <motion.div
            className="max-w-lg mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-block bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
              쿠팡·CFS 일용직 전용 계산법
            </span>
            {/* H1 */}
            <h1 className="text-2xl font-bold leading-snug mb-3">
              일용직 퇴직금 28일 계산법<br />
              <span className="text-blue-300">블록 알고리즘 완전 해석</span>
            </h1>
            <p className="text-white/85 text-sm leading-relaxed mb-6">
              쿠팡·CFS의 28일 급여 주기가 퇴직금 계산에 어떻게 적용되는지,
              내가 적격인지 아닌지 지금 바로 확인할 수 있습니다.
            </p>
            <button
              onClick={() => navigate('/severance')}
              className="flex items-center gap-2 bg-white text-[#1e40af] font-bold px-6 py-3 rounded-full text-sm shadow-lg hover:shadow-xl transition-all"
            >
              <Calculator className="w-4 h-4" />
              PDF 업로드로 자동 계산
              <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>

        {/* ── 본문 ── */}
        <div className="max-w-lg mx-auto px-4 mt-6 space-y-5">

          {/* 28일 블록 개념 설명 */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-base font-bold text-up-navy mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand" />
              28일 블록이란 무엇인가?
            </h2>
            <p className="text-sm text-up-body leading-relaxed mb-3">
              쿠팡·CFS는 급여를 <strong>28일(4주) 단위</strong>로 지급합니다. 퇴직금 적격 근무일을
              계산할 때, 마지막 근무일에서 역순으로 28일씩 블록을 나눕니다.
              각 블록에서 <strong>실제 근무일이 8일 이상이면 "적격 블록"</strong>으로 인정됩니다.
            </p>
            <div className="bg-brand-bg rounded-xl p-3 text-xs text-brand-strong space-y-1">
              <p>✅ <strong>적격 블록</strong>: 블록 내 근무일 8일 이상 → 해당 28일 전체 적격 인정</p>
              <p>❌ <strong>비적격 블록</strong>: 근무일 7일 이하 → 해당 블록 제외</p>
            </div>
          </motion.section>

          {/* 블록 예시 */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-base font-bold text-up-navy mb-4">블록 계산 예시</h2>
            <div className="space-y-2">
              {BLOCK_EXAMPLE.map((b) => (
                <div
                  key={b.block}
                  className={`flex items-center justify-between p-3 rounded-xl text-sm ${
                    b.eligible ? 'bg-accent-bg' : 'bg-danger/10'
                  }`}
                >
                  <div>
                    <p className="font-semibold text-up-navy">{b.block}</p>
                    <p className="text-xs text-up-sub">{b.days}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{b.workDays}일 근무</p>
                    {b.eligible
                      ? <CheckCircle className="w-4 h-4 text-accent-700 ml-auto" />
                      : <AlertTriangle className="w-4 h-4 text-danger ml-auto" />
                    }
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-up-sub mt-3">
              위 예시에서 Block 3(근무 6일)은 비적격 → 퇴직금 계산에서 제외됩니다.
            </p>
          </motion.section>

          {/* 전체 계산 공식 */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-base font-bold text-up-navy mb-3">퇴직금 계산 전체 공식</h2>
            <div className="space-y-2 text-sm text-up-body">
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-brand text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">1</span>
                <p>적격 블록 일수 합산 = <strong>qualifying_days</strong></p>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-brand text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">2</span>
                <p>qualifying_days ÷ 365 ≥ 1이면 <strong>퇴직금 대상</strong></p>
              </div>
              <div className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-brand text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">3</span>
                <p>퇴직금 = <strong>(1일 평균임금 × 30) × (qualifying_days ÷ 365)</strong></p>
              </div>
            </div>
            <div className="mt-4 bg-up-sunken rounded-xl p-3 font-mono text-xs text-up-body">
              예시: qualifying_days=420일, 1일 평균임금 77,000원<br />
              → 77,000 × 30 × (420 ÷ 365) ≒ <span className="font-bold text-accent-700">266만 원</span>
            </div>
          </motion.section>

          {/* FAQ */}
          <motion.section
            className="bg-white rounded-2xl p-5 shadow-sm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-base font-bold text-up-navy mb-4 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-up-sub" />
              자주 묻는 질문
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: '수동으로 28일 블록을 계산하면 얼마나 걸리나요?',
                  a: '급여명세서 1년치를 일일이 확인하며 블록을 나눠야 해서 1~2시간 이상 소요됩니다. CATCH PDF 업로드는 3분 안에 자동으로 완료됩니다.',
                },
                {
                  q: '3개월 공백 기간이 있으면 어떻게 되나요?',
                  a: '90일(3개월) 이상 공백이 있으면 별도 세그먼트로 분리됩니다. 각 세그먼트별로 365일 이상 여부를 판단합니다.',
                },
                {
                  q: 'CFS가 아닌 쿠팡 직영 물류센터도 28일 블록인가요?',
                  a: '물류센터 운영 방식에 따라 다를 수 있습니다. 급여명세서의 지급 주기를 확인하세요. CATCH에 PDF를 업로드하면 자동으로 판별합니다.',
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
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={() => navigate('/severance')}
              className="w-full bg-[#1e40af] text-white font-bold py-4 rounded-2xl text-base shadow-lg hover:bg-[#1751B5] transition-colors flex items-center justify-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              28일 블록 자동 계산하기
              <ChevronRight className="w-5 h-5" />
            </button>
            <p className="text-center text-xs text-up-sub mt-2">PDF 업로드 → 3분 안에 자동 계산 · 완전 무료</p>
          </motion.div>

        </div>
      </div>
    </>
  )
}
