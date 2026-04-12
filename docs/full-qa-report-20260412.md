# CATCH 전역 QA 보고서 (2026-04-12)

> 작업 브랜치: `claude/affectionate-cerf`
> 분석 파일 수: 약 120개 (tsx/ts/css)
> 빌드 결과: ✅ 성공 (TypeScript 에러 0건)

---

## 1. 쓰레기 파일 정리 결과

### 1-1. 삭제된 파일 목록

| 파일 경로 | 삭제 이유 |
|-----------|-----------|
| `frontend/src/components/CustomerService.tsx` (609줄) | App.tsx 및 다른 어떤 파일에서도 import 되지 않음. 완전 미사용 컴포넌트. |
| `frontend/src/components/ProgressSummary.tsx` (62줄) | 동일. 어디서도 참조 없음. |
| `frontend/src/components/SkeletonCard.tsx` (18줄) | 동일. 어디서도 참조 없음. |
| `frontend/src/components/WhyCatchModal.tsx` (113줄) | 동일. 어디서도 참조 없음. |
| `frontend/src/pages/LandingPage.tsx` (843줄) | LandingV1~V5가 분리된 후 남은 초기 버전. App.tsx에서 import 안 됨. |
| `frontend/src/components/admin/menus/LogsMenu.tsx` (98줄) | AdminPage에서 `AuditLogsMenu`, `ServerLogsMenu`가 사용되며 LogsMenu는 직접 참조 없음. AuditLogsMenu.tsx는 AuditMenu.tsx를 re-export하는 브릿지로 유지. |

**총 삭제: 6개 파일, 약 1,743줄 제거**

### 1-2. .gitignore 상태

현재 `.gitignore`에 `frontend/dist/`, `node_modules/` 등 핵심 패턴이 이미 포함되어 있어 추가 보강 불필요.

---

## 2. 기능별 분석 결과

### 2-1. 페이지별 버튼/기능 연결 상태

| 페이지 | 경로 | 라우트 연결 | 주요 기능 |
|--------|------|------------|-----------|
| 랜딩 (LandingV1) | `/`, `/landing`, `/v1` | ✅ | SEO 진입점, 로그인 유도 CTA |
| 랜딩 비교 버전 | `/v2`~`/v5` | ✅ | A/B 테스트용 5개 버전 |
| 홈 | `/home` | ✅ HomeGuard | 비로그인 시 `/`로 리다이렉트 |
| 채용정보 | `/jobs` | ✅ | Supabase Realtime, 즐겨찾기, 지원 모달 |
| 계산기 허브 | `/calculator` | ✅ | 4개 서비스 카드 |
| 퇴직금 계산 | `/severance` | ✅ | PDF 정밀 + 수동 간편, FastAPI 연동 |
| 실업급여 계산 | `/unemployment` | ✅ | PDF 정밀 + 수동 간편, FastAPI 연동 |
| 주휴수당 | `/weekly-allowance` | ✅ | 수동 입력 계산, 결과 저장 |
| 연차수당 | `/annual-leave` | ✅ | 수동 입력 계산, 결과 저장 |
| 마이페이지 | `/mypage` | ✅ | 지원현황, 즐겨찾기, 보상, 설정 탭 |
| 리포트 상세 | `/report/:id` | ✅ ProtectedRoute | 로그인 필수 |
| 공지사항 | `/notices` | ✅ | 목록 조회 |
| 가이드 | `/guide/*` | ✅ | SEO 콘텐츠 5개 페이지 |
| 관리자 | `/admin` | ✅ | X-Admin-Token 인증, 10개 메뉴 |
| 로그인 | `/login` | ✅ | 카카오 + 구글 OAuth |
| 온보딩 | `/onboarding` | ✅ | OnboardingGuard 보호 |
| 문의하기 | `/inquiry` | ✅ | 고객센터 문의 폼 |
| 설정 | `/settings` | ✅ | 계정 설정 |
| 약관 | `/terms/privacy`, `/privacy-policy` 외 | ✅ | 중복 경로 지원 |

### 2-2. 계산기 플로우 분석

**퇴직금 (`/severance` → `SeveranceFlow.tsx`):**
- PDF 정밀계산: `extractSeveranceCompanies()` → `calcSeverancePrecise()` (FastAPI `/api/severance/precise`)
- 수동 간편계산: `calcSeveranceSimple()` (FastAPI `/api/severance/simple`)
- 에러 처리: `setError(msg)` 상태로 UI에 표시됨 ✅
- 결과: `ResultSeverance.tsx` 컴포넌트로 렌더링

**실업급여 (`/unemployment` → `UnemploymentFlow.tsx`):**
- PDF 정밀계산: `extractUnemploymentCompanies()` → `calcUBPrecise()` (FastAPI)
- 수동 간편계산: `calcUBSimple()` (FastAPI)
- 결과: `ResultUnemployment.tsx` 컴포넌트로 렌더링

**주휴수당/연차수당:** 프론트에서 직접 계산 (FastAPI 불필요), 결과 Supabase `reports` 테이블에 저장 가능

**API 환경변수:** `VITE_API_URL` — 개발 시 빈 문자열(Vite 프록시), 프로덕션 시 Render URL ✅

