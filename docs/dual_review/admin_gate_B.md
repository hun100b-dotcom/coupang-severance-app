# 어드민 입장 게이트 보안 강화 — 독립 검증 리뷰 B (적대적 관점)

- 대상 커밋: `5306964 fix(admin): 어드민 입장 게이트 DB 검증 강화 — 미등록 이메일 차단`
- 변경 파일: `frontend/src/pages/AdminPage.tsx`, `frontend/src/components/admin/menus/ApplicantsMenu.tsx`
- 검증일: 2026-07-01
- 검증자: 리뷰 B (리뷰 A와 독립, 결함 사냥 목적)
- 결론 요약: **BLOCKER: 0 · 최종 판정 PASS (조건부 — 배포 전 DB 확인 1건 필수)**

---

## 1. 검증 방법 (실행 명령 · 인용)

### 1-1. 실제 diff 확인
- `git diff HEAD` 및 `git show HEAD --stat` 으로 변경 범위 확인.
- 소스 변경 2파일(`AdminPage.tsx +113/-`, `ApplicantsMenu.tsx +15`) 외에 `frontend/tsconfig.tsbuildinfo`(빌드 캐시, 자동 생성물)만 존재.
- **의도 외 변경 없음**: 어드민 기능/데이터/RLS/계산 로직 파일은 diff에 없음. 마이그레이션(`supabase/migrations/*`), 계산 로직, RLS 정책 전부 불변.

### 1-2. 빌드 · 타입 검증 (직접 실행)
```
$ npm --prefix frontend run build       # 스크립트: "tsc -b && vite build"
...
✓ built in 10.38s
```
- `tsc -b`(타입체크)와 `vite build`(번들)가 **에러 없이 종료(exit 0)**.
- `SUPER_ADMIN_EMAIL` import 2곳을 제거했음에도 `noUnusedLocals`/`noUnusedimports` 계열 에러 없음 → **미사용 import/변수 잔존 없음** 확인.
- 신규 컴포넌트 `AdminGateLoading`/`AdminGateDenied` 가 사용하는 테마 토큰(`UP.page`, `UP.sub`, `UP.hair`, `UP.brand`, `UP.navy`, `UP.dangerBg`, `UP.dangerLine`)이 `adminTheme.ts` 에 전부 존재함을 grep 로 대조 확인 → 런타임 `undefined` 스타일 없음.

### 1-3. 우회 경로 전수 grep
```
$ grep -rn "SUPER_ADMIN_EMAIL|VITE_ADMIN_EMAIL" frontend/src
```
- `AdminPage.tsx`: **주석에만** 잔존(설명용). 실행 코드 경로 없음.
- `ApplicantsMenu.tsx`: **주석에만** 잔존.
- `AdminSidebar.tsx:19`: `export const SUPER_ADMIN_EMAIL = '...'` 상수 **선언은 남아있으나 어디서도 게이팅에 사용되지 않음**(참조 0건). 죽은 export — 기능상 무해, 정리 권고(경고 W1).

### 1-4. super-only 게이팅 정합성 grep
- `isSuperAdmin` 소비처: `AccountsMenu`, `MembersMenu`, `SettingsMenu`(전부 AdminPage prop 주입), `ApplicantsMenu`(자체 판정). 전부 **DB `role==='super_admin' && is_active` 파생**으로 통일됨.

### 1-5. 회귀(super 3명) 근거 대조
- `supabase/migrations/005_super_admin_setup.sql:66-68` 시드 대상 = `catchmasterdmin@gmail.com` **단 1명**.
- `grep dfc5238|hun100b supabase/migrations/` → **INSERT 없음**(다른 2명은 마이그레이션 시드 대상 아님).
- `docs/audit/admin_error_inventory_2026-06-30.md:14` 인용: "활성 관리자 = **3명, 전원 super_admin** — catchmasterdmin@gmail.com, dfc5238@naver.com, hun100b@gmail.com".
- Supabase MCP 미연결 → **라이브 DB 직접 조회 불가**. 위 인용은 2026-06-30 스냅샷 문서 근거일 뿐, 현시점 라이브 상태 보증 아님.

