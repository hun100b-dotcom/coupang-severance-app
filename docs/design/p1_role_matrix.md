# P1 — 관리자 역할 차등 서버 강제 설계 (Role Enforcement)

> **상태**: 설계 + 마이그레이션 작성 완료. **DB 미적용**(종훈님이 Supabase MCP로 직접 적용).
> **마이그레이션**: `supabase/migrations/20260630_p1_role_enforcement.sql`
> **근거**: `docs/audit/admin_review_2026-06-30.md` 조사2 P1 (역할 차등이 클라에만 존재).
> **범위**: DB(RLS)만. 프론트/백엔드 코드 무변경.

---

## 1. 문제 한 줄 요약

기존 RLS는 어드민 쓰기를 전부 `is_admin()`(= **활성 관리자면 역할 무관 true**)으로만 막았다.
→ `viewer`로 등록해도 공지·문의·공고·지원자·설정·템플릿을 전부 CRUD 할 수 있었다.
역할(viewer/admin) 차등은 **프론트 `permission_levels`(JSON) 클라 검사에만** 존재 → 서버 우회 가능.

---

## 2. 도입하는 3단계 권한 모델

| 함수 | 참 조건 | 용도 | 비고 |
|---|---|---|---|
| `is_admin()` | admin_accounts 활성 (역할 무관: super+admin+viewer) | **읽기(SELECT)** | 기존(004) 유지 |
| `is_admin_writer()` ★신규 | super_admin **또는** admin (둘 다 활성) | **쓰기(INSERT/UPDATE/DELETE)** | viewer 제외 |
| `is_super_admin()` | super_admin 역할 **또는** 하드코딩 super 이메일 | 관리자 계정 관리·민감조작 | 기존(005) 유지 |

`is_admin_writer()` 정의(요지):
```sql
SELECT public.is_super_admin()          -- super(역할) OR 하드코딩 super 이메일
    OR EXISTS (SELECT 1 FROM public.admin_accounts
               WHERE email=auth.email() AND role='admin' AND is_active=true);
```
- `is_super_admin()`을 포함 → 하드코딩 super(catchmasterdmin)가 admin_accounts 시드 없이도 항상 writer.
- `SECURITY DEFINER` + `SET search_path=public,pg_temp` (V6 하드닝과 동일 패턴).

---

## 3. 역할 × 기능 매트릭스 (적용 후)

> ✅ 가능 · ❌ 차단 · 👁 읽기만

| 기능(테이블) | viewer | admin | super_admin | 강제 함수 |
|---|:---:|:---:|:---:|---|
| 공지 조회 (notices SELECT) | ✅ | ✅ | ✅ | 공개/is_admin |
| 공지 추가·수정·삭제 (notices write) | ❌ | ✅ | ✅ | **is_admin_writer** |
| 문의 조회 (inquiries SELECT) | 👁 | ✅ | ✅ | is_admin |
| 문의 상태변경·답변 (inquiries UPDATE) | ❌ | ✅ | ✅ | **is_admin_writer** |
| 공고 조회 (job_postings SELECT) | ✅ | ✅ | ✅ | is_admin/공개 |
| 공고 추가·수정·삭제 (job_postings write) | ❌ | ✅ | ✅ | **is_admin_writer** |
| 지원자 조회 (job_applications SELECT) | 👁 | ✅ | ✅ | is_admin |
| 지원자 상태변경 (job_applications UPDATE) | ❌ | ✅ | ✅ | **is_admin_writer** |
| 설정 조회 (system_settings SELECT) | ✅ | ✅ | ✅ | 공개(true) |
| 설정 변경 (system_settings write) | ❌ | ✅ | ✅ | **is_admin_writer** |
| 템플릿 조회 (inquiry_templates SELECT) | ✅ | ✅ | ✅ | is_admin |
| 템플릿 추가·수정·삭제 (inquiry_templates write) | ❌ | ✅ | ✅ | **is_admin_writer** |
| 알림 발송 (notifications INSERT, 타인) | ❌ | ✅ | ✅ | **is_admin_writer** |
| 본인 알림 자가삽입 (notifications INSERT, 본인) | ✅ | ✅ | ✅ | self |
| 법정변수 조회 (legal_variables SELECT) | ✅ | ✅ | ✅ | 공개(true) |
| 법정변수 변경 (legal_variables write) `P1b` | ❌ | ✅ | ✅ | **is_admin_writer** |
| **관리자 계정 관리 (admin_accounts write)** | ❌ | ❌ | ✅ | is_super_admin (비변경) |
| 감사로그 기록 (audit_logs INSERT) | ✅ | ✅ | ✅ | is_admin (의도적 유지) |

핵심 변화: **viewer = "전 메뉴 읽기 가능, 쓰기 전면 차단"**. admin = 운영 쓰기 가능(계정관리·민감조작 제외). super = 전부.

---

## 4. 대상 테이블 7종 — 변경 내역

| # | 테이블 | 바뀐 정책(cmd) | before → after | SELECT 유지? |
|---|---|---|---|---|
| §2 | notices | insert/update/delete | is_admin → **is_admin_writer** | ✅ 공개+is_admin |
| §3 | inquiries | update | is_admin → **is_admin_writer** | ✅ 본인 OR is_admin |
| §4 | job_postings | insert/update/delete | is_admin → **is_admin_writer** | ✅ is_admin+공개 |
| §5 | job_applications | update | is_admin → **is_admin_writer** | ✅ is_admin+본인 |
| §6 | system_settings | FOR ALL → insert/update/delete 분리 | is_admin → **is_admin_writer** | ✅ 공개 select 정책 별도 유지 |
| §7 | inquiry_templates | FOR ALL → select+쓰기 분리 | 쓰기 is_admin → **is_admin_writer**, select=is_admin | ✅ 신설 select_admin |
| §8 | notifications | insert | (self OR is_admin) → (self OR **is_admin_writer**) | (해당 없음) |

