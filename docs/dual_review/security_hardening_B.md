# 보안 하드닝 — Review B (적대적 Red-team 실증 검증)

- 대상 브랜치: `security/hardening` (작업트리 미커밋 변경)
- 검증 기준: `main` (6c82c0f) 대비 working-tree diff + 직접 grep/build/파일읽기
- 검증자 관점: **깨뜨리려는 공격자** — 추측이 아닌 재현 경로로만 BLOCKER 판정
- 변경 범위:
  - 마이그레이션 5개: `20260630_v1_user_profiles_anon_revoke.sql`, `_v2_admin_audit_logs_insert_admin.sql`, `_v3_notifications_insert_restrict.sql`, `_v4_revoke_securitydefiner_exec.sql`, `_v6_function_search_path.sql`
  - 코드: `backend/app/api/admin.py`(`/admin/profiles/masked-lookup` 신규), `frontend/src/lib/api.ts`(`lookupMaskedProfiles`), `frontend/src/components/admin/tabs/VisitorTab.tsx`(평문→마스킹 전환)

> ⚠️ 환경 제약: 라이브 Supabase DB에 직접 쿼리할 수 없음(MCP/접속 미사용). DB 상태에 의존하는 가설(특히 V1 심각도)은 **마이그레이션 기록 + 코드 grep으로 추론**했고, 그 한계를 각 항목에 명시한다.

---

## 1. 공격 가설별 성공/실패 표

| # | 공격 가설 | 시도 결과 | 재현 근거 |
|---|-----------|----------|----------|
| 1 | V1 우회 — REVOKE+invoker 이후에도 anon이 회원 이메일 읽을 다른 경로 존재 | **실패(우회 못 함)** + 심각도 의문 | grep `user_profiles` 코드 0건. 마이그 003/004 어디에도 anon GRANT 없음. 004 뷰 본문에 `WHERE public.is_admin()` 존재 |
| 2 | V1 기능파괴 — user_profiles 뷰를 쓰는 실코드 누락 | **실패(파괴 없음)** | `grep -rn user_profiles` → 프론트/백엔드 코드 참조 0건. 뷰는 dead 객체 |
| 3 | V2/V3 무음실패 — 미등록 관리자가 확정/거절 시 notifications insert 실패 → UI 거짓성공 | **부분 성공이나 V3 신규 회귀 아님** | ApplicantsMenu UPDATE가 이미 `is_admin()` 요구 → 미등록자는 알림 전 단계에서 throw. warn-only 패턴은 기존 코드 |
| 4 | V3 정책 허점 — 일반 유저가 본인에게 임의 알림 무한 스팸 | **성공(가능)** but 저영향 | `WITH CHECK (auth.uid()=user_id OR is_admin())` — 본인 user_id 알림 무제한. 단 타인 타깃 불가, 기존(`true`)보다 강함 |
| 5 | V4 과잉/과소 — `on\_%` 패턴이 무관 함수 EXECUTE 회수로 트리거 파괴 / is_admin 건드림 | **실패(파괴 없음)** | 트리거 함수는 발화 시 테이블 소유자 권한 실행 → 호출자 EXECUTE 무관. is_admin/is_super_admin 명시 제외. RPC 호출 코드 0건 |
| 6 | V5 마스킹 우회 — UUID 필터로 PostgREST in.() 인젝션, 평문 잔재 | **실패(인젝션 차단)** but 다른 평문경로 잔존 | `all(c in "0-9a-fA-F-")`로 콤마/괄호/따옴표 전부 차단. VisitorTab 평문 잔재 0. **단 ApplicantsMenu는 여전히 평문 select(미수정·스코프 외)** |
| 7 | 마이그레이션 멱등성/순서 — 2회/임의순서 실행 안전성, 한글 정책명 일치 | **대체로 안전** | 한글 정책명 `인증된 사용자 삽입 허용` 라이브와 정확 일치(20260410). DROP-first로 재실행 안전. 단 is_admin() 선행 의존 |
| 8 | 빌드 무결성 — `npm run build` 깨지나 | **실패(안 깨짐)** | `✓ built in 9.49s`, TS 에러 0, VisitorTab 정상 컴파일. admin.py `ast.parse` OK, BaseModel import 확인 |

