import { Helmet } from 'react-helmet-async'
import { OG_IMAGE } from '../config/site'

// ── 프로덕션 기본값 상수 (도메인 기준값은 config/site.ts 에서 관리) ──
const DEFAULT_OG_IMAGE = OG_IMAGE
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
  /**
   * true이면 <meta name="robots" content="noindex, follow"> 주입
   * 로그인 사용자 전용 페이지(Home) 또는 공고 목록 같이 검색 결과에
   * 노출되면 안 되는 페이지에 사용합니다.
   */
  noIndex?: boolean
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
 *     canonical="https://coucatch.com/guide/severance"
 *     jsonLd={[faqSchema, breadcrumbSchema]}
 *   />
 */
export default function PageMeta({ title, description, canonical, ogImage, jsonLd, noIndex }: PageMetaProps) {
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

      {/* ── 크롤러 색인 제어: noIndex=true면 검색 결과에 표시 안 됨 ── */}
      {noIndex && <meta name="robots" content="noindex, follow" />}

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

      {/* ── JSON-LD 구조화 데이터 (FAQPage, BreadcrumbList 등) ──
          ★react-helmet-async는 <script>의 dangerouslySetInnerHTML을 클라이언트 head
            주입 시 누락시킨다(title/meta는 주입되나 ld+json script만 빠지는 이슈).
            → children 문자열 형식으로 전달해야 head에 실제로 주입되고, 프리렌더에도 캡처된다.
            '<'는 <로 이스케이프해 </script> 조기종료·XSS를 원천 차단(JSON-LD는 자체 정적 데이터). */}
      {jsonLdArray.map((schema, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(schema).replace(/</g, '\\u003c')}
        </script>
      ))}
    </Helmet>
  )
}
