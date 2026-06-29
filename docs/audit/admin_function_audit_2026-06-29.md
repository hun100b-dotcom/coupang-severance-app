# 어드민(/admin) 전역 연동 전수조사 보고서

> **작성일**: 2026-06-29
> **성격**: **AUDIT 전용 — 발견만 기록, 코드 수정/커밋/배포 없음.** (FIX는 검토 후 별도 단계)
> **범위**: AdminPage.tsx + components/admin/* 44개 컴포넌트 + backend/app/api/admin.py + frontend/src/lib/api.ts + supabase/migrations/*
> **방법**: 프론트 버튼 → 핸들러 → API/Supabase 호출 → 백엔드 라우트 존재 여부 → DB 반영(RLS) → UI 갱신 → 에러 핸들링까지 코드 라인 단위 추적. (Supabase MCP 미연결로 운영 DB 직접 조회는 불가 → 코드·마이그레이션 기반 판정, 일부 "DB 확인 필요" 명시)

---

## 0. 한눈에 보는 결론 (TL;DR)

대부분의 어드민 버튼은 **"껍데기"가 아니다** — onClick·핸들러·DB 호출이 모두 연결돼 있다. 문제는 **연결 여부가 아니라 "조용히 깨지는 구조"**에 있다. 단일 시스템 근본원인이 거의 모든 메뉴에서 반복된다:

> **프론트가 FastAPI 백엔드를 우회하고 Supabase를 직접 호출(`.from().update/delete`)하면서, ① `.select()`를 붙이지 않아 RLS가 0행을 막아도 `error=null`로 조용히 통과하고, ② 프론트 어드민 게이트(하드코딩 이메일)와 DB RLS 게이트(`admin_accounts` 멤버십)가 서로 달라, 게이트는 통과했지만 RLS는 막는 계정에서 "성공 토스트는 뜨는데 DB는 안 바뀌는" 거짓 성공이 발생한다.**

대표 증상(문의 "답변완료" 눌러도 변화 없음)은 이 구조의 전형적 사례다.

---

## 1. 아키텍처 사실 (모든 판정의 전제)

### 1-1. 두 갈래 호출 경로 (혼재)

| 경로 | 인증 | RLS 영향 | 사용하는 기능 |
|------|------|----------|----------------|
| **A. Supabase 직접** (`supabase.from(...)`) | 로그인 세션 JWT (`auth.email()`) | **RLS 정책 직접 적용** | inquiries(상태/답변/일괄), notices, members, accounts, job_postings, applicants, templates, CMS배너, audit_logs(AuditMenu), system_logs, stats/analytics/target, logAdminAction |
| **B. 백엔드 API** (`api.*` + `X-Admin-Token`) | `X-Admin-Token` → `_VALID_ADMIN_TOKENS` 검증, 이후 **service-role 키로 RLS 우회** | 우회됨 | settings(PATCH), blocked-ips, audit_logs(ServerLogsMenu 감사탭), templates/use(미연결) |

→ **같은 어드민 화면 안에서 일부 기능은 A, 일부는 B를 쓴다.** B는 토큰만 맞으면 RLS와 무관하게 동작하고, A는 RLS(`is_admin()`)를 통과해야 동작한다. 이 이원화가 "어떤 버튼은 되고 어떤 버튼은 조용히 안 되는" 혼란의 근원이다.

### 1-2. 백엔드 admin.py에 실제 존재하는 라우트 (admin.py grep 결과)

`/admin/health`, `/admin/stats`, `/admin/analytics`, `/admin/target/{companies,segments,insights}`, `/admin/inquiries`(GET), `/admin/inquiries/{id}/status`(PATCH), `/admin/inquiries/{id}/answer`(PATCH), `/admin/inquiries/bulk-status`(POST), `/admin/templates`(GET/POST/DELETE/use), `/admin/settings`(GET/PATCH), `/admin/blocked-ips`(GET/POST/DELETE), `/admin/logs`(GET).

- **notices / members / accounts / job_postings / applicants / confirmed 라우트는 백엔드에 아예 없다** → 전적으로 Supabase 직접(경로 A).
- **inquiries status/answer/bulk 백엔드 라우트는 존재하지만 프론트가 호출하지 않는다(죽은 코드).** 프론트는 같은 작업을 Supabase 직접으로 처리. → **대표 버그의 핵심 아이러니: RLS를 우회하는 정상 백엔드 경로가 이미 있는데, 굳이 RLS에 막히는 직접 경로를 쓴다.**

### 1-3. 프론트 어드민 게이트 vs DB RLS 게이트 (불일치)

- **프론트 게이트** (AdminPage.tsx:94-118): `email === SUPER_ADMIN_EMAIL`(하드코딩) **또는** `VITE_ADMIN_EMAIL` **또는** `admin_accounts` 조회 중 하나라도 맞으면 입장.
- **DB RLS 게이트** (004_security_rls.sql): 쓰기 정책은 `public.is_admin()`(= `admin_accounts`에 `auth.email()`이 `is_active=true`) 또는 `is_super_admin()`만 신뢰. **하드코딩 이메일/`VITE_ADMIN_EMAIL`은 RLS가 모른다.**
- 시드된 admin 계정은 `catchmasterdmin@gmail.com` **단 하나**(005_super_admin_setup.sql:66). `frontend/.env.local`의 `VITE_ADMIN_EMAIL`도 동일 값.
- → **`admin_accounts`에 등록되지 않은 계정으로 입장하면, 프론트는 들여보내 버튼을 다 보여주지만 모든 경로 A 쓰기는 RLS에 막힌다.**

### 1-4. supabase-js의 조용한 실패 (가장 중요한 기술적 사실)

`supabase.from(t).update(v).eq('id', id)`를 **`.select()` 없이** 호출하면, RLS가 0행을 막아도 반환은 `{ error: null }`이다(예외 발생 안 함). 따라서 `if (error) throw` 검사도 통과하고, 핸들러는 성공으로 간주해 낙관적 setState/토스트를 띄운다. **DB는 안 바뀌었지만 화면은 "됐다"고 말한다.** INSERT는 보통 `.select()`를 붙이거나 반환을 쓰므로 RLS 거부가 잡히지만, UPDATE/DELETE는 거의 전부 `.select()`가 없다.

---

## 2. 대표 케이스 — "문의 답변완료" 근본원인 (강의식)

### 2-1. 버튼 → DB까지 정확한 코드 체인

문의 상세 패널(`InquiryDetailPanel.tsx`)에는 "답변완료"와 관련된 버튼이 **두 개** 있다.

**(가) 상태 알약 버튼 "답변완료"** (`InquiryDetailPanel.tsx:105-123`)
```
onClick → handleStatusChange('answered')  (L40-47)
  → patchInquiryStatus(inquiry.id, 'answered')   // api.ts:663-670
       supabase.from('inquiries')
         .update({ status, updated_at })
         .eq('id', id)            ← ★ .select() 없음
       if (error) throw …          ← RLS 0행 차단 시 error=null → throw 안 됨
  → onUpdated({ ...inquiry, status })   // 낙관적 갱신(무조건 실행)
```

**(나) "답변 저장" 버튼** (`InquiryDetailPanel.tsx:189-206`)
```
onClick → handleSaveAnswer  (L27-38)
  → patchInquiryAnswer(inquiry.id, answer)        // api.ts:672-681
       supabase.from('inquiries')
         .update({ answer, status:'answered', answered_at, updated_at })
         .eq('id', id)            ← ★ .select() 없음
```

부모(`InquiriesMenu.tsx:75-78`)의 `handleUpdated`는 로컬 `inquiries` 배열과 `activeInquiry`만 setState로 갱신할 뿐 **재조회(refetch)하지 않는다.**

### 2-2. 어느 단계에서 끊기는가

- **버튼 onClick → 함수 연결**: ✅ 정상 (껍데기 아님)
- **API 호출**: ✅ 호출됨. 단 **백엔드가 아니라 Supabase 직접**. (백엔드 `PATCH /admin/inquiries/{id}/answer`는 admin.py:727에 존재하나 **호출되지 않음 = 죽은 코드**.)
- **DB 반영**: ⚠️ **조건부.** RLS `inquiries_update_admin USING (public.is_admin())`(004:100-103)를 통과해야만 반영. 통과 못 하면 0행 업데이트.
- **에러 신호**: ❌ **없음.** `.select()`가 없어 RLS 거부가 `error=null`로 와서 `throw`되지 않음 → `catch` 미발동 → 에러 메시지 없음.
- **UI 갱신**: ⚠️ **낙관적 갱신만.** `onUpdated`가 무조건 실행돼 알약/배지가 즉시 답변완료로 바뀜 → 하지만 재조회가 없고 DB도 안 바뀌었으므로, **새로고침·필터변경·페이지 재진입 시 다시 "대기중"으로 되돌아온다.**

### 2-3. 근본원인 (확정 가능한 부분 + DB 확인 필요 부분)

**확정**: 답변/상태 쓰기가 RLS에 종속된 Supabase 직접 경로인데 `.select()` 누락으로 **실패를 보고할 능력 자체가 없다.** 그래서 사용자 눈에는 "눌러도 (지속되는) 변화가 없음"으로 보인다. 동작 여부는 오직 **운영 계정이 `admin_accounts`에 `is_active=true`로 있는가**에 달렸다.

**두 갈래 시나리오 (FIX 단계에서 DB 1회 조회로 확정 필요):**
1. **운영 계정이 `admin_accounts` 미등록** → `is_admin()=false` → 모든 문의 쓰기가 0행 무음 → 낙관적으로 잠깐 바뀌었다가 되돌아옴. (가장 유력)
2. **`answered_at` 컬럼 부재** → `inquiries` 테이블은 마이그레이션에 정의가 없다(대시보드 수동 생성 추정). 만약 `answered_at` 컬럼이 없으면 **(나) "답변 저장"** 은 PostgREST 에러를 반환→`throw`→"저장 실패" 표시(이 경우는 에러가 보임). **(가) 상태 알약**은 `answered_at`을 안 건드리므로 무관.

→ **FIX 전 필수 확인 2가지**: ① 운영 시 로그인하는 어드민 이메일이 `admin_accounts(is_active=true)`에 있는지, ② `inquiries`에 `answered_at` 컬럼이 실제 존재하는지.

### 2-4. 왜 슈퍼어드민(catchmasterdmin)으로는 "되는 것처럼" 보일 수 있나
`catchmasterdmin@gmail.com`은 005 마이그레이션이 `admin_accounts`에 시드하므로 `is_admin()=true` → 경로 A 쓰기가 RLS를 통과한다. 즉 **개발자 본인 슈퍼어드민 계정에서는 동작하고, 다른 관리자 계정에서는 조용히 안 되는** 재현 난이도 높은 버그가 된다.

---

## 3. 기능별 전수 판정표

> 판정 정의 — **정상**: 버튼→DB→UI 전 구간 동작 + 실패 시 신호 있음. **깨짐(잠재)**: 연결은 정상이나 RLS 차단/실패가 무음으로 거짓 성공이 될 수 있음. **미연결**: 핸들러/버튼/엔드포인트 중 하나가 부재. **데드코드**: 화면에서 안 쓰임.

### 3-1. 문의 (Inquiries) — 경로 A

| 기능 | 호출함수 | API/테이블 | 백엔드존재 | DB반영 | UI갱신 | 판정 | 끊긴 지점 | 위험 |
|---|---|---|---|---|---|---|---|---|
| 상태변경(대기/검토/답변완료/종결) | `patchInquiryStatus` | supabase `inquiries.update().eq` (select無) | 라우트 있으나 미사용 | RLS `is_admin()` 의존 | 낙관적only, refetch無 | **깨짐(잠재)** | api.ts:663-670 / InquiryDetailPanel.tsx:40 | **상** |
| 답변 저장 | `patchInquiryAnswer` | supabase `inquiries.update`(answered_at, select無) | 라우트 있으나 미사용 | RLS 의존 + answered_at 컬럼 의존 | 낙관적only | **깨짐(잠재)** | api.ts:672-681 | **상** |
| 일괄 상태변경 | `bulkInquiryStatus` | supabase `inquiries.update().in` (select無) | 라우트 있으나 미사용 | RLS 의존 | `onDone` refetch | **깨짐(잠재)** | api.ts:683-690 / BulkActionBar.tsx:21-23 `catch{}//silent` | **상** |
| 문의 목록/검색/필터/페이지 | `getAdminInquiries` | supabase `inquiries.select` | 미사용 | 읽기(RLS select) | refetch | 정상 | — | 하 |
| CSV 내보내기 | `handleExport` | 메모리 | — | — | — | 정상 | — | 하 |

### 3-2. 답변 템플릿 — 경로 A

| 기능 | 호출함수 | API/테이블 | 백엔드존재 | DB반영 | UI갱신 | 판정 | 끊긴 지점 | 위험 |
|---|---|---|---|---|---|---|---|---|
| 템플릿 추가 | `createTemplate` | supabase `inquiry_templates.insert` | 라우트 있으나 미사용 | RLS 의존 | refetch | RLS 의존 | TemplateManager.tsx:88 (catch無, finally만) | 중 |
| 템플릿 삭제 | `deleteTemplate` | supabase `.delete().eq` (select無) | 라우트 있으나 미사용 | RLS 의존 | refetch | **깨짐(잠재)** | api.ts:710-716 | 중 |
| 템플릿 사용수 증가 | (없음) | POST `/admin/templates/{id}/use` | **있음** | — | — | **미연결** | api.ts에 호출 함수 미export | 하 |

### 3-3. 공지사항 (Notices) — 경로 A

| 기능 | 호출함수 | API/테이블 | 백엔드존재 | DB반영 | UI갱신 | 판정 | 끊긴 지점 | 위험 |
|---|---|---|---|---|---|---|---|---|
| 공지 추가 | `handleSave` | supabase `notices.insert` | 없음 | RLS `is_admin()` | refetch | 깨짐(조건부) | NoticesMenu.tsx:78 (error 미체크) | 중 |
| 공지 수정 | `handleSave` | supabase `notices.update().eq` | 없음 | RLS 의존 | refetch | **깨짐(잠재)** | NoticesMenu.tsx:69 (select無/error無) | 중 |
| 활성/비활성 토글 | `handleToggleActive` | supabase `notices.update().eq` | 없음 | RLS 의존 | refetch | **깨짐(잠재)** | NoticesMenu.tsx:93 | 중 |
| 공지 삭제 | `handleDelete` | supabase `notices.delete().eq` | 없음 | RLS 의존 | refetch | **깨짐(잠재)** | NoticesMenu.tsx:104 | 중 |

> Notices 4종 쓰기 모두 `{ error }` 반환을 받지 않음 + try/catch·에러표시 전무 → 이 그룹에서 가장 무음.

### 3-4. 회원 관리 (Members) — 경로 A (읽기 위주)

| 기능 | 호출함수 | API/테이블 | 백엔드존재 | DB반영 | UI갱신 | 판정 | 끊긴 지점 | 위험 |
|---|---|---|---|---|---|---|---|---|
| 목록/검색/필터/페이지 | `fetchMembers` | supabase `profiles.select('*')` | 없음 | 읽기(RLS) | refetch | 정상 | — | 하 |
| 마스킹 해제 | `handleUnmask` | `system_settings.select` + 클라 boolean | 없음 | 읽기 only | setState | **보안취약(동작은 함)** | MembersMenu.tsx:90,135,142 | **중(보안)** |
| 회원 탈퇴/프로필 수정 | (없음) | — | — | — | — | **미연결(부재)** | 기능 자체 없음 | 정보 |

> **보안 발견**: PII를 `select('*')`로 전량 평문 수신 후 화면 렌더에서만 가림. "해제"는 서버 호출 없이 클라 boolean 토글(`unmasked`). 보안키도 `system_settings`에서 평문 읽어 `===` 단순 비교(해싱 없음). DevTools/네트워크 탭으로 무력화 가능. 진짜 보호하려면 서버(RPC/Edge)에서 마스킹된 데이터만 내려야 함.

### 3-5. 관리자 계정 (Accounts) — 경로 A (모범 사례)

| 기능 | 호출함수 | API/테이블 | 백엔드존재 | DB반영 | UI갱신 | 판정 | 끊긴 지점 | 위험 |
|---|---|---|---|---|---|---|---|---|
| 계정 추가 | `handleSave` | supabase `admin_accounts.insert` | 없음 | RLS `is_super_admin()` | refetch | 정상 | — | 중 |
| 계정 수정(역할/활성) | `handleSave` | `admin_accounts.update().eq` | 없음 | super_admin only | refetch | 정상 | — | 중 |
| 계정 삭제 | `handleDelete` | `admin_accounts.delete().eq` | 없음 | super_admin only | refetch | 정상 | — | 중 |

> **이 메뉴가 표준**: 모든 쓰기가 `const { error } = await …; if (error) throw` + try/catch + 화면 에러표시 + 클라(`if(!isSuperAdmin)`)·서버(RLS) 이중 가드. RLS 차단이 무음으로 빠지지 않는 유일 그룹. 다른 메뉴 FIX 시 참고 기준.
> 부트스트랩 제약: 최초 super_admin은 SQL 직접 INSERT 필요(닭-달걀, 의도된 설계).

### 3-6. 채용 클러스터 — 경로 A

| 기능 | 호출함수 | API/테이블 | 백엔드존재 | DB반영 | UI갱신 | 판정 | 끊긴 지점 | 위험 |
|---|---|---|---|---|---|---|---|---|
| 공고 신규 등록 | `handleSave`(insert) | `job_postings.insert().select('id')` | 없음 | RLS 차단 시 throw로 감지 | refetch | **정상** | — | 하 |
| 공고 수정 | `handleSave`(update) | `job_postings.update().eq` (select無) | 없음 | RLS 의존 | refetch | 깨짐(잠재) | JobPostingsMenu.tsx:295 | 중 |
| 섹션 변경(오늘/내일/상시) | `handleChangeSection` | `job_postings.update` (select無) | 없음 | RLS 의존 | refetch | 깨짐(잠재) | JobPostingsMenu.tsx:343 | 중 |
| 공고 삭제(soft) | `handleDelete` | `job_postings.update(status=deleted)` (select無) | 없음 | RLS 의존 | refetch | 깨짐(잠재) | JobPostingsMenu.tsx:366 | 중 |
| 지원자 단건 상태변경 | `handleUpdateStatus` | `job_applications.update().eq` (select無) | 없음 | RLS 의존 | refetch | **깨짐(잠재)** | ApplicantsMenu.tsx:204 | **상** |
| 확정/거절 알림 발송 | `handleUpdateStatus` 내부 | `notifications.insert` (select無) | 없음 | RLS 의존 | — | 깨짐(잠재) | ApplicantsMenu.tsx:212 | 중 |
| 지원자 대량 상태변경 | `handleBulkUpdate` | `job_applications.update().in` (select無) | 없음 | RLS 의존 | refetch | **깨짐(잠재)** | ApplicantsMenu.tsx:251 | **상** |
| 확정인원/채용Summary 조회·필터·CSV | `fetchData` 등 | `job_*.select` | 없음 | 읽기 | refetch | 정상 | — | 하 |
| JobsMenu | — | — | — | — | — | **데드코드** | JobsMenu.tsx:6-16 빈 안내 컴포넌트 | 하 |

> 참고(표시버그 후보): RecruitSummary 채용소요일 KPI는 `work_confirmed_at`에 의존하나 확정 처리는 `work_date`만 채울 가능성 → KPI가 '-'로 표시될 수 있음(추정, 스키마 확인 필요).

### 3-7. 설정 (Settings) — 경로 B 위주, 일부 A 혼재

| 기능 | 호출함수 | API/테이블 | 백엔드존재 | DB반영 | UI갱신 | 판정 | 끊긴 지점 | 위험 |
|---|---|---|---|---|---|---|---|---|
| 권한레벨/마스킹키 저장 | `patchSetting` | PATCH `/admin/settings` | **있음** | 토큰 일치 시 O | setState/refetch | 정상(토큰 의존) | — | 중~상 |
| 법정 변수 저장 | `patchSetting`×2 | PATCH `/admin/settings` | **있음** | 토큰 일치 시 O | refetch | 정상(토큰 의존) | — | **상**(계산값 영향) |
| Discord 웹훅 저장 | `patchSetting`×2 | PATCH `/admin/settings` | **있음** | 토큰 일치 시 O | refetch | 정상 | — | 중 |
| Discord 테스트 발송 | `supabase.functions.invoke('notify-inquiry')` | Edge Function | 엣지(무관) | 발송만 | msg | 조건부(엣지 배포 의존) | DiscordSettings.tsx:33-56 | 중 |
| IP 차단 추가 | `blockIp` | POST `/admin/blocked-ips` | **있음** | 토큰 일치 시 O | refetch | 정상 | 실패 시 에러표시 없음(IpBlockManager.tsx:24-31) | 중 |
| IP 차단 해제 | `unblockIp` | DELETE `/admin/blocked-ips/{id}` | **있음** | 토큰 일치 시 O | refetch | 정상 | — | 중 |
| CMS 공지/배너 저장 | `upsertSetting`(로컬) | **supabase `system_settings.upsert`** | 없음(직접) | **RLS `is_admin()` 의존** | refetch | 잠재 무반영 | CmsSettings.tsx:11-17,27-44 | **상** |

> **인증 경로 이원화 위험(상)**: Settings는 쓰기=백엔드(토큰)/읽기=supabase 혼용. CMS만 쓰기까지 supabase 직접(RLS). → 토큰은 맞지만 RLS는 못 통과하는 상황에서 "어떤 설정은 저장되고 어떤 건 조용히 무반영"되는 불일치.

### 3-8. 대시보드 / 타겟 / 로그 — 조회 위주

| 기능 | 호출함수 | API/소스 | 백엔드존재 | 데이터 | 판정 | 비고 | 위험 |
|---|---|---|---|---|---|---|---|
| 대시보드(개요/방문자/계산기/채용/타겟) | `getAdminStats`/`getAdminAnalytics` | supabase 직접 집계 | 미사용 | 실데이터 | 정상 | `daily.clicks`는 항상 0 하드코딩(api.ts:437) | 하 |
| 타겟 분석 차트 | `getTargetInsights` | supabase 직접 | 미사용 | 실데이터 | 정상 | 빈값 방어 있음. 목업 없음 | 하 |
| AuditMenu(=AuditLogsMenu) 감사로그 | supabase 직접 `audit_logs` | 경로 A | (있으나 미사용) | RLS 의존 | **조건부정상** | RLS면 미등록 admin에 빈 화면. **CSV/XLSX 내보내기 버튼 없음** | **중** |
| ServerLogsMenu 감사탭 | `getAuditLogs` | GET `/admin/logs` → audit_logs | **있음(경로 B)** | service-role | 정상 | 같은 테이블을 A/B 두 경로로 봐서 가시성 다를 수 있음. CSV는 현재 50건만 | 하 |
| ServerLogsMenu 시스템탭 | supabase 직접 `system_logs` + Realtime | 경로 A | 없음 | 실데이터 | 정상 | LIVE 구독 동작 | 하 |
| target/ 4개 컴포넌트 | — | — | — | — | **고아(orphan) 데드코드** | 어디서도 import 안 됨(TargetMenu가 inline 대체) | 하 |
| 감사로그 기록 `logAdminAction` | supabase `audit_logs.insert` (select無, `catch{}`) | 경로 A | 백엔드 `_write_audit`는 별개(service-role) | RLS 의존 | **깨짐(잠재)** | adminAuditLog.ts:35,56,65 | 중 |

> `logAdminAction`도 RLS `is_admin()` 필수인데 무음 처리 → **미등록 admin의 행동은 감사로그에 안 남는다**(규제상 문제 소지). 반면 경로 B의 `_write_audit`는 service-role로 항상 기록.

---

## 4. 위험도순 종합 요약

### 🔴 상 (운영 정확성/규제 직결)
1. **문의 상태/답변/일괄 변경 무음 실패** (3-1) — 대표 증상. RLS 종속 + `.select()` 누락 + 낙관적 갱신 + (BulkActionBar) `catch{} silent`. 정상 백엔드 경로가 있음에도 미사용.
2. **지원자 상태변경(단건/대량) 무음 실패** (3-6) — 출근확정/거절이 화면상 처리되나 DB 미반영 가능. 채용 운영 핵심.
3. **설정 인증 경로 이원화 + CMS supabase 직접** (3-7) — 일부 저장은 되고 일부는 조용히 무반영. 법정변수는 계산 결과에 직접 영향.
4. **회원 마스킹 = 보안 기능 아님** (3-4) — PII 전량 클라 전송 후 시각적 가림만. 보안키 평문 비교.

### 🟡 중
5. **공지 CRUD 무음 실패** (3-3) — error 미체크 + try/catch 전무(이 그룹 최악의 무음).
6. **템플릿 삭제 무음 실패** (3-2).
7. **AuditMenu RLS 의존 빈 화면 + 같은 테이블 A/B 경로 분기** (3-8).
8. **logAdminAction 무음 → 미등록 admin 감사 누락** (3-8).
9. **에러 핸들링 누락**: IpBlockManager `handleBlock`, TemplateManager `handleCreate`(catch 없이 finally만).

### 🟢 하 (정리/표시)
10. **미연결**: 템플릿 use_count 증가(백엔드만 존재), 회원 탈퇴/수정(부재), AuditMenu CSV 부재.
11. **데드코드**: JobsMenu(빈 컴포넌트), target/ 4개 고아 컴포넌트.
12. **표시버그 후보**: 대시보드 `daily.clicks=0` 하드코딩, RecruitSummary 채용소요일 KPI, AuditLogTable CSV 현재 50건만.

### ✅ 깨끗함
- AccountsMenu(모범 표준), ConfirmedMenu/RecruitSummaryMenu(읽기전용), DashboardMenu/TargetMenu(실데이터), ServerLogsMenu.

---

## 5. "껍데기 버튼" 색출 결과

완전한 빈 onClick / console.log만 / 주석처리 버튼은 **발견되지 않았다.** 모든 버튼은 핸들러에 연결돼 있다. "미연결"로 분류된 것은 **기능 자체가 없는 경우**(템플릿 use_count, 회원 탈퇴, AuditMenu CSV)와 **데드코드 컴포넌트**(JobsMenu, target/*)뿐이다. 즉 이 어드민의 문제는 "버튼이 가짜"가 아니라 **"진짜 버튼이 조용히 실패한다"**이다.

---

## 6. FIX 단계(별도 진행) 전 확인 체크리스트 — *지금은 수정하지 않음*

> 아래는 다음 FIX 세션에서 검토할 항목 메모. 본 세션에서는 코드를 고치지 않는다.

1. **DB 확인 ①**: 운영에서 로그인하는 관리자 이메일이 `admin_accounts(is_active=true)`에 존재하는가? (대표 버그 1순위 가설 확정용)
2. **DB 확인 ②**: `inquiries` 테이블에 `answered_at` 컬럼이 실제로 있는가? (답변 저장 경로 확정용)
3. **방향성 결정**: 경로 통일 — (A) 쓰기를 전부 백엔드(service-role, RLS 우회) 경로로 모으거나, (B) Supabase 직접을 유지하되 모든 UPDATE/DELETE에 `.select()` + `if(error) throw` + 화면 에러표시를 강제. (AccountsMenu가 B 표준 사례.)
4. 모든 경로 A 쓰기에서 `.select()` 누락 일괄 점검(grep: `.update(`/`.delete(` without `.select(`).
5. BulkActionBar `catch{} //silent` 및 logAdminAction 무음 처리 재검토.
6. 회원 마스킹의 서버측 마스킹 전환(PII 선반입 제거).
7. 데드코드 정리(JobsMenu, target/* 4개) 및 미사용 백엔드 inquiries 라우트 처리 결정.

---

*본 보고서는 조사 결과만 담는다. 코드 수정·커밋·배포는 수행하지 않았다.*
