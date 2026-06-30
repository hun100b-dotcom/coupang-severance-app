# 어드민(/admin) 전역 에러 전수 인벤토리 (2026-06-30)

> **성격**: 조사 전용 — 발견만 기록. **코드 수정·커밋·배포 없음.**
> **방법**: ① 어드민 프론트 전 supabase/api 호출 grep 인벤토리 ② **라이브 Supabase(hmjxrqhcwjyfkvlcejfc) `pg_policies`·함수정의·`admin_accounts` 실데이터 직접 조회**(읽기 전용 MCP) ③ 기존 감사(`admin_function_audit_2026-06-29`, `admin_review_2026-06-30`)와 교차. 마이그레이션 파일이 라이브와 불일치(P1 등 일부는 파일 없이 MCP로만 적용)하므로 **판정 기준은 "라이브 DB 실측"**.

---

## 0. 가장 중요한 결론 — "에러가 너무 많다"의 정체는 **두 개의 서로 다른 세션 현실**

라이브 실측으로 확정된 핵심 사실:

| 사실 | 실측값 |
|---|---|
| 활성 관리자(`admin_accounts where is_active`) | **3명, 전원 `super_admin`** — `catchmasterdmin@gmail.com`, `dfc5238@naver.com`, **`hun100b@gmail.com`(종훈님)** |
| `role='admin'`(writer) 계정 | **0명** |
| `is_admin_writer()` 정의(라이브) | `is_super_admin() OR (admin_accounts.role='admin' AND is_active)` |
| `is_admin()` 정의 | `EXISTS(admin_accounts where email=auth.email() OR jwt email, is_active)` — **SECURITY DEFINER** |

→ **종훈님 실계정(hun100b@gmail.com)으로 OAuth 로그인하면 `is_admin()`·`is_super_admin()`·`is_admin_writer()`가 모두 true** → RLS상 어드민 전 메뉴 읽기·쓰기가 **허용**된다. 즉 **"RLS 강화가 종훈님 슈퍼관리자 세션을 직접 깨뜨리지는 않는다."**

그렇다면 에러는 어디서 오나? **세션 종류에 따라 완전히 다르다:**

| | **세션 A — 실 OAuth 슈퍼관리자** (hun100b@gmail.com, 진짜 JWT) | **세션 B — 가짜/로컬 슈퍼관리자** (프론트 게이트만 통과, 진짜 Supabase JWT 없음 → **anon**) |
|---|---|---|
| RLS 컨텍스트 | `authenticated` + is_admin/super/writer = true | `anon` (auth.email() = null) → 모든 admin 판정 false |
| 관리자 SELECT(profiles/inquiries/job_*/system_logs/audit_logs/admin_accounts) | ✅ 정상 | ❌ **0행/빈화면** (RLS roles=authenticated·is_admin 미충족) |
| 쓰기(notices/inquiries/job/notifications/settings/templates) | ✅ 성공(단 무음·표시버그 잔존) | ❌ **403 RLS violation** 또는 0행 |
| `logAdminAction`(audit_logs insert, 모든 행동·로그인마다) | ✅ 기록 | ❌ **매 행동마다 403** (입장 즉시 admin.login에서 403) |
| `.single()`(admin_accounts/system_settings) | ✅ 1행 | ❌ **406 PGRST116**(0행) |
| 백엔드(X-Admin-Token) /admin/settings·logs·blocked-ips·members·applications | 토큰 일치 시 ✅ | 토큰은 세션 무관(env) → ✅이나 콜드스타트/토큰불일치 시 ❌ |

> **결론**: 종훈님이 "메뉴 진입마다 네트워크 에러가 쏟아진다"고 보는 화면이 **세션 B(가짜/로컬, JWT 없음)**라면, 그 에러 폭주는 **RLS 강화의 정상 작동**(인증 안 된 요청 거부)이며 *프로덕션 버그가 아니다*. 반대로 **세션 A(실 슈퍼관리자)**에서도 남는 에러는 **진짜 결함**(아래 RC2·RC4·RC5 등)이다. **재개편 1단계는 반드시 "어느 세션에서 본 에러인지" 분리**다.