---

## 2. 항목별 실증 상세

### V1 — anon 회원 이메일 노출 차단 (보고서: 🔴 치명)

**기능파괴 검증 → 통과.** `grep -rn user_profiles` 결과 프론트/백엔드 실코드 참조 **0건**. 회원 목록은 이미 백엔드 `/admin/members`(service-role + 서버 마스킹)로 대체됨. 뷰 권한을 전면 회수해도 끊길 기능 없음 → 보고서 "dead 객체" 주장 사실.

**우회 검증 → 추가 노출 경로 못 찾음.** auth.users/email을 클라이언트로 흘리는 다른 뷰/RPC를 grep으로 탐색했으나, 코드에서 auth.users 직접 노출 경로는 이 뷰 외 없음.

**⚠️ 심각도(🔴 치명)에 대한 적대적 반론 — MAJOR로 확인 권고:**
- 마이그레이션 기록상 `003_user_profiles_view.sql`은 `GRANT SELECT ... TO authenticated`만 부여하고 **anon에는 GRANT한 적이 없다.** PostgREST에서 anon이 뷰를 읽으려면 anon 역할에 SELECT가 있어야 하는데 그 근거가 마이그레이션에 없음.
- `004_security_rls.sql`(157~165줄)은 뷰를 `WHERE public.is_admin()`로 재정의했다. SECURITY DEFINER 하에서 anon 호출이면 `auth.email()`=null → `is_admin()`=false → **anon은 0행만 받는다.**
- 즉 "비로그인자가 한 번에 가입자 전원 이메일 수집"이라는 🔴 치명 시나리오는 **현재 마이그레이션 정의 기준으로는 재현되지 않는다.**
- **단 결정적 한계:** 라이브 뷰가 대시보드 수동 편집으로 003 정의(WHERE 없음)로 드리프트했거나 anon이 별도 GRANT됐을 가능성은 DB 미접속으로 배제 불가. 이 경우엔 진짜 🔴이다.
- **결론:** V1 마이그레이션 자체는 무해·정확한 심층방어(defense-in-depth). 단 BLOCKER가 아니라, "라이브 뷰 정의/anon GRANT/anon curl 실증" 3종 확인 후에야 심각도를 확정할 수 있는 **MAJOR(검증 필요)**. 보고서가 첨부한 적용 전 확인 쿼리(curl + role_table_grants)를 반드시 1회 돌려 실측 첨부할 것.

`security_invoker=on` 부작용 검증: invoker 전환 시 뷰 본문 `is_admin()`이 호출자 기준 평가 → 로그인 admin이면 정상 true. 그러나 REVOKE로 authenticated SELECT가 사라져 어떤 클라이언트도 뷰 자체를 못 읽음. **코드가 안 쓰므로 어드민 정상조회를 깨뜨리지 않음.** (가설1 후반 "invoker가 어드민 조회 깸" → 실패)

### V2 — admin_audit_logs INSERT 위조 차단

원본 정책명 `audit_logs_insert` / `WITH CHECK (true)` 확인(002_admin_audit_logs.sql 30~33줄). V2의 `DROP POLICY IF EXISTS "audit_logs_insert"` 정확 일치.
실사용 감사 테이블은 `audit_logs`(백엔드 `_write_audit`→service-role)이며 `admin_audit_logs`는 미사용 → 조여도 끊길 경로 없음. **무음실패/기능파괴 모두 재현 안 됨.**

### V3 — notifications INSERT 본인/관리자 제한