> `system_settings`·`inquiry_templates`는 기존이 `FOR ALL`(SELECT 포함)이라, 단순 함수 swap 시
> viewer가 읽기까지 막힌다. 그래서 **SELECT를 분리해 `is_admin()`(또는 기존 공개정책)으로 보존**하고
> 쓰기 3종만 writer로 좁혔다.

---

## 5. 의도적으로 제외한 테이블 (역할강제 안 함)

| 테이블 | 이유 |
|---|---|
| `admin_accounts` (쓰기) | 이미 `is_super_admin()` 전용(004). 더 강한 게이트라 그대로 둠. |
| `audit_logs` (실사용, INSERT) | **is_admin() 유지.** viewer의 행위도 감사기록에 남아야 추적성 보장. writer로 좁히면 viewer 행위 누락. (백엔드 `_write_audit`는 service-role로 RLS 우회 → 무관.) |
| `admin_audit_logs` (미사용, INSERT) | 동일 사유 + dead 테이블(V2). |
| `profiles` / `page_views` / `visit_sessions` 등 | 어드민 "쓰기" 경로 아님(조회·분석수집). |

---

## 6. 영향 분석 — "현재 관리자 3명 전부 super면 영향 0"

- 이번 변경은 **viewer/admin에게만 의미**가 있다. `is_admin_writer()`는 super_admin에 대해 항상 true.
- 따라서 **현 관리자가 전원 `super_admin`이면 모든 쓰기가 그대로 동작 → 운영 영향 0.**
- `admin` 계정이 있으면 그 계정도 계속 쓰기 가능(writer). `viewer`만 있으면 그 계정만 쓰기 차단.
- **적용 전 1회 확인**(마이그 §9-c):
  ```sql
  SELECT email, role, is_active FROM public.admin_accounts ORDER BY role, email;
  ```
  → role 컬럼이 전부 `super_admin`인지 눈으로 확인. (전부 super면 무중단 적용.)

---

## 7. 멱등·가역성

- `is_admin_writer()`: `CREATE OR REPLACE` → 재실행 안전.
- 모든 정책: `DROP POLICY IF EXISTS` 후 `CREATE` → 재실행 안전. 정책명은 기존과 동일 유지(§6·§7만 구조 분리).
- 롤백: 마이그 §10에 전 정책을 `is_admin()`으로 원복하는 SQL 수록. 함수는 남겨도 무해.

---

## 8. 적용 절차 (종훈님 MCP)

1. 마이그 **§0** 실행 → 7개 테이블 현재 정책명이 DROP 대상과 일치하는지 대조.
2. 마이그 **§9-c** 실행 → 관리자 역할 분포 확인(전원 super면 무영향).
3. 마이그레이션 전체 적용 (Supabase SQL Editor 붙여넣기 또는 `apply_migration`).
4. 마이그 **§9-(a)(b)(d)(e)** 검증 SQL 실행 → 함수 생성·정책 swap·viewer 차단·SELECT 보존 확인.
5. (실사용) viewer 계정으로 로그인 → 공지/문의 저장 시도 → 차단되는지 1회 확인.

> ⚠ 정책명이 라이브와 다르면 `DROP IF EXISTS`가 조용히 통과(미적용)되니 §0 대조는 필수.

---

## 9. 후속(별도 세션) — 프론트 정합

- 이 변경 후 viewer가 쓰기 버튼을 누르면 RLS가 차단한다. 단, 일부 메뉴는 `.select()` 없는
  UPDATE/DELETE라 **차단이 무음**(error=null)일 수 있다(조사 보고서의 기존 이슈).
  → viewer에게 "권한 없음"을 보여주려면 프론트에서 쓰기 버튼을 role로 숨기거나,
    UPDATE/DELETE에 `.select()`+에러표시를 붙이는 별도 작업 필요(다른 세션 영역).

---

## 10. P1b 후속 — legal_variables 쓰기 과도권한 축소

> **마이그레이션**: `supabase/migrations/20260630_p1b_legal_variables_writer.sql`
> **상태**: 파일 작성 완료, DB 미적용(Dispatch가 MCP로 적용).

P1 본 마이그레이션(7테이블)은 "`is_admin()` → `is_admin_writer()` 교체"가 스코프였다.
그런데 `legal_variables`의 쓰기 정책은 원래부터 `is_admin()`이 아니라 **더 느슨한**
`"legal_variables 수정 허용" FOR ALL USING (auth.role()='authenticated')`
(20260603) 라서 그 스코프에서 빠졌다. 결과적으로 **로그인한 아무 일반 회원이 최저시급 등
법정변수를 수정**할 수 있는 상태가 남아 있었다.

- **위험**: `legal_variables`(min_hourly_wage 등)는 4개 계산기의 입력값 → 임의 변조 시 전
  사용자 계산 결과 오염(데이터 무결성).
- **조치**: `FOR ALL authenticated` 정책 제거 → INSERT/UPDATE/DELETE를 `is_admin_writer()`
  전용으로 재생성. SELECT(`조회 허용`=true)는 그대로 유지(법정변수는 공개 정보).
- **의존성**: `is_admin_writer()` 선행 필요 → 본 마이그레이션이 §0에서 함수 존재를 가드(없으면 중단).
- **영향**: 운영 관리자 전원 super_admin → 정상 동작, 무중단. (비공식적으로 일반 회원이
  쓰던 경로가 있었다면 차단 = 의도된 보안 강화.)
- 즉 **이번 P1은 "서버가 진짜 막는다"를 보장**하고, UX 메시지는 후속 과제다.