추가 잠재 위험(프로덕션): 종훈님이 **카카오 등으로 admin_accounts에 없는 이메일**로 로그인하면 프론트 게이트(`VITE_ADMIN_EMAIL`/하드코딩)는 통과하지만 RLS는 세션 B와 동일하게 전면 거부 → 프로덕션에서도 에러 폭주 가능(RC1).

---

## 1. 라이브 RLS 강화 변경점 (이번 의심 1순위) — 실측

| 테이블 | SELECT(현재) | 쓰기(현재) | 강화 전 대비 변화 | 프론트 영향 |
|---|---|---|---|---|
| `admin_accounts` | **`is_admin()`** (was `authenticated USING(true)`) | insert/update/delete `is_super_admin()` | **P2: 일반회원 명단열람 차단** | 비관리자/anon이 `.single()` 호출 시 0행 → **406**. 실관리자는 정상 |
| `inquiries` | `is_admin()` | update **`is_admin_writer()`** (was is_admin) | **P1: viewer 쓰기차단** | super OK / writer아님·anon = 403·0행 |
| `notices` | public(active OR is_admin) | ins/upd/del **`is_admin_writer()`** | P1 | super OK / 그외 403 |
| `job_postings` | admin `is_admin()` + active 공개 | ins/upd/del **`is_admin_writer()`** | P1 | super OK / 그외 403·0행 |
| `job_applications` | `is_admin()` | update **`is_admin_writer()`** | P1 | super OK / 그외 403·0행 |
| `notifications` | own | insert `(own OR is_admin_writer())` | **V3 + P1** | 지원자 확정알림: super OK / writer아님 403 |
| `system_settings` | **public `true`** | ins/upd/del **`is_admin_writer()`** | P1 | 읽기 누구나 / 쓰기 super OK·그외 403 |
| `inquiry_templates` | `is_admin()` | ins/upd/del **`is_admin_writer()`** | P1 | super OK / 그외 403·0행 |
| `legal_variables` | **public `true`** | ins/upd/del **`is_admin_writer()`**(p1b) | P1b | 읽기 누구나 / 쓰기 super OK |
| `profiles` | `(own OR is_admin())` | own | — | 대시보드 count: super OK / anon 0 |
| `reports` | **`auth.uid()=user_id` (own만, admin 정책 없음)** | own | — | ⚠️ **RC2: super도 본인 reports만** |
| `system_logs` | `is_admin()` | insert `is_admin()` | — | super OK / anon 0 |
| `audit_logs` | `is_admin()` | insert `is_admin()` | — | super OK / anon 403(insert)·0(select) |
| `admin_audit_logs`(레거시) | **`true`(authenticated)** | insert `is_admin()` | — | ⚠️ 누구나(로그인) 전체 열람(보안) |
| `visitor_logs` | **`true`** | insert true | — | ⚠️ 누구나 열람(보안), 동작은 정상 |
| `click_counter` | public true | — | — | 정상 |
| `user_access_logs` | own OR is_admin | own | — | super OK |
| `admin_secrets` | **정책 없음(deny-all)** | 〃 | member PII | 백엔드 service-role 전용(정상) |

> GRANT 레벨은 거의 모든 테이블이 anon·authenticated에 풀 권한 유지 → **유일한 게이트는 RLS**. 따라서 인증 컨텍스트(authenticated vs anon)가 모든 것을 결정.

---

## 2. 메뉴별 에러 전수표 (메뉴 × 호출 × 경로 × 세션별 결과 × 근본원인 × 위험도)

> 경로: **A**=supabase 직접(RLS 적용) · **B**=백엔드 FastAPI(X-Admin-Token→service-role, RLS우회) · **RT**=Realtime
> 세션결과: **A세션**=실 슈퍼관리자 / **B세션**=가짜·anon