### 2-3. 인증 플로우

- 로그인: 카카오/구글 OAuth → `AuthContext` → `isLoggedIn`, `needsOnboarding` 상태 관리
- 온보딩 가드: `OnboardingGuard` — 로그인+온보딩 미완료 시 `/onboarding` 강제 이동 ✅
- 보호 라우트: `ProtectedRoute` — 비로그인 시 `/mypage`로 이동(로그인 유도) ✅
- HomeGuard: 비로그인 시 `/`(랜딩)으로 리다이렉트 ✅

### 2-4. 어드민 기능

- 공고 등록/수정/삭제 → `JobsMenu.tsx` (CRUD + 긴급토글 + 상태필터) ✅
- 지원자 확정/거절 → `notifications` 테이블 INSERT → `MyApplicationsTab.tsx` Realtime 수신 → toast 표시 ✅
- 어드민 인증: `X-Admin-Token` 헤더 검증 ✅

---

## 3. 발견된 에러 전체 리스트

| 번호 | 페이지 | 컴포넌트 | 에러 내용 | 심각도 | 수정 여부 |
|------|--------|---------|-----------|--------|----------|
| 1 | 마이페이지 | `MyApplicationsTab.tsx` | 셀프 체크인 실패 시 `console.error`만 찍고 사용자 UI 피드백 없음 | 중 | ✅ 수정 |
| 2 | 전체 | `CustomerService.tsx` | 609줄짜리 파일이 완전 미사용 — 번들에 포함되지 않더라도 코드베이스 혼란 초래 | 낮음 | ✅ 삭제 |
| 3 | 전체 | `LandingPage.tsx` | 843줄짜리 구버전 랜딩 페이지 미사용 상태로 존재 | 낮음 | ✅ 삭제 |
| 4 | 전체 | `LogsMenu.tsx` | AdminPage에서 참조되지 않는 중복 어드민 메뉴 | 낮음 | ✅ 삭제 |
| 5 | 어드민 | `TargetMenu.tsx` | `const raw = data as any` — any 타입 사용 (1건) | 낮음 | 미수정 (리팩토링 범위) |
| 6 | 어드민 | `api.ts:645` | `let query: any` — 동적 쿼리 빌더용으로 불가피 | 낮음 | 미수정 (불가피) |
| 7 | 결과 페이지 | `ResultSeverance.tsx:709` | `result as any` — 정밀/간편 결과 타입 분기 처리 | 낮음 | 미수정 (타입 리팩토링 필요) |
| 8 | AdminPage | `500KB+ 번들 경고` | AdminPage 청크가 500KB 초과 (Recharts + 어드민 메뉴 전체 포함) | 낮음 | 미수정 (성능 개선 이슈, 기능에 영향 없음) |

---

## 4. 수정 완료 항목

### 4-1. 미사용 파일 삭제 (6개)
- `CustomerService.tsx`, `ProgressSummary.tsx`, `SkeletonCard.tsx`, `WhyCatchModal.tsx`, `LandingPage.tsx`, `LogsMenu.tsx`
- `git rm`으로 스테이징까지 완료

### 4-2. 셀프 체크인 UI 피드백 추가 (`MyApplicationsTab.tsx`)
- `actionToast` state 추가 (success/error 구분)
- 체크인 성공 시: "출근완료 처리되었습니다!" (초록 toast)
- 체크인 실패 시: "출근완료 처리에 실패했어요. 다시 시도해 주세요." (빨간 toast)
- 3.5초 후 자동 소멸

---

## 5. 미수정 항목 (이유)

| 번호 | 항목 | 미수정 이유 |
|------|------|------------|
| 5 | `TargetMenu.tsx` any 타입 | `recharts` 이벤트 객체 타입이 복잡하여 any 없이는 타입 에러 발생. 별도 리팩토링 필요 |
| 6 | `api.ts` 동적 쿼리 any | Supabase JS 클라이언트의 동적 where 체이닝에 any가 불가피 |
| 7 | `ResultSeverance.tsx` any | 정밀/간편 결과 union 타입 정의 리팩토링 필요. 현재 기능 동작에 영향 없음 |
| 8 | AdminPage 500KB 번들 | AdminPage 내 Recharts + 모든 어드민 메뉴 동적 분리 필요. 별도 스프린트 권장 |

---

## 6. 권장 후속 작업

1. **AdminPage 청크 분리** — `TargetMenu`(Recharts 포함)를 별도 lazy chunk로 분리하여 500KB 경고 해소
2. **`ResultSeverance.tsx` 타입 정리** — `PreciseResult | SimpleResult` union 타입 명확히 정의하여 `as any` 제거
3. **실제 채용공고 수집** — Phase 1 잔여 작업: 채용팀 연락 → 공고 데이터 입력
4. **GSC 나머지 URL 색인 요청** — progress.md P0 항목 (하루 2~3개씩)
5. **`api.ts` Supabase 동적 쿼리 타입** — `PostgrestFilterBuilder` 타입으로 리팩토링 가능성 검토

---

*보고서 생성: 2026-04-12 | 분석: Claude Sonnet 4.6*
