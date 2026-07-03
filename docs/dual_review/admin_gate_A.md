# 어드민 입장 게이트 보안 강화 — 독립 검증 (리뷰 A)

- 검증 일자: 2026-07-01
- 검증자: 리뷰어 A (독립 검증, 코드 수정 없음)
- 대상: `/admin` 진입 판정을 DB(admin_accounts) 등록·is_active 여부로만 판정하도록 교체
- TIER: 2 (인증/입장 게이트 변경 — auth 관련이므로 상향 적용)

---

## 1. 검증 방법 (실행 명령·인용)

### 1-1. 실제 변경 확인
```
git diff --stat HEAD
 .../src/components/admin/menus/ApplicantsMenu.tsx  |  15 ++-
 frontend/src/pages/AdminPage.tsx                   | 113 +++++++++++++++------
 frontend/tsconfig.tsbuildinfo                      |   2 +-
```
- 실제 소스 변경 파일 2개(AdminPage.tsx, ApplicantsMenu.tsx). tsconfig.tsbuildinfo는 빌드 산출물.
- `git diff HEAD` 로 두 파일의 전체 변경을 라인 단위로 실측함(아래 트레이스 참조).

### 1-2. 빌드 / 타입 검증
```
cd frontend && npm run build
...
✓ built in 10.58s
```
```
cd frontend && npx tsc --noEmit
EXIT: 0
```
- tsc 타입에러 0, 빌드 실패 0.
- 남은 경고는 `Some chunks are larger than 500 kB` (코드분할 관련 기존 경고)뿐이며, 이번 변경(입장 판정 로직)과 무관.
- unused import: SUPER_ADMIN_EMAIL import를 두 파일에서 제거했고 빌드/tsc 통과 → 미사용 import 경고 없음.

### 1-3. 잔여 사용처 grep
```
grep -rn "SUPER_ADMIN_EMAIL|VITE_ADMIN_EMAIL" frontend/src/
frontend/src/components/admin/AdminSidebar.tsx:19:export const SUPER_ADMIN_EMAIL = 'catchmasterdmin@gmail.com'
frontend/src/components/admin/menus/ApplicantsMenu.tsx:104: (주석)
frontend/src/pages/AdminPage.tsx:90: (주석)
frontend/src/pages/AdminPage.tsx:91: (주석)
frontend/src/pages/AdminPage.tsx:116: (주석)
```
- 라이브 사용처: **0건**. AdminSidebar.tsx:19의 `export` 정의 1건 + 주석 4건만 남음.
- `grep -n SUPER_ADMIN_EMAIL AdminSidebar.tsx` → 19번 export 정의 라인만 매치, 내부 사용 없음(export만 남아 dead export이나 컴파일/동작 무해).
- 신규 `any` 타입: 0건. 신규 `console.log`: 0건 (git diff 추가라인 grep 결과 no new any / no console.log).

---

## 2. 케이스별 입장 판정 트레이스 (AdminPage.tsx L86~171)

핵심 상태: `adminChecked`(검증완료 플래그), `adminRole`(DB 역할값 or null).
- `isAdmin = adminChecked && adminRole !== null` (L134)
- 리다이렉트 effect(L144~151): `adminChecked && !isAdmin` → `navigate(isLoggedIn ? '/home' : '/login', {replace:true})`
- 렌더 게이트(L167~171): `loading||!adminChecked` → `<AdminGateLoading/>`(스피너), `!isAdmin` → `<AdminGateDenied/>`

| # | 케이스 | 트레이스 | 판정 |
|---|--------|----------|------|
| 1 | 세션 로딩중 | `if(loading) return` → adminChecked 미변경(false) → 렌더게이트 `loading||!adminChecked` → `<AdminGateLoading/>` 스피너 | ✅ 스피너(하얀화면 아님) |
| 2 | 비로그인/게스트 | `if(!isLoggedIn||!user?.email){setAdminRole(null);setAdminChecked(true);return}` → isAdmin=false → 리다이렉트 effect `/login` | ✅ /login 리다이렉트 |
| 3 | 등록·활성 super_admin (마스터 포함) | DB 조회 → `data.is_active=true` → `setAdminRole('super_admin')` → isAdmin=true, isSuperAdmin=true → 통과 | ✅ 통과, 회귀 0 |
| 4 | 등록·활성 admin/viewer | DB 조회 → is_active=true → `setAdminRole(data.role)` (DB값 그대로) → 통과 | ✅ 통과 (역할 DB값) |
| 5 | **미등록 이메일** | DB 조회 0행 → maybeSingle()=null → `data?.is_active` falsy → `setAdminRole(null)` → isAdmin=false → 리다이렉트 `/home` | ✅ **차단→/home (핵심 수정 확인)** |
| 6 | 등록됐지만 is_active=false | `data.is_active=false` → `setAdminRole(null)` → 차단 | ✅ 차단 |
| 7 | DB조회 실패(네트워크) | `catch{ if(!cancelled) setAdminRole(null) }` + `setAdminChecked(true)` → 차단 | ✅ 안전측 차단 |

