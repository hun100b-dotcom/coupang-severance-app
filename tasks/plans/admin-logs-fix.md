# 어드민 서버 로그 + 관리자 작업 로그 완전 구현

작성일: 2026-04-18

---

## 요구사항

- [ ] 서버 로그(system_logs): 새 로그가 안 쌓이는 원인 수정 → 배포/API/에러 이벤트 자동 기록
- [ ] 서버 로그: 각 항목 클릭 시 Accordion(서랍) 상세 보기
- [ ] 관리자 작업 로그(audit_logs): 완전 미작동 → 정상 작동하도록 구현
- [ ] 관리자 작업 로그: 채용공고 CRUD(등록/수정/삭제) 포함 모든 관리 행동 자동 기록
- [ ] 관리자 작업 로그: 클릭 시 Accordion 상세 보기

---

## 현재 상태 분석 (문제 원인)

### 문제 1: `audit_logs` 테이블 vs `admin_audit_logs` 테이블 불일치

| 위치 | 사용하는 테이블 | 컬럼 |
|------|---------------|------|
| `002_admin_audit_logs.sql` (마이그레이션) | `admin_audit_logs` | target_table, detail |
| `adminAuditLog.ts` (프론트) | `audit_logs` | target_type, before_val, after_val |
| `admin.py` `_write_audit()` (백엔드) | `audit_logs` | target_type, before_val, after_val |
| `AuditMenu.tsx` (프론트 UI) | `audit_logs` | target_type, before_val, after_val |

**결론**: 코드는 `audit_logs`를 쓰는데, 마이그레이션은 `admin_audit_logs`를 만듦. DB에 `audit_logs`가 없거나 구조가 달라서 INSERT가 조용히 실패하고 있음.

### 문제 2: `system_logs` 테이블에 INSERT하는 코드가 전혀 없음

- `ServerLogsMenu.tsx`가 `system_logs` 테이블을 읽음 (Supabase Realtime 포함)
- 백엔드 `admin.py` 어디에도 `system_logs`에 INSERT하는 코드 없음
- 마이그레이션 파일에도 `system_logs` 테이블 생성 SQL 없음
- 과거 데이터(2~3페이지 분)는 이전에 수동 입력 또는 다른 방식으로 남은 것

### 문제 3: JobsMenu에서 audit 로그 기록 없음

- `JobsMenu.tsx`에서 공고 등록/수정/삭제 시 `logAdminAction()` 호출 없음
- `adminAuditLog.ts`의 `AdminAction` 타입에 job 관련 action 정의 없음

### 문제 4: ServerLogsMenu audit 탭이 backend API를 통해 audit_logs 조회

- `/admin/logs` endpoint → `audit_logs` 테이블 조회 (문제1이 해결되면 자동 수정)

---

## DB 스키마

### 신규: `system_logs` 테이블 생성 마이그레이션

```sql
-- 20260418_system_logs.sql
CREATE TABLE IF NOT EXISTS public.system_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type        text NOT NULL,                  -- DEPLOY, ERROR, FIX, INFO, WARNING, SECURITY, MIGRATION
  title       text NOT NULL,
  detail      jsonb,                          -- { desc, path, method, status_code, ... }
  app_version text,
  created_by  text,                           -- 'system', 'trigger:xxx', 'auto-detect'
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 슈퍼어드민만 조회 가능
CREATE POLICY "system_logs_select_admin"
  ON public.system_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 서비스 역할(백엔드)만 INSERT 가능
CREATE POLICY "system_logs_insert_service"
  ON public.system_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_type ON public.system_logs(type);
```

### 수정: `audit_logs` 테이블 — 코드와 일치하도록 생성

```sql
-- 20260418_audit_logs_fix.sql
-- 기존 admin_audit_logs는 그대로 두고, 코드가 참조하는 audit_logs 생성
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text NOT NULL,
  action      text NOT NULL,
  target_type text,
  target_id   text,
  before_val  jsonb,
  after_val   jsonb,
  ip_address  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_select_admin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "audit_logs_insert_authenticated"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_email ON public.audit_logs(admin_email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
```

---

## 영향 범위

| 파일 | 변경 내용 |
|------|----------|
| `supabase/migrations/20260418_audit_logs_fix.sql` | 신규: audit_logs 테이블 생성 |
| `supabase/migrations/20260418_system_logs.sql` | 신규: system_logs 테이블 생성 |
| `backend/app/api/admin.py` | `_write_system_log()` 함수 추가, startup/API 에러/배포 이벤트 기록 |
| `frontend/src/lib/adminAuditLog.ts` | AdminAction 타입에 job 관련 action 추가 |
| `frontend/src/components/admin/menus/JobsMenu.tsx` | 공고 CRUD 후 `logAdminAction()` 호출 추가 |
| `frontend/src/components/admin/menus/ServerLogsMenu.tsx` | Accordion 서랍 UI 추가 (시스템 로그 + 감사 로그 모두) |
| `frontend/src/components/admin/menus/AuditMenu.tsx` | Accordion 서랍 UI — 이미 구현됨 (expanded 상태 있음) |