| # | 메뉴 | 호출/기능 | 경로·테이블 | A세션 | B세션 | 근본원인 | 위험 |
|---|---|---|---|---|---|---|---|
| E1 | 대시보드/타겟/계산통계 | `getAdminStats`·`getAdminAnalytics`·`getTargetInsights`의 `reports` 집계 | A `reports.select` | ⚠️**본인 reports만**(과소집계) | ❌0행 | **RC2** reports admin SELECT 정책 부재 | **상** |
| E2 | 대시보드 | `profiles` count·`inquiries`·`job_postings` | A | ✅ | ❌0/부분 | RC1 | 중 |
| E3 | 대시보드 VisitorTab | `visitor_logs.select` | A | ✅ | ✅(공개) | — | 하 |
| E4 | 모든 메뉴(입장 시) | `logAdminAction('admin.login'...)` + 행동별 감사 | A `audit_logs.insert(is_admin)` | ✅기록 | ❌**매번 403** | RC1·RC3(무음 catch) | **상(B세션 폭주원)** |
| E5 | 채용공고 | 목록 `job_postings.select('*')` | A(is_admin) | ✅ | ❌0행 | RC1 | 중 |
| E6 | 채용공고 | 수정·섹션변경·soft삭제 `update().eq()` **(.select 없음)** | A(is_admin_writer) | ⚠️성공하나 무음 | ❌403/0행 | **RC3** | 중 |
| E7 | 지원자 | 슈퍼관리자 판정 `admin_accounts...single()` | A | ✅1행 | ❌**406** | RC4 | 중 |
| E8 | 지원자 | 목록 `getAdminApplications` | **B**(마스킹·토큰) | ✅ | 토큰 OK시 ✅ | RC5(토큰/콜드) | 중 |
| E9 | 지원자 | 상태변경 `job_applications.update`(.select('id') 있음) + `notifications.insert` | A(is_admin_writer) | ✅ | ❌403 | RC1 | 중 |
| E10 | 확정/채용현황/Summary | `job_postings`·`job_applications.select` | A(is_admin) | ✅ | ❌0행 | RC1 | 중 |
| E11 | 공지 | 추가/수정/토글/삭제 `notices.*` | A(is_admin_writer) | ✅ | ❌403 | RC1 | 중 |
| E12 | 문의 | 상태변경·답변 `inquiries.update` **(.select 없음 + refetch 없음)** | A(is_admin_writer) | ⚠️**무음+낙관적**→새로고침 시 원복 | ❌403 | **RC3** | **상** |
| E13 | 문의 | 목록 `inquiries.select` + 대기배지 Realtime | A·RT(is_admin) | ✅ | ❌0행·이벤트없음 | RC1·RC8 | 중 |
| E14 | 문의 | 템플릿 추가/삭제 `inquiry_templates.*` | A(is_admin_writer) | ✅ | ❌403/0행 | RC1·RC3 | 하 |
| E15 | 회원 | 목록·reveal `getAdminMembers`/`revealMember` | **B**(마스킹·토큰) | ✅ | 토큰 OK시 ✅ | RC5 | 중 |
| E16 | 관리자계정 | 목록·추가·역할·삭제 `admin_accounts.*` | A(select is_admin / 쓰기 super) | ✅(모범·에러표시) | ❌0행·403 | RC1 | 중 |
| E17 | 보안현황 | `admin_accounts.select`+백엔드 3종 | A+B(전부 try/catch) | ✅ | ⚠️부분실패 배너(우아) | RC1·RC5 | 하 |
| E18 | 서버로그 | `system_logs.select`+Realtime | A·RT(is_admin) | ✅ | ❌0행·이벤트없음 | RC1·RC8 | 중 |
| E19 | 감사로그 | `AuditMenu`→`audit_logs.select` | A(is_admin) | ✅ | ❌0행 | RC1 | 중 |
| E20 | 설정 | `getSettings`/`patchSetting`·`blocked-ips` | **B**(토큰) | 토큰OK ✅ | 토큰OK ✅ / 불일치 ❌401·콜드 ❌타임아웃 | **RC5** | 중~상 |
| E21 | 설정 | `SettingsMenu` `system_settings...single()` | A(public) | ✅(키있을때) | ✅/키없으면 406 | RC4 | 하 |
| E22 | 설정 CMS | `system_settings.upsert` 직접 | **A**(is_admin_writer) | ✅ | ❌403 | **RC6** 경로이원화 | 중 |
| E23 | 설정 Discord | `functions.invoke('notify-inquiry')` | Edge | 엣지배포시 ✅ | 〃 | RC5(엣지) | 하 |
| E24 | 설정 법정변수 | `legal_variables`(p1b writer) 또는 patchSetting | A/B | ✅ | ❌403/0행 | RC1·RC6 | **상(계산영향)** |

