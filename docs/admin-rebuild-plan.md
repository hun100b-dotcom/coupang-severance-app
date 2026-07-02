# CATCH 어드민 원점 재설계 플랜 (기능부터 재설계) — 2026-07-02

> **성격**: 플랜(설계 문서)만. **코드·커밋·구현 없음.** 승인 후 별도 단계에서 구현.
> **의미 정의**: "데이터 지우고 다시 설계" = **어드민 프론트 구현 코드의 원점 재작성**을 뜻함.
> **⛔ 절대 금지**: 실제 운영 DB(회원·공고·문의·계정 등) 데이터 삭제/변경 금지 · 28일 블록 등 계산 로직 불변.
> **근거 문서**: `admin-audit.md`, `admin-redesign-proposal.md`, `audit/admin_function_audit_2026-06-29.md`(기능 전수조사), CLAUDE.md 상시규칙 1~4.
> **현재 상태 기준선**: P4(공지·문의 백엔드 이관) + 회원/지원자 서버 마스킹·reveal 백엔드화 + 게이트 DB화(SUPER_ADMIN_EMAIL 제거) **반영 후**. 즉 2026-06-29 감사 이후 상당수 백엔드화가 이미 진행됨 — 본 플랜은 **현재 코드 실측(2026-07-02)** 기준.

---

## 0. 문제 정의 (왜 원점인가)

지난 작업들은 **프레젠테이션(테두리·색·헤더·토큰)** 위주였고, 기능·구조의 **알맹이**(호출 경로 이원화, 중복 화면, 죽은 기능, 무음 실패 구조, 산만한 IA)는 그대로였다. 이번 재설계의 성공 기준은 **"속이 바뀌는 것"** — ① 호출 경로 단일화(백엔드 우선) ② 중복·죽은 기능 제거 ③ 핵심 코어만 남긴 IA ④ 전 화면 4상태·에러가시성 표준화.