부가:
- supabase 클라이언트 없음: `if(!supabase){setAdminRole(null);setAdminChecked(true);return}` → 안전측 차단. ✅
- 하드코딩/env 단독 통과 경로: 완전 제거됨(이전 `email===SUPER_ADMIN_EMAIL`, `email===envAdminEmail` 블록 삭제). ✅

### 2-1. 레이스(세션 전환) 방지
- effect 진입 시 `setAdminChecked(false)` 로 재검증 시작(스피너 재표시).
- `let cancelled=false` + cleanup `return () => { cancelled = true }`.
- async 응답 반영 전 모두 `if(cancelled) return` / `if(!cancelled)` 가드 → 늦게 도착한 이전 세션 응답 무시.
- deps `[loading, isLoggedIn, user?.email]` → 세션(이메일) 변경 시 재실행. ✅ 레이스 방어 정상.

### 2-2. 과거 하얀화면 사고(lessons.md 2026-06-29) 재발 여부
- 모든 settled 경로(비로그인/게스트/supabase없음/DB성공/DB실패)에서 `setAdminChecked(true)` 세팅됨 → 영구 null 렌더 없음.
- `loading||!adminChecked` 시 null이 아니라 `<AdminGateLoading/>` 스피너 반환 → 하얀화면 원천 차단.
- 과거 실수(early-return 시 플래그 미설정) 반복 없음. ✅

---

## 3. ApplicantsMenu.tsx isSuperAdmin 판정 (L103~124)

- 이전: `email===SUPER_ADMIN_EMAIL || (envAdminEmail && email===envAdminEmail)` 즉시 통과 블록 → **삭제됨**.
- 현재: `if(!email) return` 후 `admin_accounts` 조회 → `row?.is_active && row.role==='super_admin'` 일 때만 `setIsSuperAdmin(true)`.
- 서버 판정 `is_super_admin()`(005 마이그레이션)과 정합: 서버는 마스터 이메일 강제 OR (role=super_admin AND is_active). 프론트는 DB만 보지만 마스터는 admin_accounts에 시드되어 있으므로 결과 동일. ✅

---

## 4. 마스터 계정 회귀 0 근거 (005_super_admin_setup.sql)

시드 라인 인용:
```sql
-- ── 5. 최초 슈퍼 관리자 등록 (이미 존재하면 skip) ──────────────────
INSERT INTO public.admin_accounts (email, role, display_name, is_active)
VALUES ('catchmasterdmin@gmail.com', 'super_admin', '최고 관리자', true)
ON CONFLICT (email) DO NOTHING;
```
- 마스터 `catchmasterdmin@gmail.com` 이 admin_accounts에 `super_admin`/`is_active=true` 로 등록됨.
- 따라서 DB 전용 판정으로 바꿔도 케이스 3 경로로 정상 통과 → 회귀 0.
- 서버측 `is_super_admin()` 도 마스터 이메일을 등록 없이도 강제 허용(L auth.email() = 'catchmasterdmin@gmail.com')하여 이중 안전망. ✅

---

## 5. 불변성 확인 (입장 판정만 바뀌었는지)

- 변경 소스 파일은 AdminPage.tsx, ApplicantsMenu.tsx **2개뿐**.
- supabase/migrations/, backend/app/services/, lib/supabase.ts, lib/api.ts, RLS 정책, 28일 블록/qualifying_days/세그먼트 계산로직 파일 — diff에 **포함 없음** → 불변.
- ApplicantsMenu의 데이터 조회/마스킹/revealApplicant 등 기능 로직 미변경(판정 useEffect만 수정).
- 어드민 메뉴 렌더/기능/권한별 화면 로직 미변경.
- 추가된 것은 `AdminGateLoading`/`AdminGateDenied` 표시 컴포넌트 2개(UI만) + 판정 로직 교체. ✅

---

## 6. BLOCKER

**BLOCKER: 0**

(참고 — 비차단 관찰 사항, 이번 변경과 무관/무해)
- `AdminSidebar.tsx:19` `export const SUPER_ADMIN_EMAIL` 은 이제 라이브 참조가 없는 dead export. 하드코딩 이메일 상수가 코드에 잔존하나 판정에는 미사용이라 보안 게이트에 영향 없음. 후속 정리 권장(선택).
- 빌드 청크 500kB 경고는 기존 이슈로 본 변경과 무관.

---

## 7. 최종 판정

| 항목 | 결과 |
|------|------|
| 빌드 (npm run build) | ✅ built in 10.58s |
| 타입 (tsc --noEmit) | ✅ EXIT 0 |
| 케이스 1~7 트레이스 | ✅ 전부 기대대로 |
| 핵심 수정(미등록 차단) | ✅ 확인 |
| 마스터 회귀 0 | ✅ 시드 확인 |
| 레이스 방지 | ✅ cancelled 플래그 |
| 하얀화면 재발 | ✅ 스피너로 차단 |
| 하드코딩/env 단독통과 잔존 | ✅ 라이브 0건(주석/dead export만) |
| RLS/계산로직/기능 불변 | ✅ diff에 없음 |
| 신규 any / console.log | ✅ 0 |

### 최종: **PASS** — BLOCKER 0, 배포 가능
