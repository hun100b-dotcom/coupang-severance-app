# 더블 리뷰 기록 — FIX #1 문의(inquiries) 무음 실패

> **작성일**: 2026-06-29
> **대상**: 어드민 전수조사(`docs/audit/admin_function_audit_2026-06-29.md`) 🔴상 #1
> **리뷰 구성**: 리뷰어 A(총괄) + 리뷰어 B(적대) 병렬 → 발견 즉시 반영

---

## 1. 문제 (확정)

- 라이브 inquiries RLS가 특정 UUID(`82a3fb2c…` = catchmasterdmin)로 **하드코딩**된 정책 2개("Admin can read all inquiries" SELECT / "Admin can update all inquiries" UPDATE)로 구성됨.
- 종훈님은 카카오 `dfc5238@naver.com`(uid `66a7a58b…`)로 로그인 → UUID 불일치로 **UPDATE가 RLS에 막힘**.
- 프론트 `patchInquiryStatus` 등이 `.select()` 없이 Supabase 직접 update → RLS 0행 차단이 `error=null`로 조용히 통과(거짓 성공) + 낙관적 UI라 새로고침 시 원복.

## 2. 처치 (2중)

1. **라이브 즉시 복구**: 문의 쓰기 3종(`patchInquiryStatus`/`patchInquiryAnswer`/`bulkInquiryStatus`)을 **백엔드 정상 경로**(`/admin/inquiries/*`, service-role → RLS 무관)로 전환. 실패 시 HTTP 에러 → 프론트 catch → 화면 표시.
2. **RLS 근본 정상화**: `supabase/migrations/20260629_fix_inquiries_rls_is_admin.sql` — 하드코딩 UUID 정책 DROP + 시스템 표준 `is_admin()` 기반 SELECT/UPDATE(USING+WITH CHECK) 재생성. *(이 세션엔 DDL 적용 수단 부재 → 파일만 작성·커밋, 추후 1회 적용)*
3. **무음 제거**: 낙관적 갱신 제거 → 성공 후 DB refetch 동기화 / `BulkActionBar`의 `// silent` catch 제거.

## 3. 변경 파일

| 파일 | 변경 |
|---|---|
| `supabase/migrations/20260629_fix_inquiries_rls_is_admin.sql` | (신규) 하드코딩 정책 DROP + is_admin() 표준 정책 |
| `frontend/src/lib/api.ts` | 문의 쓰기 3종 → 백엔드 경로 |
| `frontend/src/components/admin/inquiries/InquiryDetailPanel.tsx` | `onUpdated` refetch 트리거화, 낙관적 갱신 제거 |
| `frontend/src/components/admin/menus/InquiriesMenu.tsx` | `loadInquiries` list 반환, refetch 재동기화, 패널 `key` |
| `frontend/src/components/admin/inquiries/BulkActionBar.tsx` | 에러 노출 + 부분 실패 표시 + busy 비활성 |
| `backend/app/api/admin.py` | answer에 `answered_at` 기록, bulk가 `failed_ids` 반환 |
| `frontend/.env.local` | `VITE_ADMIN_SECRET` 추가(로컬 경로 B 인증) |

---

## 4. 리뷰어 A(총괄) — 종합 PASS(조건부)

| 항목 | 판정 |
|---|---|
| 백엔드↔프론트 경로/메서드/페이로드 일치 | PASS |
| 토큰 흐름(X-Admin-Token) | CONCERN — Vercel `VITE_ADMIN_SECRET` 설정 전제 |
| 훅 규칙 / stale 클로저 | PASS |
| 마이그레이션 idempotent / is_admin 표준 | PASS |
| 목록 조회 경로 A 유지 판단 | PASS |

- **블로커 지적**: Vercel 프로덕션 `VITE_ADMIN_SECRET=Luck2058qorwhdgns3` 미설정 시 anon 파생 토큰 폴백 → 백엔드 401.
- **잔존 무음**: bulk-status 부분 실패 은폐.

## 5. 리뷰어 B(적대) — 4개 결함 성립 / 3개 기각

| # | 결함 | 심각도 | 상태 |
|---|---|---|---|
| A | answer가 `answered_at` 미기록 → CSV 답변일시 공란 | 상 | **반영(백엔드 보완)** |
| B | bulk 부분 실패 은폐(status_code 미검사 + 항상 ok) | 중 | **반영(failed_ids 반환+프론트 표시)** |
| C | 패널 textarea 미동기화 → 문의 전환 시 **오답변 덮어쓰기 위험** | 중 | **반영(`key={id}` 재마운트)** |
| D | 마이그레이션 DROP 정책명 불일치 시 잔여 정책 | 하 | **반영(적용 전 정책명 확인 SQL 주석)** |
| 기각 | 시나리오1(토큰 회귀)/4(stale list)/6(훅 깨짐) | — | 근거와 함께 기각 |

- B의 saving 복구(try/finally) 정상 확인 → 기각.

---

## 6. 반영 결과

- A·B의 **반드시 수정**(answered_at, bulk 부분실패) 2건 + **권고**(패널 key) + **확인**(DROP 정책명) 전부 반영.
- 빌드: 프론트 `npm run build` ✅ (tsc 타입 에러 0) / 백엔드 `py_compile` ✅.

## 7. 남은 한계(솔직)

1. **마이그레이션 라이브 미적용**: 이 세션엔 Supabase MCP·DB 비번·관리 API 토큰이 없어 DDL을 직접 못 넣음. 파일+검증 SQL은 준비됨. **추후 MCP/대시보드에서 1회 적용 필요.** 단, 라이브 복구는 백엔드 경로(service-role)로 이미 달성되므로 마이그레이션 미적용이어도 종훈님 증상은 배포 즉시 해결.
2. **Vercel `VITE_ADMIN_SECRET` 확인 권장**: 동일 토큰 경로(Settings/IP차단)가 프로덕션에서 동작 중이라 경험적으로 설정돼 있음이 확인되나, 배포 후 PATCH 200을 1회 확인하면 확실.
3. **`answered_at` 컬럼 존재 전제**: 종훈님이 라이브에서 컬럼 존재 확인함(audit). 컬럼 부재 시 answer PATCH가 400이 될 수 있으나, 확인됨에 따라 안전.
4. **스코프 외(별도 태스크)**: 목록 조회 경로 B 통일 여부, `_DEFAULT_ADMIN_SECRET` 평문 하드코딩 제거(보안).
