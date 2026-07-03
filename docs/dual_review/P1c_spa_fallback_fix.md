# P1c SPA 폴백 라우팅 복구 — 더블리뷰 아카이브

- 스텝: **긴급 회귀 수정 — 프리렌더가 깨뜨린 SPA 폴백 라우팅 복구**
- 대상 커밋: `448f59e`
- 리뷰 일자: 2026-07-03

## 1. 사고·원인
**증상(라이브 실측)**: 프리렌더 라우트(/, /severance 등)만 200, 동적 라우트 전부 404 —
`/admin·/mypage·/auth·/auth/callback·임의경로` 모두 `HTTP 404 (x-vercel-error: NOT_FOUND, content-type text/plain)`. **로그인·어드민 접속 불가**.

**원인**: 프리렌더 도입(eac8bd3) 시 넣은 `cleanUrls: true`가 catch-all rewrite
(`/(.*)→/index.html`)를 무력화. Vercel에서 `cleanUrls:true` + rewrite destination `/index.html`
조합이 미매칭 경로에 index.html 폴백을 내리지 못하고 404 처리.
프리렌더 라우트는 **Vercel 기본 디렉터리 인덱스**(`dir/index.html`을 `/dir`에 서빙)로 cleanUrls 없이도
200 서빙되므로, cleanUrls는 불필요할뿐더러 폴백을 깨는 유일 원인.

**수정**: `vercel.json`에서 `cleanUrls` 제거. rewrites 폴백 유지.
- filesystem 단계: 프리렌더/정적파일 우선 서빙(SEO h1·JSON-LD 유지)
- rewrites 단계: 미매칭 경로 전부 `/index.html`(SPA 200)

## 2. 검증 — 라이브 curl 매트릭스 (배포 후)

### (A) 동적 SPA 라우트 — 200 + SPA 로드 필수 (★이번 핵심 축)
| 경로 | code | div#root |
|---|---|---|
| /admin | ✅ 200 | 1 |
| /mypage | ✅ 200 | 1 |
| /auth | ✅ 200 | 1 |
| /auth/callback (로그인 콜백) | ✅ 200 | 1 |
| /nonexistent-random-xyz (임의) | ✅ 200 | 1 |

### (B) 프리렌더 SEO 라우트 — 200 + h1 유지 필수
| 경로 | code | h1 |
|---|---|---|
| / | ✅ 200 | 1 |
| /severance | ✅ 200 | 1 |
| /coupang-cfs-severance-calculation | ✅ 200 | 1 |
| /guide/severance | ✅ 200 | 1 |
| **전체 17 SEO 라우트** | ✅ 200 | 1 (17/17) |

### (C) 부작용 배제
| 항목 | 결과 |
|---|---|
| /assets/*.js (정적 자산 rewrite 오염 여부) | ✅ 200 `application/javascript` (index.html로 안 먹힘) |
| /severance no-slash 리다이렉트 | ✅ 200 직접(308 없음) |

## 3. 회귀 (규칙3)
`vercel.json`만 변경 — 앱 소스(CSS/tsx/ts) 무변경, 빌드 산출 번들 동일 → 폰트 override·computed font-size 불변(구조적 0px). 계산 로직·운영 DB 불변.

## 4. 리뷰어 A (5축 + 동적라우트 축)
| 축 | 판정 | 근거 |
|---|---|---|
| 디자인 | PASS(해당없음) | 라우팅 설정 |
| UI | PASS(해당없음) | — |
| UX | PASS | 로그인·어드민·마이 복구(200 SPA). 서비스 접속 불능 해소 |
| 코드 | PASS | vercel.json만·cleanUrls 제거·폴백 유지·회귀원인 주석 |
| 회귀 | PASS | 앱 소스 무변경 → 폰트 0px |
| **★동적라우트 200(신규 축)** | **PASS** | /admin·/mypage·/auth·/auth/callback·임의경로 전부 200+SPA |

**A 종합: PASS.**

## 5. 리뷰어 B (Adversarial)
- **"동적 200"과 "SEO h1 유지"가 동시 성립하는가(하나 희생 안 했나)?**: (A) 동적 5라우트 200+root + (B) 17/17 프리렌더 200+h1=1 동시 확인. 폴백 복구가 프리렌더를 되돌리지 않음(filesystem 우선).
- **정적 자산 오염**: catch-all rewrite가 `/assets/*.js`를 index.html로 안 먹는지 확인 → `application/javascript` 200. OK.
- **OAuth 경로**: `/auth/callback` 200(로그인 콜백 핵심). OK.
- **임의 경로**: 존재하지 않는 `/nonexistent-random-xyz`도 200+SPA → 진짜 catch-all 폴백 동작(알려진 경로만 우연히 되는 게 아님).
- **트레일링슬래시**: /severance no-slash가 308 아닌 200 직접 → canonical(no-slash)과 정합.
- **놓친 점**: cleanUrls 제거로 `.html` 확장자 접근(`/severance.html` 등)이 정리되지 않으나, 프리렌더는 `dir/index.html` 구조라 `.html` 노출 URL 자체가 없음 → 무영향.

**B 종합: PASS.**

## 6. 합의·이견·최종결정
| 항목 | 내용 |
|---|---|
| 합의 | 둘 다 PASS. 동적 라우트 200(로그인·어드민 복구) + 프리렌더 SEO(17/17 h1) 동시 성립. |
| 이견 | 없음. |
| 최종결정 | **회귀 복구 PASS·배포유지.** cleanUrls 재도입 금지(폴백 파괴 원인). |

## 7. 교훈(lessons)
프리렌더/정적생성 도입 시 `cleanUrls`·`trailingSlash` 등 Vercel 라우팅 옵션은 catch-all SPA 폴백과 충돌할 수 있음. **정적생성 후에는 반드시 "동적 라우트 200" 매트릭스를 라이브 curl로 검증**할 것(프리렌더 라우트만 보고 완료 처리 금지).