---

## 3. 근본원인 분류(RC) + 분포

| 코드 | 근본원인 | 설명 | 해당 항목 | 세션A 영향 | 세션B 영향 |
|---|---|---|---|---|---|
| **RC1** | **인증 컨텍스트 불일치** | 프론트 게이트(하드코딩/env)가 **진짜 Supabase JWT 없는 세션**(가짜/로컬/미등록 이메일)을 입장시킴 → anon → RLS 전면 거부 | E2,E4,E5,E9,E10,E11,E13,E14,E16,E18,E19,E24 | 없음 | **전면(폭주 주범)** |
| **RC2** | **reports admin SELECT 정책 부재** | reports는 `own`만 → 슈퍼관리자도 본인 것만 → 대시보드·타겟·계산통계 과소집계 | E1 | **있음(silent 오집계)** | 0행 |
| **RC3** | **무음 쓰기 실패** | supabase 직접 UPDATE/DELETE에 `.select()` 누락 → RLS 0행을 `error=null`로 삼킴 + 낙관적 갱신/refetch 누락(특히 문의) | E6,E12,E14 | **있음(거짓성공·UI원복)** | 403로는 드러남 |
| **RC4** | **`.single()` 0행 → 406** | admin_accounts/system_settings를 `.single()`로 조회 → 행 없으면 406 PGRST116 콘솔 오염 | E7,E21 | 경계상황만 | 발생 |
| **RC5** | **백엔드 토큰/콜드스타트/엣지** | X-Admin-Token 불일치 → 401, Render 콜드 → 타임아웃/502, Edge 미배포 → 실패 | E8,E15,E17,E20,E23 | 환경따라 | 환경따라 |
| **RC6** | **쓰기 경로 이원화** | 설정군이 일부는 백엔드(토큰·RLS우회), CMS/법정변수는 supabase 직접(RLS) → "일부만 저장" 불일치 | E22,E24 | 잠재 | — |
| **RC7** | **데드/중복/미연결** | 고아 컴포넌트·중복 감사테이블·미사용 백엔드 라우트(§4) | §4 | 혼선 | 혼선 |
| **RC8** | **Realtime 인증 컨텍스트** | 배지/시스템로그 Realtime이 anon에선 이벤트 없음·CHANNEL_ERROR 가능 | E13,E18 | 없음 | 발생 |

**분포 요약**: RC1(인증 컨텍스트)이 **항목 수·체감 에러량 1위**(전 메뉴) — 단 *세션 B에서만* 폭발. 세션 A(실관리자)에서 남는 **진짜 결함은 RC2(오집계)·RC3(무음/원복)·RC4(406)·RC5(백엔드)·RC6(이원화)**.

---

## 4. 버릴 것 — 데드/중복/미연결 (실측)

