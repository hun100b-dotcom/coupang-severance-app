/**
 * jobUtils.ts — 채용정보 공통 유틸리티
 *
 * 회사 로고 매핑 등 채용 관련 공유 상수/함수를 모아둔 파일.
 * JobsPage, Home 등 여러 페이지에서 동일한 로고를 사용하기 위해 분리.
 */

// ── 회사명 → 로고 URL 매핑 ──
// DB에 logo_url 컬럼이 없으므로 company_name으로 로컬 에셋을 찾음
export const COMPANY_LOGOS: Record<string, string> = {
  '쿠팡': '/logos/coupang.svg',
  '쿠팡풀필먼트서비스': '/logos/coupang.svg',
  'CJ대한통운': '/logos/cj.svg',
  'CJ': '/logos/cj.svg',
  '컬리': '/logos/kurly.png',
  '마켓컬리': '/logos/kurly.png',
  'GS리테일': '/logos/gs.svg',
  '롯데': '/logos/lotte.svg',
}

/**
 * 회사명으로 로고 URL을 찾아 반환하는 헬퍼 함수
 * 회사명에 키워드가 포함되면 해당 로고, 없으면 기본 아이콘 반환
 *
 * @param companyName - DB의 company_name 값
 * @returns 로고 이미지 경로 (예: '/logos/coupang.svg')
 */
export function getCompanyLogoUrl(companyName: string): string {
  const logoKey = Object.keys(COMPANY_LOGOS).find(k => companyName.includes(k))
  return logoKey ? COMPANY_LOGOS[logoKey] : '/logos/default.svg'
}