**가설3(무음실패) 실증:** ApplicantsMenu `handleUpdateStatus`(192~248줄) 흐름:
1. `job_applications UPDATE ... .select('id')` (205~209줄). 이 테이블 UPDATE 정책은 `applications_update_admin`=`USING/WITH CHECK (is_admin())` (20260629_fix 45~49줄).
2. 행 0건이면 213줄에서 명시적 throw → **거짓성공 차단됨.**
3. 그 다음에야 notifications insert(220줄) 도달.

→ **미등록 관리자(is_admin=false)는 1단계 UPDATE부터 막혀 throw**되므로 알림 insert까지 못 간다. V3가 "미등록 관리자 알림 무음실패"라는 **신규 회귀를 만들지 않는다.**
정상 등록 관리자(admin_accounts is_active=true)는 UPDATE·알림 둘 다 is_admin()=true로 통과 → 무회귀.
잔여: 등록 관리자라도 알림 insert가 무관 사유로 실패하면 `console.warn`만 하고 성공 토스트(230줄) — **그러나 이 warn-only 패턴은 기존 코드(이번 변경 무관)**. → **MINOR(기존 이슈)**.

### V4 — SECURITY DEFINER/트리거 함수 EXECUTE 회수

**가설5 실증:** `proname LIKE 'on\_%'` 패턴. 우려는 트리거 함수 EXECUTE 회수로 트리거가 깨지는 것 — 그러나 트리거 함수는 트리거 발화 시 **테이블 소유자 권한**으로 실행되므로 호출자(anon/authenticated) EXECUTE와 무관하게 동작한다(Postgres 표준 동작). `grep` 결과 프론트/백엔드 `.rpc(`/`/rpc/` 호출 **0건** → 직접 호출 경로도 없음. is_admin()/is_super_admin()은 회수 대상에서 명시 제외(18~19줄 주석 + 패턴 비매칭) → **RLS 평가 안 깨짐.**
과소 위험: `on\_%` 외 SECURITY DEFINER 함수가 더 있을 수 있으나, V6가 search_path를 모든 public 함수에 고정하므로 잔여 표면은 V6가 일부 보완. **재현 가능한 파괴 없음.**

### V5 — `/admin/profiles/masked-lookup` 마스킹 + 인젝션 차단

**가설6 실증:**
- 인젝션: 화이트리스트 `all(c in "0123456789abcdefABCDEF-")` → 콤마·괄호·따옴표·점·`*`·공백 전부 탈락. `in.(...)` 구조 분해 불가. `,` 조인은 서버 내부 통제. **PostgREST in.() 인젝션 재현 실패.**
- 빈/대량: 빈 입력→`{"profiles":{}}`(early return). `[:1000]` 상한. 비-UUID이지만 hex/dash로만 된 문자열(예 `0`, `---`)은 통과하나 PostgREST uuid 컬럼 캐스팅 실패→400→`rows=[]`(상태코드 가드). 무해.
- 평문 잔재: VisitorTab은 화면(234~235줄)·XLSX(110~114줄) 모두 마스킹된 `l.profile`만 사용. `lookupMaskedProfiles`만 호출, `supabase.from('profiles')` 직접조회 제거 확인. **VisitorTab 평문 잔재 0.**
- 마스킹 함수: `_mask_email`/`_mask_name`(900~919줄) 로컬 2글자+별표, 도메인 유지 — 평문 복원 불가. 건전.

**⚠️ 다른 평문 PII 경로(미수정) — MAJOR(기존 이슈):**
`ApplicantsMenu.tsx` 156~159줄이 여전히 `supabase.from('profiles').select('id, full_name, email').in('id', userIds)`로 **평문** 조회. profiles RLS는 `profiles_select_own`=`auth.uid()=id OR is_admin()`(004 142~148줄)이라, **등록 관리자가 지원자관리 화면을 열면 전 지원자 실명·이메일이 브라우저 Network에 평문으로 내려온다.** V5가 VisitorTab만 고치고 동일 클래스의 ApplicantsMenu는 그대로 둠. 보고서가 "이번 미수정·스코프 외"로 인지하고 있으나, 동일 위험이 남아있음을 명시. (이번 변경의 회귀는 아님 → BLOCKER 아님, 후속 MAJOR)

