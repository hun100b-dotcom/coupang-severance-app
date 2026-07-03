# 실수 기록

| 날짜 | 내용 | 해결법 |
|------|------|--------|
| 2026-03-30 | memory/ 폴더가 CLAUDE.md에 참조되지만 실제 미존재 | 세션 3에서 인프라 일괄 생성 |

| 2026-04-19 | 하네스 워크플로우(/plan→/sprint→/review) 반복 미준수 | CLAUDE.md에 '⚠️ 하네스 워크플로우' 절대 규칙 섹션 추가 + sprint.md에 0단계 기획서 게이트 추가. 2파일 이상 수정은 무조건 /plan 먼저. |

| 2026-06-29 | Vercel 배포 반영을 curl로 20초 간격 ~30회 폴링 → Vercel Attack Challenge Mode(봇 차단)가 발동해 내 IP가 403 challenge로 막힘. 이후 curl로 프로덕션 검증 자체 불가 | 배포 반영 확인은 (1) 짧게 단발성으로, (2) curl 폴링 대신 실제 브라우저/Vercel MCP 사용. 프리뷰 브라우저는 localhost 오리진 샌드박스라 외부 프로덕션 검증 불가 — 라이브 UI 검증이 필요하면 종훈님 브라우저(챌린지 자동 통과)로 확인 요청. |
| 2026-06-29 | 어드민 인증 가드의 잠복 버그를 이전 세션들이 "admin 렌더 안 해봐서" 놓침 — AdminPage useEffect가 비로그인 시 early-return 하며 adminChecked를 안 켜 영구 하얀 화면. 게스트 모드 추가로 비로그인 /admin 도달이 쉬워지며 노출됨 | 인증 가드는 모든 settled 상태(로그인/비로그인/게스트)에서 "체크 완료" 플래그를 반드시 세팅해야 함. early-return이 그 플래그를 안 켜면 무한 null 렌더(하얀화면). 가드 컴포넌트 검증 시 비로그인·게스트 경로도 반드시 렌더 테스트(가짜세션 레시피 활용). 하얀화면=콘솔에러 없을 수도 있음(조용한 null) → DOM/리다이렉트 실측으로 확인. 프리뷰 SPA 이동은 location.assign(절대URL) 금지(프록시 오리진 깨짐), history.pushState+popstate 사용. |
| 2026-07-04 | 어드민 "먹통" 3중 원인을 여러 세션이 놓침: ①keep-alive 워크플로가 존재하지 않는 호스트(`coupang-severance-api` — 실제는 `-app`)를 계속 핑해 콜드스타트 방지가 0% 무효(404 no-server를 아무도 실측 안 함) ②대시보드가 브라우저 세션 Supabase 직접 조회 → profiles RLS(owner-only)로 유저 56명이 화면엔 1명, click_counter는 존재하지 않는 컬럼명(`total_cnt`)으로 항상 0 — "하드코딩 같다"는 인상의 정체 ③잦은 재배포로 열린 탭의 옛 청크 404 | ①인프라 자동화(크론·워밍업)는 "동작한다고 믿지 말고" 대상 URL을 직접 curl로 실측 — 404/no-server면 전부 무효 ②관리자 화면의 전역 통계는 절대 브라우저 세션+RLS 경로로 만들지 않기(백엔드 service-role 통일). 화면 숫자가 "하드코딩 같다"는 제보는 RLS 과소집계·컬럼명 불일치부터 의심 ③컬럼명은 추정 금지 — REST로 실제 행 1건 받아 확인 ④lazy 청크 로드 실패는 lazyRetry(세션당 1회 reload)로 자동복구. 상세: docs/audit/admin_fullcheck_2026-07-04.md |
| 2026-07-03 | SEO 프리렌더 도입 시 vercel.json에 `cleanUrls:true`를 넣었더니 catch-all SPA 폴백 rewrite(`/(.*)→/index.html`)가 무력화 → 프리렌더 안 된 동적 라우트(/admin·/mypage·/auth/callback·임의경로) 전부 404(로그인·어드민 불가). 프리렌더 라우트(/, /severance)만 200이라 "완료"로 착각, 동적 라우트를 검증 안 해 놓침 | `cleanUrls` 제거로 즉시 복구(프리렌더 라우트는 Vercel 기본 디렉터리 인덱스로 cleanUrls 없이 200 서빙). 교훈: **정적생성/프리렌더 도입 후 반드시 "동적 라우트 200" 매트릭스를 라이브 curl로 검증**(프리렌더 라우트만 보고 완료 처리 금지). Vercel `cleanUrls`·`trailingSlash`는 catch-all SPA 폴백과 충돌 가능 — 재도입 금지. 상세: docs/dual_review/P1c_spa_fallback_fix.md |