| 분류 | 대상 | 근거 | 처리 |
|---|---|---|---|
| 고아 컴포넌트 | `menus/JobsMenu.tsx` | 어디서도 import 안 됨(AdminPage 미사용) | 삭제 |
| 고아 컴포넌트 | `target/CompanyPieChart`·`UserTagsPanel`·`WageSegment`·`WorkDurationSegment` | import 0 (TargetMenu/TargetTab이 inline 대체) | 삭제 |
| 중복 테이블 | `audit_logs`(신·is_admin) vs `admin_audit_logs`(레거시·SELECT true) | 감사기록이 두 테이블로 분산, 레거시는 보안상 누구나 열람 | 단일화(audit_logs로) + 레거시 RLS 조임/폐기 |
| 중복 감사 뷰 | `AuditMenu`(A·audit_logs 직접) vs `ServerLogsMenu` 감사탭(B·/admin/logs) vs `SecurityMenu` 요약 | 같은 데이터 3경로 | 1경로(백엔드)로 통일 |
| 미사용 백엔드 | `/admin/inquiries/{id}/status|answer`·`/bulk-status`·`/templates/use` | 프론트가 호출 안 함(죽은 라우트) | 채택(프론트가 호출) 또는 제거 결정 |
| 별칭(정상) | `AuditLogsMenu = export from './AuditMenu'` | 정상 재export | 유지 |
| 표시 하드코딩 | 대시보드 `daily.clicks=0`(api.ts:437) | 항상 0 | 실데이터 연결 또는 컬럼 제거 |

---

## 5. 보안(에러는 아니나 같이 처리 권고)

| 항목 | 현재 | 위험 |
|---|---|---|
| `admin_audit_logs` SELECT `true` | 로그인 누구나 전체 감사 열람 | 중 |
| `visitor_logs` SELECT `true` | 로그인/anon 누구나 방문로그 열람 | 중 |
| `system_settings`·`legal_variables` SELECT public `true` | 누구나 설정값 열람(키값은 admin_secrets로 분리됨) | 하~중 |
| 하드코딩 super 이메일 백도어(`is_super_admin`/프론트 게이트) | catchmasterdmin 영구 super | 중 |

---

## 6. 재현·검증 가이드(다음 단계용)

1. **세션 분리 재현(필수 1단계)**: 동일 메뉴를 ① 실 OAuth 슈퍼관리자(hun100b@gmail.com)와 ② 가짜/로컬 세션에서 각각 진입해 콘솔/네트워크 비교. 대부분의 4xx가 ②에서만 나오면 RC1(테스트 노이즈)로 확정.
2. **RC2 확인**: 실관리자로 대시보드 reports 수치 vs 라이브 `select count(*) from reports`(=7) 비교 → 과소면 확정.
3. **RC5 확인**: 네트워크 탭에서 `/admin/settings`·`/admin/logs`·`/admin/blocked-ips` 응답코드(401=토큰, 502/타임아웃=콜드).
4. 본 인벤토리는 라이브 RLS·admin_accounts 실측 기반 — runtime 캡처는 위 분리 재현으로 보강.

---

## 7. 런타임 실측 보강 — 로컬 라이브 브라우저 캡처 (2026-07-01 추가)

> 위 §0~§6은 **라이브 DB(MCP) + 코드 정독** 기반. 본 §7은 §6이 요청한 **runtime 캡처**를 실제 수행한 결과다.
> 방법: 로컬 dev(Vite, 5173) 실구동 → progress.md 레시피로 **가짜 슈퍼관리자 세션 주입**(프론트 게이트만 통과, 진짜 Supabase JWT 없음 = **세션 B = anon**) → 전 14메뉴 진입하며 브라우저 콘솔/네트워크 실측. **로컬 백엔드(FastAPI) 미가동** 상태(=경로 B도 실패하는 최악 조건).

### 7-1. 세션 B 예측의 경험적 실증 (✅ §0 모델과 정확히 일치)