### V7 — 멱등성/순서/정책명

- 한글 정책명: 라이브 원본 `인증된 사용자 삽입 허용`(20260410_notifications 35줄, `WITH CHECK (true)`)과 V3 DROP **정확 일치.** 정책 제거 실패로 인한 잔존 위험 없음.
- 멱등: V2/V3는 DROP IF EXISTS→CREATE(2회 실행 시 2번째 DROP이 새 이름 제거 후 재생성 → 안전). V4/V6는 REVOKE/ALTER 루프(본질 멱등). 5개 임의 순서 실행 시 V1~V6 상호 의존 없음.
- **선행 의존(MINOR):** V2/V3는 `public.is_admin()`을, V4/V6는 함수 존재를 전제. is_admin()이 없는 DB(004 미적용)에서 V2/V3 실행 시 CREATE POLICY가 함수 부재로 실패. 실서비스엔 004가 오래전 적용돼 있어 현실 위험은 낮으나, "004 선행 적용 필요"를 헤더에 명시 권장.

### V8 — 빌드

`cd frontend && npm run build` → `✓ built in 9.49s`, 청크 사이즈 경고만(무관), TS 에러 0. VisitorTab 신규 import 정상. 백엔드 `python -m ast` 파싱 OK, `from pydantic import BaseModel`(22줄) 존재. **빌드 무결성 통과.**

---

## 3. BLOCKER / MAJOR / MINOR

### 🔴 BLOCKER: 0건
재현 가능한 기능파괴·신규 보안회귀 없음. 빌드·구문 정상. 모든 마이그레이션 비파괴·가역.

### 🟠 MAJOR (권고 — 머지 차단은 아니나 후속 필수)
1. **V1 심각도 실측 미확정.** 마이그레이션 정의 기준으로는 anon 이메일 일괄수집이 재현되지 않음(anon GRANT 부재 + 뷰 본문 `WHERE is_admin()`). 🔴 치명 등급은 라이브 뷰 정의·anon GRANT·anon curl 실측으로만 확정 가능. 보고서의 적용 전 확인 쿼리/curl 결과를 첨부해 등급 검증할 것. (마이그레이션 자체는 무해하므로 적용은 안전)
2. **ApplicantsMenu 평문 PII 잔존(동일 클래스, 미수정).** `ApplicantsMenu.tsx` 156~159줄이 등록 관리자에게 전 지원자 실명·이메일을 평문으로 Network 전송. V5와 같은 유형인데 이번 스코프에서 제외됨 — 후속 마스킹 lookup 전환 필요.

### 🟡 MINOR
1. **V3 자기-알림 스팸 가능(저영향).** 일반 유저가 본인 user_id로 임의 type/title 알림 무제한 생성 가능. 단 타인 타깃 불가하고 기존 `WITH CHECK(true)`보다 명백히 안전. 필요 시 self-insert rate-limit 또는 type 화이트리스트 검토.
2. **ApplicantsMenu 알림 warn-only(기존 이슈).** 등록 관리자라도 알림 insert 실패 시 콘솔 경고만 하고 성공 토스트. 이번 변경 무관, 기존 패턴.
3. **마이그레이션 is_admin() 선행 의존.** V2/V3/V4/V6는 004(is_admin) 선행 적용 전제. 헤더에 "004 선행 필요" 명시 권장.
4. **VisitorTab 마스킹 조회 실패 시 console.warn만(82줄)** → 프로필 빈칸으로 폴백. 거짓성공 아님(데이터만 누락) → 경미.

---

## 최종 판정

**PASS — BLOCKER 0건.** (MAJOR 2: V1 라이브 실측 첨부 권고 + ApplicantsMenu 평문경로 후속 / MINOR 4)
