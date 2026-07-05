// ============================================================
// routeLabels: 앱 경로(/home 등) → 사람이 읽는 한글 명칭 매핑
// 어드민 방문자 분석에서 '홈(/home)' 형식(명칭(/경로))으로 일관 표기하기 위한 단일 기준.
// App.tsx 의 <Route path=...> 전체를 반영한다. 새 라우트 추가 시 여기도 갱신.
// ============================================================

// 정적 경로 → 한글 명칭
const ROUTE_LABELS: Record<string, string> = {
  '/': '랜딩(루트)',
  '/home': '홈',
  '/intro': '인트로',
  '/login': '로그인',
  '/onboarding': '온보딩',
  '/calculator': '계산기 허브',
  '/severance': '퇴직금 계산',
  '/unemployment': '실업급여 계산',
  '/weekly-allowance': '주휴수당 계산',
  '/annual-leave': '연차수당 계산',
  '/jobs': '채용정보',
  '/mypage': '마이페이지',
  '/my-benefits': '나의 혜택',
  '/notices': '공지사항',
  '/payment': '결제',
  '/inquiry': '문의',
  '/settings': '설정',
  '/guide': '가이드 허브',
  '/guide/severance': '가이드·퇴직금',
  '/guide/unemployment': '가이드·실업급여',
  '/guide/weekly-allowance': '가이드·주휴수당',
  '/guide/annual-leave': '가이드·연차수당',
  '/coupang-severance-calculator': 'SEO·쿠팡퇴직금계산기',
  '/coupang-unemployment-calculator': 'SEO·쿠팡실업급여계산기',
  '/coupang-cfs-severance-calculation': 'SEO·쿠팡CFS퇴직금',
  '/coupang-part-time-severance-method': 'SEO·쿠팡단기퇴직금',
  '/day-worker-severance-guide': 'SEO·일용직퇴직금가이드',
  '/daily-worker-severance-28days': 'SEO·28일블록',
  '/privacy-policy': '개인정보처리방침',
  '/terms-of-service': '이용약관',
  '/terms/privacy': '약관·개인정보',
  '/terms/service': '약관·서비스',
  '/auth/callback': 'OAuth 콜백',
  '/landing': '랜딩',
  '/v1': '랜딩 A/B·V1',
  '/v2': '랜딩 A/B·V2',
  '/v3': '랜딩 A/B·V3',
  '/v4': '랜딩 A/B·V4',
  '/v5': '랜딩 A/B·V5',
  '/admin': '관리자',
}

// 동적 경로(리포트 상세 등)는 프리픽스로 매칭
const PREFIX_LABELS: [string, string][] = [
  ['/report/', '계산 리포트 상세'],
]

// 경로 → 한글 명칭(미매핑이면 빈 문자열)
export function routeLabel(path: string): string {
  if (ROUTE_LABELS[path]) return ROUTE_LABELS[path]
  for (const [pre, label] of PREFIX_LABELS) {
    if (path.startsWith(pre)) return label
  }
  return ''
}

// '명칭(/경로)' 형식으로 표기. 미매핑 경로는 경로만 그대로 노출.
//   예) '/home' → '홈(/home)',  '/report/abc' → '계산 리포트 상세(/report/abc)'
export function formatRoutePath(path: string): string {
  const label = routeLabel(path)
  return label ? `${label}(${path})` : path
}