---

## 구현 계획

### Phase 1: DB 마이그레이션 (선행 필수)

1. `audit_logs` 테이블 생성 SQL 작성 → Supabase Dashboard SQL Editor 실행
2. `system_logs` 테이블 생성 SQL 작성 → Supabase Dashboard SQL Editor 실행
3. RLS 정책 + 인덱스 적용 확인

### Phase 2: 백엔드 — system_logs INSERT 추가

1. `_write_system_log(type, title, detail, app_version, created_by)` 헬퍼 함수 추가
2. FastAPI startup event에 `DEPLOY` 로그 기록 (앱 시작 = 배포)
3. 주요 API 엔드포인트 에러 처리에 `ERROR` 로그 기록
4. 관리자 중요 작업(IP차단, 설정변경)에 `INFO` 로그 기록

### Phase 3: 프론트엔드 — 관리자 작업 로그 완성

1. `adminAuditLog.ts`: AdminAction 타입에 추가
   - `'job.create'` | `'job.update'` | `'job.delete'` | `'job.toggle_urgent'`
2. `JobsMenu.tsx`: CRUD 완료 후 `logAdminAction()` 호출
3. `AuditMenu.tsx`: 이미 Accordion(expanded) 있으므로 before/after JSON diff 표시 개선

### Phase 4: 프론트엔드 — 서버 로그 Accordion UI

1. `ServerLogsMenu.tsx` 시스템 로그 행 클릭 시 서랍 펼쳐지도록
   - 현재: 클릭 기능 없음, detail.desc만 인라인 표시
   - 변경: 행 클릭 → accordion 열림 → detail JSON 전체 + created_by + 타임스탬프 표시

---

## Accordion(서랍) UI 설계

```
┌─────────────────────────────────────────────────────────────┐
│ 🚀 DEPLOY  v2.4.1 배포 완료                    2시간 전  ▼  │
├─────────────────────────────────────────────────────────────┤
│  📋 상세 정보                                               │
│  설명: Render 자동 배포 — Phase 1 채용정보 섹션            │
│  버전: v2.4.1                                               │
│  생성자: system                                              │
│  정확한 시간: 2026.04.18 14:32                              │
│  상세 데이터:                                               │
│  {                                                          │
│    "desc": "Render 자동 배포",                              │
│    "commit": "7f91677"                                      │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

- 행 전체 클릭 → toggle
- 애니메이션: max-height transition 0.2s
- detail이 없어도 타임스탬프/버전/created_by는 항상 표시
- 모바일도 동일하게 적용

---

## 리스크

1. **`audit_logs` 테이블 생성 전 RLS 에러**: `is_admin()` 함수가 먼저 정의되어 있어야 함 — 005 마이그레이션이 선행되어 있으므로 문제없음
2. **백엔드 startup 로그**: Render 콜드스타트(0→1)와 워밍업(1→1) 재시작을 구분 못 함 → `detail`에 timestamp를 포함해 중복 인식 가능
3. **JobsMenu logAdminAction**: Supabase 인증 세션이 있어야만 기록됨 — 관리자 로그인 상태이므로 정상
4. **system_logs RLS**: `service_role`만 INSERT 허용이면 백엔드(service_role key 사용)는 가능하지만, Supabase Functions로 트리거 추가 시 별도 검토 필요

---

## 검증 기준 (reviewer 체크)

- [ ] Supabase에 `audit_logs` 테이블 존재 + 컬럼 구조 일치
- [ ] Supabase에 `system_logs` 테이블 존재 + RLS 활성화
- [ ] 어드민 페이지 → Jobs → 공고 등록 → Audit Logs 탭 → 해당 로그 표시
- [ ] 어드민 페이지 → Jobs → 공고 삭제 → Audit Logs 탭 → 삭제 로그 표시
- [ ] 백엔드 배포(Render) → Server Logs → DEPLOY 항목 신규 표시
- [ ] Server Logs 각 항목 클릭 → Accordion 서랍 열림 → 상세 정보 표시
- [ ] Audit Logs 각 항목 클릭 → 서랍 열림 → before/after JSON 표시
- [ ] 모바일(375px) 에서도 서랍 정상 동작
- [ ] TypeScript 빌드 오류 없음
