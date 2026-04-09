import { Helmet } from 'react-helmet-async'

// ── 프로덕션 기본값 상수 ──
const BASE_URL = 'https://catch-daily-worker.vercel.app'
const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`
const SITE_NAME = 'CATCH - 일용직 근로의 동반자'

interface PageMetaProps {
  /** 브라우저 탭 제목 및 og:title (예: "퇴직금 가이드 | CATCH") */
  title: string
  /** 검색결과 설명 및 og:description (120~160자 권장) */
  description: string
  /** 정규 URL — 중복 인덱싱 방지를 위해 항상 프로덕션 URL 명시 */
  canonical: string
  /** SNS 공유 썸네일 (없으면 기본 og-image.png 사용) */
  ogImage?: string
  /**
   * JSON-LD 구조화 데이터 — 단일 object 또는 배열 모두 허용
   * 예: FAQPage, BreadcrumbList, SoftwareApplication 스키마
   */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

/**
 * PageMeta — 페이지별 동적 메타태그 컴포넌트
 *
 * react-helmet-async를 이용해 각 페이지의 <head>에 SEO 메타태그를 주입합니다.
 * main.tsx에서 HelmetProvider로 감싸야 정상 동작합니다.
 *
 * 사용 예시:
 *   <PageMeta
 *     title="퇴직금 가이드 | CATCH"
 *     description="쿠팡 일용직 퇴직금 조건과 계산 방법을 안내합니다"
 *     canonical="https://catch-daily-worker.vercel.app/guide/severance"
 *     jsonLd={[faqSchema, breadcrumbSchema]}
 *   />
 */
export default function PageMeta({ title, description, canonical, ogImage, jsonLd }: PageMetaProps) {
  const ogImageUrl = ogImage ?? DEFAULT_OG_IMAGE

  // jsonLd가 배열이면 그대로, 단일 객체면 배열로 감싸서 처리
  const jsonLdArray = jsonLd
    ? Array.isArray(jsonLd)
      ? jsonLd
      : [jsonLd]
    : []

  return (
    <Helmet>
      {/* ── 기본 SEO 태그 ── */}
      <title>{title}</title>
      <meta name="description" content={description} />

      {/* ── 중복 URL 방지: canonical은 항상 프로덕션 URL ── */}
      <link rel="canonical" href={canonical} />

      {/* ── Open Graph (카카오톡, 페이스북 등 SNS 공유) ── */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImageUrl} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="ko_KR" />

      {/* ── Twitter Card ── */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImageUrl} />

      {/* ── JSON-LD 구조화 데이터 (FAQPage, BreadcrumbList 등) ── */}
      {jsonLdArray.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          // dangerouslySetInnerHTML 사용: JSON.stringify는 XSS 안전 처리됨
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </Helmet>
  )
}