---

## 2. 발견 사항 · 케이스별 판정 표

| # | 검증 항목 | 판정 | 근거 |
|---|-----------|------|------|
| 1 | 의도 외 변경(기능/데이터/RLS/계산) | **PASS** | diff 2파일 + 빌드캐시. RLS·마이그레이션·계산 로직 불변 |
| 2 | 빌드/타입 통과 | **PASS** | `tsc -b && vite build` exit 0, 10.38s. 미사용 import 에러 없음 |
| 3 | 하드코딩/`VITE_ADMIN_EMAIL` 단독 통과 잔존 | **PASS** | grep 결과 주석에만 존재. 실행 경로 0건 |
| 4 | 미등록 이메일이 셸(실제 어드민 UI)에 도달 | **PASS** | `maybeSingle()=null → adminRole=null → isAdmin=false → return <AdminGateDenied/>`. UI 렌더 도달 불가 |
| 5 | 하얀 화면 재발(adminChecked 영구 false) | **PASS** | 모든 조기 return 분기가 `setAdminChecked(true)`. 로딩엔 `<AdminGateLoading/>`, 실패엔 `<AdminGateDenied/>`. `return null` 완전 제거 |
| 6 | 레이스/cleanup(cancelled) | **PASS** | `cancelled` 플래그 + `return () => { cancelled = true }`. 늦게 온 응답이 `setAdminRole` 못 함 |
| 7 | 이펙트 의존성 배열 | **PASS** | `[loading, isLoggedIn, user?.email]` — 세션 전환 트리거 정확. `supabase`(모듈 싱글턴)·`navigate` 미포함 무해 |
| 8 | `isSuperAdmin` 서버 정합 / 커스텀 role 안전측 | **PASS** | 프론트 `role==='super_admin'` 엄격비교. 서버 `is_super_admin()`도 `role='super_admin'` 정확일치. 커스텀 role 문자열이면 양쪽 다 false(안전측=super기능 숨김) |
| 9 | try/catch 실패 시 처리 | **PASS** | 조회 예외 → `setAdminRole(null)`(안전측 차단). 콜드스타트/네트워크 실패 시 입장 불가 = 보안상 올바른 방향 |
| W1 | `SUPER_ADMIN_EMAIL` 죽은 export | **경고(무해)** | `AdminSidebar.tsx:19` 상수가 참조처 없이 남음. 재도입 유혹 방지 위해 삭제 권고. 차단 아님 |
| W2 | super 3명 중 2명 DB 미시드 | **경고(조건부)** | ↓ 3장 참조 |
| W3 | DB 조회 실패 시 정상 관리자 일시 잠금 | **경고(설계상 트레이드오프)** | Render 콜드스타트/일시 네트워크 오류 시 실관리자도 `AdminGateDenied`→리다이렉트. 보안 우선 설계라 의도된 동작이나, 재시도 없이 즉시 홈 이탈은 UX 저하. 차단 아님 |

---

## 3. super_admin 3명 회귀 리스크 평가 (핵심)

이번 변경의 **유일한 실질 리스크**. 과거엔 `email === VITE_ADMIN_EMAIL` 만으로도 셸 입장이 가능했으므로, `admin_accounts` 에 **행이 없고 오직 환경변수로만 통과해오던** 관리자가 있었다면 이번 변경으로 **영구 잠김**.

