# 실수 기록

| 날짜 | 내용 | 해결법 |
|------|------|--------|
| 2026-03-30 | memory/ 폴더가 CLAUDE.md에 참조되지만 실제 미존재 | 세션 3에서 인프라 일괄 생성 |

| 2026-04-19 | 하네스 워크플로우(/plan→/sprint→/review) 반복 미준수 | CLAUDE.md에 '⚠️ 하네스 워크플로우' 절대 규칙 섹션 추가 + sprint.md에 0단계 기획서 게이트 추가. 2파일 이상 수정은 무조건 /plan 먼저. |

| 2026-06-29 | Vercel 배포 반영을 curl로 20초 간격 ~30회 폴링 → Vercel Attack Challenge Mode(봇 차단)가 발동해 내 IP가 403 challenge로 막힘. 이후 curl로 프로덕션 검증 자체 불가 | 배포 반영 확인은 (1) 짧게 단발성으로, (2) curl 폴링 대신 실제 브라우저/Vercel MCP 사용. 프리뷰 브라우저는 localhost 오리진 샌드박스라 외부 프로덕션 검증 불가 — 라이브 UI 검증이 필요하면 종훈님 브라우저(챌린지 자동 통과)로 확인 요청. |
| 2026-06-29 | 어드민 인증 가드의 잠복 버그를 이전 세션들이 "admin 렌더 안 해봐서" 놓침 — AdminPage useEffect가 비로그인 시 early-return 하며 adminChecked를 안 켜 영구 하얀 화면. 게스트 모드 추가로 비로그인 /admin 도달이 쉬워지며 노출됨 | 인증 가드는 모든 settled 상태(로그인/비로그인/게스트)에서 "체크 완료" 플래그를 반드시 세팅해야 함. early-return이 그 플래그를 안 켜면 무한 null 렌더(하얀화면). 가드 컴포넌트 검증 시 비로그인·게스트 경로도 반드시 렌더 테스트(가짜세션 레시피 활용). 하얀화면=콘솔에러 없을 수도 있음(조용한 null) → DOM/리다이렉트 실측으로 확인. 프리뷰 SPA 이동은 location.assign(절대URL) 금지(프록시 오리진 깨짐), history.pushState+popstate 사용. |
| 2026-07-03 | SEO 프리렌더 도입 시 vercel.json에 `cleanUrls:true`를 넣었더니 catch-all SPA 폴백 rewrite(`/(.*)→/index.html`)가 무력화 → 프리렌더 안 된 동적 라우트(/admin·/mypage·/auth/callback·임의경로) 전부 404(로그인·어드민 불가). 프리렌더 라우트(/, /severance)만 200이라 "완료"로 착각, 동적 라우트를 검증 안 해 놓침 | `cleanUrls` 제거로 즉시 복구(프리렌더 라우트는 Vercel 기본 디렉터리 인덱스로 cleanUrls 없이 200 서빙). 교훈: **정적생성/프리렌더 도입 후 반드시 "동적 라우트 200" 매트릭스를 라이브 curl로 검증**(프리렌더 라우트만 보고 완료 처리 금지). Vercel `cleanUrls`·`trailingSlash`는 catch-all SPA 폴백과 충돌 가능 — 재도입 금지. 상세: docs/dual_review/P1c_spa_fallback_fix.md |
