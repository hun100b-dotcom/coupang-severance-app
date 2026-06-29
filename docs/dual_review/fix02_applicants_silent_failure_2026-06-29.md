# 더블 리뷰 기록 — FIX #2 지원자(applicants) 상태변경 무음 실패

> **작성일**: 2026-06-29
> **대상**: 어드민 전수조사 🔴상 #2 (지원자 단건/대량 상태변경 무음 실패)
> **리뷰 구성**: 리뷰어 A(총괄) + 리뷰어 B(적대) 병렬 → 발견 즉시 반영

---

## 1. 문제 (확정)

- `job_applications` 관리자 SELECT/UPDATE RLS 정책(20260410_applications_personal_info.sql:31,41)이
  `EXISTS(SELECT 1 FROM admin_accounts WHERE admin_accounts.id = auth.uid() AND is_active)` 형태.
- 그런데 `admin_accounts.id`는 001에서 `gen_random_uuid()`로 만드는 **테이블 자체 PK**라
  사용자 `auth.uid()`와 **절대 일치하지 않음** → 관리자 UPDATE가 RLS에 항상 0행으로 막힘.
- 프론트 `ApplicantsMenu`가 `.update().eq()` / `.in()`을 `.select()` 없이 호출 →
  RLS 0행 차단이 `error=null`로 조용히 통과 → **거짓 성공 토스트**.
- 추가 발견(리뷰어 A): `status` CHECK 제약에 `reviewing`이 빠져 있어(20260410_job_applications_rejected.sql:29)
  "검토중" 전환은 RLS와 무관하게 CHECK 위반으로 실패.

## 2. 처치

1. **프론트(ApplicantsMenu.tsx)**: 단건/대량 update에 `.select('id')` 추가 + 변경행 0이면 throw →
   거짓 성공 제거. 대량은 부분 반영 감지 + 실패 id 재선택. 알림 insert 에러 캡처(콘솔 경고, 상태변경 롤백 안 함).
2. **마이그레이션(20260629_fix_job_applications_admin_rls.sql)**: 깨진 정책 DROP →
   `is_admin()` 표준 SELECT/UPDATE(USING+WITH CHECK) 재생성 + `status` CHECK에 `reviewing` 추가.
   *(이 세션엔 DDL 적용 수단 부재 → 파일만 작성·커밋, 추후 1회 적용)*

## 3. 변경 파일

| 파일 | 변경 |
|---|---|
| `supabase/migrations/20260629_fix_job_applications_admin_rls.sql` | (신규) 깨진 정책 DROP + is_admin() 표준 + reviewing CHECK |
| `frontend/src/components/admin/menus/ApplicantsMenu.tsx` | `.select('id')` + 0행 throw + 부분반영 실패id 재선택 + 알림에러 캡처 |

---

## 4. 리뷰어 A(총괄) — CONCERN(조건부 통과)

| 항목 | 판정 |
|---|---|
| `.select()` 0행 차단 감지 논리 | PASS |
| 마이그레이션 is_admin 표준/idempotent/OR결합/DROP명 | PASS (idempotency 권고) |
| 알림 에러 캡처 | PASS |
| 부분반영 경고 / 미적용 라이브 거동 인지 | PASS |
| **status CHECK에 reviewing 누락** | **FAIL → 필수** |

- **A 핵심 발견**: `reviewing`이 CHECK 제약에 없어 RLS를 고쳐도 "검토중" 전환 실패 → **마이그레이션에 CHECK 재정의 추가(반영 완료)**.
- 권고: 신규 CREATE POLICY 앞 DROP IF EXISTS(반영 완료), 같은날 confirmed 중복 트리거의 대량 전건 롤백 가능성(문서화).

## 5. 리뷰어 B(적대) — 미완성(회귀 아님)

| # | 결함 | 심각도 | 상태 |
|---|---|---|---|
| 1 | 마이그레이션 DROP 정책명 미검증(주석만) | 상 | 적용 전 `pg_policies` 확인 주석 강조 |
| 2 | 마이그레이션 미적용 = FIX 미완성(관리자 여전히 막힘, 백엔드 우회 없음) | 상 | **한계로 명시·보고** |
| 3 | viewer 역할도 update 가능(is_admin role 무관) | 중 | **알려진 항목으로 수용**(시스템 표준·원래 의도와 동일) |
| 4 | 대량 부분실패 시 실패 id 미식별 + 선택 손실 | 하 | **반영(실패 id 재선택)** |
| 5 | work_date 형식 미검증 | 하 | 무시(DB가 거부 → 무음 아님) |
| 기각 | 알림 RLS(WITH CHECK true) / data.length 의미 | — | 근거와 함께 기각 |

---

## 6. 반영 결과

- A의 **필수**(reviewing CHECK) + **권고**(idempotency DROP) 반영.
- B의 **권고**(부분실패 실패 id 재선택) 반영. **viewer 권한**은 수용(아래 7-3).
- 빌드: 프론트 `npm run build` ✅ (타입 에러 0).

## 7. 남은 한계(솔직)

1. **마이그레이션 라이브 미적용 = FIX 본체 미완성**: 이 세션엔 DDL 적용 수단 부재. 프론트만 배포하면 라이브는
   "거짓 성공 → 정직한 실패(빨간 토스트)"로 바뀌나, **지원자 확정/거절/검토 기능은 마이그레이션 적용 전까지 동작하지 않음.**
   inquiries(FIX #1)와 달리 job_applications는 **백엔드 service-role 우회 경로가 없어** 프론트만으로는 복구 불가.
   → **반드시 `20260629_fix_job_applications_admin_rls.sql`을 Supabase에 적용해야 기능 복구.** (적용 전 `pg_policies`로 실제 정책명 확인)
2. **viewer 권한**: `is_admin()`은 role 무관(is_active만)이라 viewer도 update 가능. 단 이는 ① 시스템 전체 표준(notices/inquiries 동일),
   ② 깨진 원정책도 is_active만 보던 **원래 의도와 동일**(비교만 깨졌을 뿐)이라 신규 확대가 아님. 시드 관리자는 전원 super_admin.
   role 게이트가 필요하면 별도 함수(`is_admin_writer()`)로 분리 — 별도 태스크.
3. **권고(미반영, 별도)**: 같은날 confirmed 중복 트리거의 대량 전건 롤백 운영 문서화.