- **마스터(`catchmasterdmin@gmail.com`)**: `005_super_admin_setup.sql:66-68` 이 `is_active=true, super_admin` 으로 시드 → **안전. 잠기지 않음.**
- **나머지 2명(`dfc5238@naver.com` 카카오, `hun100b@gmail.com` 구글)**:
  - 어떤 마이그레이션도 이 둘을 INSERT 하지 않음(grep 확인). → 존재한다면 **런타임 수동 등록(AccountsMenu)** 으로만 들어간 것.
  - `docs/audit/admin_error_inventory_2026-06-30.md:14` 는 이 둘이 `is_active=true super_admin` 으로 **이미 존재한다고 기록**. `docs/design/p1_role_matrix.md:95` 도 "현재 관리자 3명 전부 super면 영향 0" 이라고 이 리스크를 사전 분석함.
  - **그러나** 이는 2026-06-30 문서 근거이며, 리뷰 B는 라이브 DB를 직접 조회하지 못했음(Supabase MCP 미연결). 문서와 실제 DB가 어긋날 가능성을 배제 불가.

### 판정 논리
- **문서가 정확하다면(3명 전부 DB 등록·활성)** → 회귀 리스크 실현 안 됨. **BLOCKER 아님.**
- **만약 2명 중 누구라도 `admin_accounts` 에 없거나 `is_active=false` 라면** → 배포 즉시 해당 계정 **완전 잠금 = 운영자 락아웃**. 이 경우 실차단이므로 **BLOCKER 승격**.

→ 이 불확실성은 **코드 결함이 아니라 데이터 확인 미완**의 문제. 배포 직전 아래 SQL 1회 실행으로 100% 해소 가능하며, 실행 없이 배포하면 조건부 BLOCKER가 실현될 수 있음. 따라서 **"배포 전 필수 게이트"** 로 명시.

```sql
-- 배포 전 반드시 실행 (Supabase SQL Editor):
SELECT email, role, is_active
FROM public.admin_accounts
WHERE email IN ('catchmasterdmin@gmail.com','dfc5238@naver.com','hun100b@gmail.com');
-- 기대: 3행, 전부 role='super_admin' AND is_active=true.
-- 2명 미만이거나 is_active=false 가 있으면 → 배포 보류. 먼저 INSERT/활성화 후 배포.
```

---

## 4. 추가 관찰 (경고 · 비차단)

- **W3 (콜드스타트 UX)**: DB 조회가 네트워크 오류로 실패하면 실관리자도 `catch → adminRole=null → 리다이렉트`. Track A-1 에서 호출계층 콜드스타트 재시도를 넣었으나, 이 게이트 이펙트의 `supabase.from()` 직접 호출에는 재시도 래핑이 없음. 보안 방향(fail-closed)은 옳으나, 후속으로 1~2회 재시도 후 차단하면 오탐 잠금 UX 개선 여지. **차단 아님.**
- **W1 (죽은 export)**: `AdminSidebar.tsx:19 SUPER_ADMIN_EMAIL` 미사용 상수. 후속 정리 권고.
- **긍정 확인**: `AdminGateDenied` 는 `loggedIn` 분기로 "홈/로그인" 안내를 정확히 구분. 리다이렉트 이펙트(`navigate(isLoggedIn ? '/home' : '/login', {replace:true})`)와 문구 정합. `replace:true` 로 뒤로가기 루프 방지도 유지됨.

---

## 5. 최종 판정

- **BLOCKER: 0**
  - 코드 레벨 결함(우회 경로·하얀 화면·타입 에러·레이스)은 **전부 PASS**. 차단 사유 0건.
  - super 3명 회귀는 **코드 결함이 아닌 데이터 확인 사항**으로, 문서상 근거(3명 전원 DB 등록)로는 리스크 미실현. 단, 라이브 DB 미조회로 확정 못 했으므로 **조건부 경고(W2)** 로 분류하고 배포 전 SQL 확인을 필수 게이트로 지정.

- **최종: PASS (조건부)**
  - 조건: 배포 직전 3장의 SQL 로 3명 전원 `is_active=true super_admin` 확인. 확인되면 무조건 PASS. 2명 미만/비활성 발견 시 그 시점에 BLOCKER 로 승격하고 배포 보류.
