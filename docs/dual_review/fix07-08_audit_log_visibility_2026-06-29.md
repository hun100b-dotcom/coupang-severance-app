# 더블 리뷰 기록 — FIX #7/#8 감사로그 가시성·기록

> **작성일**: 2026-06-29
> **대상**: 어드민 전수조사 🟡#7(AuditMenu RLS 빈 화면+CSV 부재) + 🟡#8(logAdminAction 무음)
> **리뷰 구성**: 리뷰어 A(총괄) + 리뷰어 B(적대) 병렬 → 발견 즉시 반영

---

## 1. 처치 요약

| FIX | 문제 | 처치 |
|---|---|---|
| #7 AuditMenu | audit_logs supabase 직접 조회(경로 A) → 실패는 console만(빈 화면=로그없음 혼동), CSV 없음 | 백엔드 GET /admin/logs(경로 B, service-role) + email 필터 + error 표시 + CSV(현재페이지) |
| #8 logAdminAction | audit_logs supabase 직접 INSERT(RLS) + catch{} 완전 무음 → 미등록 admin 행동 누락 | 백엔드 POST /admin/audit-log(service-role, IP 서버캡처)로 전환 |

## 2. 변경 파일

- `backend/app/api/admin.py` — GET /admin/logs email 필터+이스케이프+end 서버사이드, POST /admin/audit-log 신설, _write_audit 실패 로깅, ClientAuditPayload Any
- `frontend/src/lib/api.ts` — postAuditLog
- `frontend/src/lib/adminAuditLog.ts` — logAdminAction → 백엔드
- `frontend/src/components/admin/menus/AuditMenu.tsx` — 백엔드 조회 + error + CSV
- `supabase/migrations/20260629_audit_logs_schema.sql` — (신규) audit_logs 스키마 IaC 고정

## 3. 리뷰어 A(총괄) — CONDITIONAL FAIL → 반영 후 해소

| 항목 | 판정 |
|---|---|
| email ilike 문법/충돌 | CONCERN(메타문자 미이스케이프) |
| POST 페이로드 일치 / _write_audit 재사용 | PASS |
| 컬럼 매칭 / end 페이지네이션 | FAIL |
| CSV 현재페이지 표기 | PASS |
| best-effort/순환참조/부하 | CONCERN(view 노이즈) |

**Blocking 3건 → 처리:**
1. **audit_logs 스키마 마이그레이션화** → **반영**(20260629_audit_logs_schema.sql, IaC 고정 + 컬럼 idempotent 보강).
2. **_write_audit 무음 삼킴 완화** → **반영**(status/예외를 logger.warning).
3. **end 필터 서버사이드** → **반영**(created_at gte/lte 리스트 → PostgREST AND, total 정확).

## 4. 리뷰어 B(적대) — Blocking 1건(=A와 동일 end 버그) + 권고 3

| # | 결함 | 심각도 | 상태 |
|---|---|---|---|
| 2 | end 필터 in-memory → 페이지네이션 total 붕괴 | 상 | **반영(서버사이드)** |
| 5 | 클라 제공 admin_email 무검증 위조 가능 | 권고 | **한계 명시(아래 5절)** — IP 서버캡처로 부분 방어 |
| 8 | after_val Optional[dict] → 배열/원시 전송 시 422 무음 | 권고 | **반영(Optional[Any])** |
| 3 | email ilike 와일드카드 미이스케이프 | 권고 | **반영(메타문자 제거)** |
| 기각 | 순환import/TDZ, view POST 부하, CSV, supabase import 잔존 | — | 근거와 함께 기각 |

---

## 5. 반영 결과 + 남은 한계(솔직)

- A·B의 **Blocking 전부 반영**(스키마 IaC, _write_audit 로깅, end 서버사이드) + 권고 대부분 반영(email 이스케이프, after_val Any). 빌드 `npm run build` ✅ / `py_compile` ✅.
- **남은 한계 1 — admin_email 부인방지**: POST /admin/audit-log는 클라이언트가 보낸 admin_email을 그대로 기록한다(토큰만 검증). 동일 X-Admin-Token 소유자는 임의 이메일로 위조 기록이 가능하다. IP는 서버에서 캡처해 부분 방어되나, 완전한 부인방지는 토큰→이메일 매핑(세션 검증)이 필요 → 별도 보안 태스크.
- **남은 한계 2 — CSV 현재 페이지(≤50건)**: 버튼 라벨에 `(현재 페이지)` 명시. 전량 추출은 별도 기능.
- **남은 한계 3 — view 로그 노이즈**: logAdminAction이 뷰 진입마다 백엔드 POST → 감사 테이블에 view 이벤트가 다수 적재(best-effort, UI 비차단). 세션당 1회 가드 통일은 별도 정리.
- **마이그레이션 적용**: 20260629_audit_logs_schema.sql은 이 세션에 DDL 적용 수단 부재로 파일만 커밋. 단, 조회/기록 모두 service-role 백엔드 경로라 **마이그레이션 미적용이어도 동작**한다(스키마 고정은 컬럼 불일치 영구 무음을 예방하는 보강).