| §0 예측(세션 B) | 런타임 실측 | 일치 |
|---|---|---|
| 경로 A 관리자 SELECT → anon 거부 | `profiles`·`reports`·`inquiries`·`job_postings`·`click_counter`·`system_settings`·`notices` 등 **전부 401** | ✅ |
| `logAdminAction` 입장 즉시 거부 | `POST .../rest/v1/system_logs → 401`, audit_logs insert도 무음 catch | ✅ |
| `.single()` 0행 → 4xx | `system_settings?key=permission_levels`·`admin_accounts` 조회 401(가짜 토큰은 401, 실 anon이면 406) | ✅ |
| auth 검증 실패 | `GET /auth/v1/user → 403`, 콘솔 `[AuthContext] JWT cryptographic operation failed` | ✅ |
| 경로 B는 토큰(세션무관)이나 서버 없으면 실패 | `GET /api/health → 500`, `회원 목록 500`, `설정 500`, `Audit Logs 500` | ✅ |

→ **종훈님이 "메뉴마다 네트워크 에러 폭주"로 본 화면이 이 세션 B(로컬/가짜/미등록 이메일)라면, 그 에러는 RLS·인증의 정상 작동이지 프로덕션 결함이 아니다**(§0 결론 재확인). 핵심 후속조치 = **반드시 실 OAuth 슈퍼관리자(hun100b@gmail.com)로 프로덕션 재현**해 세션 A에서 남는 에러만 추려야 한다.

### 7-2. 코드만으론 단정 못 했던 신규 확정 사실

| 발견 | 실측 | 의미 |
|---|---|---|
| **렌더 크래시 0건** | 14개 메뉴 전부 진입 시 root 유지·React 에러바운더리/TypeError/하얀화면 **0**. 데이터 실패해도 "에러배너/빈상태/재시도"로 **graceful 저하** | 셸·레이아웃은 건강. 문제는 100% "데이터 계층"이지 "UI 깨짐"이 아님 |
| **설정 메뉴 단일 실패점(RC4 보강)** | `/admin/settings` 500 1건 → SettingsMenu가 **IP·Discord·CMS·법정변수·마스킹키·권한레벨 전 섹션을 통째로 숨기고** "⚠️ 설정 로드 실패 + 재시도"만 표시 | `SettingsMenu.tsx:294` `Promise.all([loadSettings,…])`에서 loadSettings만 try/catch 부재 → 설정 전체가 이 한 호출에 인질 |
| **AccountsMenu 에러 직렬화 불량** | 콘솔 `계정 목록 불러오기 실패: [object Object]` | 객체를 문자열화 안 함 → 디버깅 난이도↑(RC: §3 로깅품질) |
| **Members/지원자 reveal는 서버측 마스킹 동작** | 회원 메뉴에 "개인정보는 서버에서 마스킹되어 전달됩니다(평문은 브라우저로 내려오지 않음)" 안내 렌더 | PII 재설계가 프론트에 정상 반영됨 |
| **선행감사 무효 항목 재확인** | 공지(NoticesMenu)·문의 쓰기는 이미 수리된 경로(공지 `.select()` 추가 / 문의 백엔드 이전)임을 코드로 확인 | `admin_function_audit_2026-06-29`의 해당 "무음실패" 결론은 **현재 무효** |

### 7-3. 라이브 런의 한계(정직한 명시)
- 가짜 JWT라 경로 A는 **전부 401**(실 anon의 403/406과 코드만 다름) → "진짜 RLS 거부 vs 토큰무효"를 런타임만으로 구분 불가. **그래서 §1의 라이브 DB 실측이 RLS 판정의 1차 근거**고, 본 §7은 "세션 B에서 에러가 실제로 폭주한다 + 크래시는 없다"의 **현상 확증** 역할.
- 로컬 백엔드 미가동이라 경로 B 500은 아티팩트. 프로덕션은 Render를 가리키므로 **RC5(콜드/토큰)는 별도로 Render `/health`·응답코드로 확인** 필요(§6-3).

---

*본 문서는 조사 결과만 담는다. 코드/DB 수정·커밋·배포는 수행하지 않았다. (§0~§6: 이전 세션 라이브 DB 실측 / §7: 2026-07-01 런타임 캡처 보강)*