핵심 구조 결함(감사 요약):
- **호출 경로 이원화**: 같은 화면에서 일부는 Supabase 직접(경로 A·RLS 종속), 일부는 백엔드(경로 B·service-role). → "어떤 버튼은 되고 어떤 건 조용히 안 됨".
- **무음 실패**: 경로 A의 UPDATE/DELETE가 `.select()` 없이 호출 → RLS 0행 차단이 `error=null`로 통과 → 거짓 성공.
- **중복·죽은 화면**: Target 2중 노출, 채용분석 3중, 감사로그 2경로, JobsMenu·target/* 고아.

---

## 1. ★ 기능 전수 인벤토리 (현재 2026-07-02 기준)

> 열: **무엇을 함 / 연결 데이터·엔드포인트 / 프론트 연계(경로) / 실사용 / 중복·번잡**
> 경로표기: **[B]**=백엔드 API(`api.*`+X-Admin-Token, service-role) · **[A]**=Supabase 직접(RLS 종속)

### 1-A. 사이드바 메뉴 (14개) — 대분류: 대시보드 / 채용·인원 / 콘텐츠 / 시스템

| # | 메뉴(컴포넌트) | 주요 액션 | 데이터/엔드포인트 | 경로 | 실사용 | 중복·번잡 |
|---|---|---|---|---|---|---|
| 1 | **대시보드**(DashboardMenu→5서브탭) | 서브탭 전환 | 하위 참조 | — | O | 서브탭에 Target·채용 중복 포함 |
| 2 | **Target**(TargetMenu, system그룹) | 퍼널·세그먼트·인사이트 차트 | `/admin/target/{companies,segments,insights}` `getTargetInsights` | B(읽기) | O | 🔴**대시보드 '타겟' 서브탭과 동일 컴포넌트 2중 노출** |
| 3 | **채용공고**(JobPostingsMenu) | 목록·5스텝 등록·수정·삭제(soft)·섹션변경·상태필터·검색·CSV | `job_postings`(insert/update/delete) `job_applications`(count) | **A**(쓰기4, `.select('id')`+0행에러 有) | O | 폼 5스텝 과중(입력필드 다수) |
| 4 | **지원자**(ApplicantsMenu) | 목록(서버마스킹)·6필터·단건상태변경·대량상태변경·reveal·CSV·마스킹해제 | 읽기/reveal `/admin/applications`·`/applications/reveal` [B] · 상태쓰기 `job_applications.update` [A] · 알림 `notifications.insert`[A] | **혼재**(읽기B/쓰기A) | O | 🟡읽기=B인데 쓰기=A(경로 이원화 잔존) |
| 5 | **채용현황**(ConfirmedMenu) | 2단계필터·KPI·일별차트·교대/업무분포 | `job_applications.select` 집계 | A(읽기) | O | 🔴**RecruitSummary·대시보드 '채용' 서브탭과 분석 중복** |
| 6 | **채용Summary**(RecruitSummaryMenu) | 사업장별 공고현황·전환/충원율·트렌드·소요일 | `job_*.select` 집계 | A(읽기) | O | 🔴**Confirmed와 중복** · 소요일 KPI 표시버그 후보(`work_confirmed_at` 의존) |
| 7 | **공지사항**(NoticesMenu) | 목록·추가·수정·토글·삭제 | `/admin/notices` GET/POST/PATCH/DELETE | **B**(P4 이관) | O | — (배너 공개읽기 useNotices는 별개) |
| 8 | **문의**(InquiriesMenu +InquiryTable/DetailPanel/TemplateManager/BulkActionBar) | 목록·필터·검색·상태변경·답변·대량·템플릿CRUD·CSV | `/admin/inquiries*` `/admin/templates*` | **B**(P4 이관) | O | 잔여 supabase직접 1(확인 필요) |
| 9 | **회원**(MembersMenu) | 목록(서버마스킹)·검색·마케팅필터·reveal(보안키)·마스킹키설정 | `/admin/members` `/members/reveal` `/members/unmask-key*` | **B** | O | — (감사 '보안 아님' 지적은 서버마스킹으로 해소됨) |
| 10 | **관리자계정**(AccountsMenu) | 추가·역할변경·활성토글·삭제 | `admin_accounts`(insert/update/delete) | **A**(표준 안전패턴: error체크+이중가드) | O | ✅표준 모범(무음 아님) |
| 11 | **보안현황**(SecurityMenu, super) | 역할메타·감사조회 등 | `getAuditLogs` [B] 등 | B | O | 감사로그 열람이 Audit/ServerLogs와 겹침 |
| 12 | **서버로그**(ServerLogsMenu) | 감사탭(로그조회)·시스템탭(system_logs+Realtime) | 감사 `/admin/logs`[B] · 시스템 `system_logs`[A]+Realtime | 혼재 | O | 🟡감사로그를 AuditMenu와 2경로로 봄 |
| 13 | **Audit Logs**(AuditLogsMenu=AuditMenu 재수출, super) | 감사로그 조회·필터 | `getAuditLogs` [B] | B | O | 🔴**ServerLogs 감사탭과 동일 데이터** · 재수출 명칭중복 |
| 14 | **설정**(SettingsMenu +Cms/Discord/IpBlock/LegalVariables) | 권한레벨·마스킹키·법정변수·Discord웹훅·IP차단·CMS배너 | `/admin/settings` `/admin/blocked-ips` `patchSetting`(CMS/법정/Discord) | **B**(대부분) | O | Discord테스트=Edge Function 의존 |

### 1-B. 대시보드 서브탭 (5개, DashboardSubTabs)

| 서브탭(컴포넌트) | 무엇을 함 | 데이터 | 실사용 | 중복 |
|---|---|---|---|---|
| 개요(OverviewTab) | KPI 히어로+보조·추이차트·문의분포·최근문의/공지·날짜범위 | `getAdminStats`/`getAdminAnalytics`[B]·notices[A읽기] | O(방금 재설계) | — |
| 방문자(VisitorTab) | 유입/방문 분석 | `getAdminAnalytics` | O | 개요와 일부 지표 겹침 |
| 계산기(CalcStatsTab) | 서비스별 계산 통계 | stats/analytics | O | — |
| 채용(RecruitTab) | 공고/지원 현황 | job 집계 | O | 🔴**Confirmed/RecruitSummary와 3중 중복** |
| 타겟(TargetTab→TargetMenu) | 세그먼트·인사이트 | target endpoints | O | 🔴**사이드바 Target 메뉴와 동일 컴포넌트** |

### 1-C. 데드코드·고아 (확인 완료)

| 항목 | 상태 | 근거 |
|---|---|---|
| `menus/JobsMenu.tsx`(16줄) | **데드**(빈 안내, 미import) | grep 미참조 |
| `target/CompanyPieChart·UserTagsPanel·WageSegment·WorkDurationSegment` | **고아 데드**(미import; TargetMenu가 inline 대체) | grep 미참조 |
| `AuditLogsMenu.tsx`(3줄) | AuditMenu **재수출**(명칭 중복) | 파일 내용 |
| `TargetTab.tsx`(9줄) | TargetMenu **재수출**(중복 노출 경로) | 파일 내용 |
| 백엔드 `/admin/templates/{id}/use`(POST) | 프론트 미호출(**미연결**) | api.ts export 없음 |

### 1-D. 잔여 구조 리스크(현재)

- **경로 이원화 잔존**: 지원자 상태쓰기·알림(A) / JobPostings 쓰기(A). 나머지는 대부분 B로 수렴됨.
- **감사로그 이중 경로**: `audit_logs`를 A(구 AuditMenu 흔적)·B(`/admin/logs`) 혼재 열람 → 가시성 상이.
- **대시보드 daily.clicks 하드코딩 0**(api.ts) 표시버그 후보.

---

## 2. ★ 정리 판정 (유지 / 제거 / 통합간소화)

| 대상 | 판정 | 근거 |
|---|---|---|
| JobsMenu | 🗑**제거** | 데드(빈 컴포넌트) |
| target/* 4개 컴포넌트 | 🗑**제거** | 고아 데드(미사용) |
| AuditLogsMenu(재수출) | 🗑**제거→통합** | AuditMenu와 명칭중복 |
| TargetTab(재수출) + 사이드바 Target 2중 | 🔀**통합**(1곳만) | 동일 컴포넌트 2중 노출 |
| ConfirmedMenu + RecruitSummaryMenu + 대시보드 RecruitTab | 🔀**통합**(단일 "채용 분석") | 분석 3중 중복 |
| AuditMenu(audit_logs) + ServerLogs 감사탭 | 🔀**통합**(단일 감사로그, 경로 B) | 동일 데이터 2경로 |
| SecurityMenu 감사조회 | 🔀 감사로그 코어로 흡수 검토 | 열람 중복 |
| 지원자 상태쓰기·알림 (경로 A) | 🔧**백엔드 이관**(신규 엔드포인트) | 경로 이원화·무음 위험 |
| JobPostings 쓰기 (경로 A) | 🔧**백엔드 이관** 또는 A유지+`.select`강제 | 경로 통일 |
| 대시보드 서브탭 5 → 축소 | 🔀**간소화**(개요+분석 중심, 방문자/계산기 통합 검토) | 지표 중복 |
| 그 외(공지/문의/회원/계정/설정/공고 목록·폼) | ✅**유지**(기능 필요) | 실사용·핵심 |
| 관리자계정(AccountsMenu 패턴) | ✅**유지+표준화 기준으로 채택** | 유일한 무음-무결 표준 |

**제거 목록(요약)**: JobsMenu · target/* 4파일 · AuditLogsMenu 재수출 · TargetTab 재수출 · (통합으로 흡수) ConfirmedMenu·RecruitSummaryMenu·RecruitTab 중 2개 · ServerLogs 감사탭 또는 AuditMenu 중 1개.

**미연결 정리**: 템플릿 use_count 엔드포인트는 프론트 연결 or 백엔드 제거 중 택1(사용 안 하면 제거).

---

## 3. ★ 핵심 코어 세트 (실제 필요한 어드민만) + 완성 플로우

> 각 코어는 [진입→작업→결과→예외] + **4상태(로딩/성공/실패/빈)** 표준.

| 코어 | 포함(통합) | 완성 플로우 | 4상태 |
|---|---|---|---|
| **C1 운영 대시보드** | Overview(핵심) + 방문자/계산기 지표 흡수 | 진입=KPI로드→날짜범위/새로고침→요약카드·추이차트→예외=재시도 | 스켈레톤/차트/실패재시도/빈안내 |
| **C2 채용 운영** | 채용공고(CRUD) + 지원자(상태·확정·알림) 한 흐름 | 공고선택→지원자 처리(확정/거절/대량)→알림발송→감사로그 | 로딩/반영성공토스트/실패명시/빈 |
| **C3 채용 분석** | Confirmed+Summary+RecruitTab **통합 1화면** | 필터(사업장·기간)→KPI·차트·표·CSV | 로딩/차트/실패/빈 |
| **C4 고객 소통** | 문의(상태·답변·템플릿·대량) + 공지 | 문의선택→답변/상태→refetch반영 · 공지 CRUD | 낙관적+refetch/실패표시/빈 |
| **C5 회원 관리** | 회원 목록(서버마스킹)·검색·reveal | 검색→마스킹목록→보안키 reveal 단건 | 로딩/목록/키오류/빈 |
| **C6 접근·보안·감사** | 관리자계정 + IP차단 + **감사로그 단일** + 보안현황 | 계정관리(이중가드)·IP차단·감사조회/CSV | 로딩/성공/실패/빈 |
| **C7 설정** | 법정변수·권한레벨·마스킹키·CMS·Discord | 로드→편집→저장 반영 | 로딩/저장성공/실패/빈 |
| (선택) **C8 타겟 인사이트** | TargetMenu(중복 제거 후 1곳) | 세그먼트/퍼널 조회 | 로딩/차트/실패/빈 |

→ 14메뉴+5서브탭(≈19 진입점) → **7~8 코어**로 축약.

---

## 4. ★ 프론트 완벽 연계 (데이터모델·인증·경로 정합)

| 축 | 현재 | 재설계 원칙 |
|---|---|---|
| **인증 게이트** | AdminPage: DB(`admin_accounts` is_active) 단일 판정(이미 개선됨) | 유지. 역할(super/admin/viewer) 메뉴 필터를 **가시성=신뢰경계**로 실제 차단 |
| **쓰기 경로** | 혼재(A/B) | **백엔드(B, service-role) 단일화** 목표. 잔여 A(지원자쓰기·JobPostings·계정)는 이관 or `.select()`+에러표시 강제 |
| **읽기 경로** | 혼재 | 집계·목록은 백엔드 우선. 실시간(system_logs)만 supabase Realtime 유지 |
| **데이터 훅** | 각 메뉴가 개별 fetch/useState/에러처리 산발 | 공용 `useAdminResource`(로딩/에러/refetch/4상태 표준) 훅으로 통일 |
| **에러 가시성** | 무음 실패 잔존 | 모든 mutation: 실패 시 HTTP/에러 throw→catch→화면 표시(AccountsMenu 표준) |
| **감사로그** | A/B 2경로 | **경로 B(`_write_audit`/`/admin/logs`) 단일**. 프론트 logAdminAction도 백엔드 `/admin/audit-log`로 |
| **사용자앱 정합** | up.* 토큰·Pretendard·mono·supabase 스키마 | 어드민 전용 유틸(text-a*·adminUI) 유지, 전역 index.css·pages/*·ui/* 불변 |
| **계산 로직** | 백엔드 severance/* | **불변**. 법정변수 저장만 어드민, 계산은 백엔드 서비스 |

---

## 5. ★ 원점 재설계 아키텍처 (새 IA·구조)

### 5-1. 새 IA (7 코어 기준, 사이드바 그룹)
```
[셸] AdminShell(딥네이비 레일 + 글래스 상단바 — 완료분 유지)
├─ 운영            → C1 대시보드
├─ 채용            → C2 채용 운영(공고+지원자) · C3 채용 분석
├─ 소통            → C4 문의 · C4 공지
├─ 인원            → C5 회원 · C6 관리자계정
└─ 시스템          → C6 감사·보안(IP/감사로그 단일) · C7 설정 · (C8 타겟)
```
- 중복 진입점 제거: Target 1곳 · 채용분석 1곳 · 감사로그 1곳.

### 5-2. 새 폴더/컴포넌트 구조 (기능 응집)
```
components/admin/
├─ shell/        AdminShell·Sidebar·TopBar (프레젠테이션 완료분)
├─ core/         코어별 화면 (dashboard/recruit-ops/recruit-analytics/support/members/access/settings/target)
│    각 core = index(진입) + hooks(데이터) + parts(표/카드/폼)
├─ data/         useAdminResource(공용 fetch·4상태), adminClient(경로 단일 래퍼)
├─ ui/           AdminPageHero·Panel·AdminTable·AdminButton·AdminState·KPI (표준 프리미티브, 완료분 재사용)
└─ (제거)        menus/JobsMenu, target/*, AuditLogsMenu, TargetTab, 중복 분석 2개
```
- **버릴 것**: 데드/고아/재수출/중복 컴포넌트(2장 제거목록).
- **신규**: `data/useAdminResource`·`data/adminClient`(경로 단일), core별 통합 화면(C2·C3·C6), 역할 메뉴 필터.
- **속이 바뀌는 지점**: 화면 수 축소 · 경로 단일화 · 데이터 훅 표준화 · mutation 에러가시성 강제 (색·테두리 아님).

### 5-3. 백엔드 정합(신규/정리 후보)
- 신규: `/admin/applications/{id}/status`·`/applications/bulk-status`(지원자 쓰기 이관), (선택)`/admin/job-postings*`(공고 쓰기 이관).
- 정리: 미연결 `/admin/templates/{id}/use` 연결 or 제거. 감사 경로 B 단일.

---

## 6. ★ 스텝별 워크플로우 (충돌 안 나는 순서)

> 각 스텝: **[빌더]→[엄격 더블리뷰 5축]→회귀(사용자앱 computed px 측정, 0px)→커밋·push**. 각 코어 배포마다 헤드리스 실렌더(카드/표 opacity>0·height>0) 검증.

| 스텝 | 범위 | 신규 | 폐기 | 게이트 |
|---|---|---|---|---|
| **S0 기반** | `data/useAdminResource`+`adminClient`(경로 단일 래퍼)·역할 메뉴필터·데드코드 제거(JobsMenu·target/*·재수출) | 데이터훅·클라이언트 | 데드 4+2 | 빌드·회귀0·헤드리스 |
| **S1 C1 대시보드** | 서브탭 축소·개요 중심 재구성(완료분 정리) | — | Recruit/Target 서브탭 | 5축·회귀·헤드리스 |
| **S2 C4 소통** | 문의+공지 통합 화면(이미 백엔드) UX 표준화 | — | — | 5축·회귀·헤드리스 |
| **S3 C5 회원 + C6 계정** | 회원(서버마스킹)·계정(표준) 새 비주얼·훅 이관 | — | — | 5축·회귀·헤드리스 |
| **S4 C2 채용 운영** | 공고+지원자 통합 흐름 · **지원자 쓰기 백엔드 이관**(신규 엔드포인트) | 백엔드 status/bulk | — | 5축·회귀·헤드리스·**백엔드 py검증** |
| **S5 C3 채용 분석** | Confirmed+Summary+Recruit **통합 1화면** | 통합 분석 | 중복 2화면 | 5축·회귀·헤드리스 |
| **S6 C6 감사·보안 + C8 타겟** | 감사로그 단일(경로B)·IP·보안·Target 1곳 | — | Audit/ServerLogs 중복·Target 중복 | 5축·회귀·헤드리스 |
| **S7 C7 설정** | 설정 통합·에러가시성 표준 | — | — | 5축·회귀·헤드리스 |
| **S8 마감** | 전 코어 4상태·접근성 AA·회귀 전수·미연결 정리 | — | 미연결 잔재 | 최종 5축·통합검수 |

- **순서 근거**: S0(공용 기반)이 모든 코어의 전제 → 저위험 읽기 코어(대시보드·소통·회원)부터 → 고위험 쓰기 이관(채용 운영)·통합(분석)·감사 순. 백엔드 변경(S4)은 프론트와 **같은 커밋 묶음**으로 배포(배포순서 불일치 회피).
- **각 스텝 배포**: main 병합·push(자동배포) 후 종훈님 라이브 확인 → 다음 스텝.

---

## 7. 리스크 · 롤백 · 운영데이터 보호

### 7-1. 운영 데이터 보호 (최우선)
- **DB 데이터 절대 미변경**: 재설계는 프론트 구현 코드 재작성 한정. `DELETE`/`TRUNCATE`/스키마 파괴 금지. 기존 CRUD는 **기존 테이블·엔드포인트를 그대로** 사용.
- 신규 백엔드 엔드포인트는 **기존 RLS/스키마 준수**(service-role는 우회하되 데이터 의미 불변).
- 계산 로직(28일 블록·severance 서비스) **불변**. 법정변수는 저장 UI만, 계산은 백엔드.

### 7-2. 롤백 안전장치
- 백업 태그 **`pre-admin-redesign-2026-07-02` 존재** → 언제든 복귀 가능. 스텝 시작 전 추가 태그(`pre-rebuild-<date>`) 권장.
- **신규 브랜치**에서 진행(예 `redesign/admin-core-rebuild`), 스텝별 커밋으로 원자적 롤백.
- 각 스텝 배포 후 문제 시: 해당 커밋 revert 또는 태그 체크아웃.

### 7-3. 회귀·리스크
| 리스크 | 완화 |
|---|---|
| 사용자앱 폰트/레이아웃 회귀 | 스텝마다 헤드리스 computed px 측정 0px(어드민 전용 유틸·전역 index.css 불변) |
| 어드민 렌더 무증빙 | /admin DB게이트라 헤드리스 실렌더는 목/격리 하네스로 카드·표 opacity>0·height>0 검증(선례 확립) |
| 지원자/공고 쓰기 이관 중 기능 파손 | 이관 시 기존 supabase 경로와 **동작 동일성** 확인(상태전이·알림) 후 스위치. 백엔드+프론트 동일 커밋 |
| 배포순서 불일치(Vercel<Render) | 백엔드 의존 변경은 같은 병합에 포함, 배포 후 라이브 확인 |
| framer 빈섹션 재발 | ★framer variants 조합 **금지**, CSS/단순 initial-animate만 |

---

## 8. 승인 요청 (Approve 후 S0부터 구현)

1. **범위**: 14메뉴+5서브탭 → **7~8 코어로 축약** + 중복/데드 제거 — 동의?
2. **경로 단일화**: 쓰기=백엔드(B) 우선(지원자·공고 이관 포함) — 동의? (or 잔여 A는 `.select()`강제만)
3. **통합**: 채용분석 3→1 · 감사로그 2→1 · Target 2→1 — 동의?
4. **워크플로우**: S0(기반)→코어별 스텝, 각 [빌더]→[리뷰5축]→회귀0px→헤드리스검증→커밋·push·라이브확인 — 동의?
5. **데이터 보호**: 운영 DB 무변경·계산 불변·백업태그+신규브랜치 — 확인.

> 승인 주시면 **S0(공용 데이터훅·경로 클라이언트·데드코드 제거)** 부터 착수합니다. **승인 전 구현 없음.**

---

_본 문서는 플랜만 담는다. 코드 수정·커밋·구현은 수행하지 않았다._
