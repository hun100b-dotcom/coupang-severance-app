# 어드민 페이지 전수조사 (2026-07-06)

> 지시: ①접속 시 무한로딩→백엔드 에러 즉시 수정 ②어드민 전체 전수조사 ③애널리틱스 4지표
> 실제값화 + 유입경로 + 경로 한글표기 + 툴팁 ④고도화 로드맵 제안.
> 원칙: 실측 우선(추측 금지), 계산 로직 무변경. 라이브 실측 근거만 기록.

---

## A. 블로킹 버그 — "무한로딩 후 백엔드 에러" (근본원인 확정 + 수정 완료·라이브 검증)

### 증상
어드민 로그인 후 `/admin` 진입 → 스피너("관리자 권한 확인 중…"·"대시보드를 불러오는 중…")가
오래 돌다가 **"대시보드 로드 실패 — 관리자 인증 실패"** 에러.

### 근본원인 (라이브 실측으로 확정 — 토큰 불일치)
1. 프론트(`frontend/src/lib/api.ts:404-407`)는 어드민 API 헤더 `X-Admin-Token` 값을
   **`VITE_ADMIN_SECRET` → 없으면 anon key 뒤 32자**로 파생한다.
2. Vercel(프로덕션)에는 `VITE_ADMIN_SECRET`이 **설정돼 있지 않다**. 실제 프로덕션 번들
   (`/assets/index-*.js`)에 구워진 API 베이스는 `https://coupang-severance-app.onrender.com/api`
   이고, 어드민 토큰은 **anon key 뒤 32자 = `qHRoYc-…fddog`**로 확인됨.
3. 백엔드(`backend/app/api/admin.py`)의 허용 토큰 집합 `_VALID_ADMIN_TOKENS`에는
   `_DEFAULT_ADMIN_SECRET("Luck2058qorwhdgns3")` + `ADMIN_SECRET` env 만 있고,
   **anon 파생 토큰이 빠져 있었다.**
4. 결과 → 프론트가 보내는 토큰(anon 파생)이 백엔드 허용셋에 없어 **모든 어드민 백엔드 호출이 401**.

### 실측 증거
| 시점 | 요청 | 토큰 | 결과 |
|------|------|------|------|
| 수정 전 | `GET /api/admin/stats` | anon 파생(`qHRoYc-…`) | **401** `{"detail":"관리자 권한이 없습니다."}` |
| 수정 전 | 동일 | 기본 `Luck2058qorwhdgns3` | 200 (실데이터) |
| **수정 후(라이브)** | `GET /api/admin/stats` | anon 파생(`qHRoYc-…`) | **200** (유저 57명 등 실데이터) |

대시보드 진입 시 `OverviewTab`은 `Promise.all([stats, analytics, inquiries, notices])`를
한 번에 호출(`frontend/src/components/admin/tabs/OverviewTab.tsx:46`) → **넷 다 401이면 통째로 실패**.
콜드스타트(첫 호출 8.5초)와 겹쳐 "무한로딩처럼 보이다 에러"로 체감됨.

### 수정 (커밋 `3c35ad8`)
`admin.py`의 `_VALID_ADMIN_TOKENS`에 **프론트와 동일 파생값(anon key 뒤 32자)**을 추가.
env·기본 anon 둘 다에서 파생해 넣어 env 드리프트에도 견고.
→ 프론트 토큰 = 백엔드 허용 토큰 계약 일치. `git push`만으로 Render 자동 재배포(외부 클릭 불필요).

### A-2. 후속 재발 신고 — "백엔드 연결 실패"의 진짜 원인은 CORS (2026-07-06, 커밋 `0af3b6a`)
토큰 수정 후에도 슈퍼관리자(dfc5238@naver.com)가 **`coupang-severance-app.vercel.app`/ADMIN** 에서
"백엔드 서버에 연결할 수 없습니다" 에러. 라이브 실측으로 근본원인 확정:
- 앱은 **두 Vercel 별칭 도메인**(`catch-daily-worker.vercel.app`·`coupang-severance-app.vercel.app`)이
  같은 배포를 서빙. 그런데 백엔드 CORS `allow_origins` 에는 **`catch-daily-worker` 만** 있었다.
- 종훈님이 접속한 `coupang-severance-app.vercel.app` 오리진은 CORS 미허용 → 브라우저가 요청 차단
  (프리플라이트 **400**, `access-control-allow-origin` 헤더 없음). axios 는 `!error.response` 로
  받아 "백엔드 연결 실패" 문구 표시. **curl 은 CORS 를 강제 안 해 200** → 백엔드는 정상으로 보였음(함정).
- 실측 대조: `catch-daily-worker` 오리진=프리플라이트 200+allow-origin 헤더 O / `coupang-severance-app`=400+헤더 X.
- **수정**: `coupang-severance-app.vercel.app` 을 허용목록에 추가 + 두 프로젝트의 별칭·프리뷰 배포를
  `allow_origin_regex` 로 커버(재발 방지). 무관 도메인(`evil-site.vercel.app`)은 정규식이 차단(실측).
- 재시도(_idempotent/GET)는 콜드스타트엔 유효하나 **CORS 차단은 재시도해도 매번 막혀** 못 고침 → CORS 허용이 해결책.

### 보안 메모 (고도화 로드맵 P1로 이관)
`X-Admin-Token` 방식은 값이 `VITE_` 접두(=번들에 구워짐) 또는 공개 anon 키 파생이라 **본질적으로
클라이언트에 노출**된다. 즉 이 토큰은 "비밀"이 아니라 소프트 게이트다. 실질 보안 경계는
①OAuth 로그인 + `admin_accounts.is_active` 게이트(`AdminPage.tsx:139`) ②Supabase RLS 다.
→ 진짜 하드닝은 어드민 엔드포인트를 **Supabase JWT(로그인 세션) 검증**으로 옮기는 것(로드맵 P1).

---

## B. 어드민 전수조사 — 메뉴/데이터소스/상태처리

어드민 셸: `frontend/src/pages/AdminPage.tsx`(진입 게이트 + 5코어 IA).
백엔드 라우트 총 **41개**(`backend/app/api/admin.py`), 전부 `service-role` 키로 RLS 우회.

### B-1. 메뉴 14개 · 데이터 소스 · 4상태(로딩/성공/실패/빈상태) 판정

| 코어 | 메뉴 | 컴포넌트 | 데이터 소스 | 판정 |
|------|------|----------|-------------|------|
| 운영 | 대시보드·개요 | `tabs/OverviewTab` | 백엔드 stats/analytics/inquiries/notices | ✅ 동작 (빈상태 UI 미흡) |
| 운영 | 대시보드·방문자 | `tabs/VisitorTab` | **(개편전)** Supabase 직접+`.limit(1000)` → **(개편후)** 백엔드 `/admin/visitor-stats` | ⚠️→✅ 이번 수정 |
| 운영 | 대시보드·계산 | `tabs/CalcStatsTab` | 백엔드 `/admin/reports` | ✅ 동작 |
| 채용 | 공고 | `menus/JobPostingsMenu` | **Supabase 직접**(job_postings CRUD) | 🟡 RLS 세션 의존(동작하나 백엔드화 권장) |
| 채용 | 지원자 | `menus/ApplicantsMenu` | 백엔드(마스킹) + reveal | ✅ 동작 |
| 채용 | 현황 | `menus/ConfirmedMenu` | 백엔드 `/admin/recruit-stats` | ✅ 동작 |
| 채용 | 분석 | `menus/RecruitSummaryMenu` | 백엔드 `/admin/recruit-stats` | ✅ 동작 |
| 소통 | 문의 | `menus/InquiriesMenu` | 백엔드 inquiries/templates | ✅ 동작 |
| 소통 | 공지 | `menus/NoticesMenu` | 백엔드 notices | ✅ 동작 |
| 인원 | 회원 | `menus/MembersMenu` | 백엔드(마스킹) + reveal | ✅ 동작 |
| 인원 | 관리자 | `menus/AccountsMenu` | **Supabase 직접**(admin_accounts CRUD) | 🟡 RLS 세션 의존 |
| 시스템 | 설정 | `menus/SettingsMenu` | 백엔드 settings/legal/blocked-ips | ✅ 동작 |
| 시스템 | 보안 | `menus/SecurityMenu` | 백엔드 blocked-ips/logs | ✅ 동작 |
| 시스템 | 서버로그 | `menus/ServerLogsMenu` | 백엔드 `/admin/logs` | ✅ 동작 |
| 시스템 | 감사 | `menus/AuditLogsMenu` | 백엔드 `/admin/logs` | ✅ 동작 |
| 시스템 | 타겟 | `menus/TargetMenu` | 백엔드 `/admin/target/insights` | ✅ 동작(조회 전용) |

> 정정: 초기 인벤토리 서브에이전트가 VisitorTab 데이터소스를 "getAdminAnalytics"로 오기재했으나,
> 실제 코드는 `supabase.from('visitor_logs').…limit(1000)` 직접 조회다(원본 재확인 완료).

### B-2. 발견된 결함/약점 (블로킹 아님)

| # | 항목 | 근거 | 판정 |
|---|------|------|------|
| 1 | 방문자 4지표 허수 | `VisitorTab` `.limit(1000)` + UTC '오늘' | 🔴 이번 수정(§C) |
| 2 | `markTemplateUsed()` 프론트 미연동 의심 | `api.ts:573` 정의, 호출부 탐색 필요 | 🟡 (2026-07-04 `14b84dc`가 use_count 연동했으나 함수 경로 재확인 권장) |
| 3 | 개요/방문자 탭 "데이터 없음" 빈상태 UI 미흡 | null 방어만 | 🟢 UX 개선(로드맵) |
| 4 | JobPostings/Accounts가 Supabase 직접 CRUD | RLS 세션 의존 | 🟡 백엔드화 시 견고(로드맵) |
| 5 | `X-Admin-Token`이 공개값(비밀 아님) | `api.ts:404`, `VITE_` 노출 | 🟡 보안 하드닝(로드맵 P1) |
| 6 | 유입경로 UTM 미수집 | `visitor_logs`에 utm 컬럼 없음 | 🟢 확장(로드맵, 마이그레이션 필요) |

---

## C. 애널리틱스 정확도 — 4지표 before → after

### 집계 위치
- **before**: `VisitorTab`이 브라우저 세션으로 `visitor_logs`를 직접 조회
  (`.limit(1000)`) 후 프론트에서 로컬 계산. 백엔드 `/admin/stats`·`/admin/analytics`는
  방문자 지표를 **전혀 다루지 않음**(유저/리포트/문의만).
- **after**: 백엔드 `GET /admin/visitor-stats`(service-role) 신설 → 진실값 계산.

### 지표별 정확도 비교

| 지표 | before (부정확 원인) | after (정확 근거) |
|------|----------------------|-------------------|
| 총 페이지뷰 | `logs.length` — **1000 상한**에 걸리면 실제와 무관하게 최대 1000 | `count=exact` 헤더로 **전 행 정확** 집계(조회 상한 무관) |
| 순 방문자 | 1000개 캡 안의 distinct 세션만 | 전 행(상한 5만) distinct 세션. 상한 도달 시 `truncated=true`로 정직 표기 |
| 오늘 방문 | `created_at.startsWith(UTC today)` — **UTC 기준**이라 00~09시(KST) 방문이 어제로 샘 | **KST 자정 경계** + `count=exact`로 정확 |
| 로그인 방문 | 1000개 캡 안의 user_id 보유 행 수(페이지뷰), 라벨 모호 | 회원 페이지뷰 + **실인원(distinct user_id) 병기**, 툴팁으로 기준 명시 |

> ⚠️ 정직성 원칙: 임의 추정 없음. 모든 값은 `visitor_logs` 실 집계. 데이터가 없으면 "데이터 없음",
> 조회 상한 초과 시 배너로 "상세는 최근 N건 기준"이라고 표기.

### 라이브 실측 결과 (2026-07-06, 프로덕션 백엔드)

| 지표 | before (허수) | after (전수 정확) | 비고 |
|------|---------------|-------------------|------|
| 총 페이지뷰 | 최대 1,000 (상한에서 멈춤) | **3,973** | count=exact |
| 순 방문자 | 871 (1,000행 기준) | **1,654** | 페이지네이션 전수 distinct — **약 2배 과소집계였음** |
| 오늘 방문 | UTC 기준(오차) | **159** | KST 자정 기준 |
| 로그인 방문 | 캡 안 값 | **374** (실인원 15명) | 전수 |

> 결정적 발견: 1차 백엔드 이관 후에도 **PostgREST(Supabase) max-rows=1000** 상한 탓에 순방문자가
> 여전히 871로 과소집계됐다. offset 페이지네이션으로 전 행을 실제 수집하니 **1,654**로 정정 —
> 라이브 검증이 아니었으면 놓쳤을 함정(허수가 프론트→백엔드로 옮겨졌을 뿐).
> 유입채널 전수도 드러남: 직접방문 2,822 / 앱내이동 904 / Naver 193 / Google 29 /
> geekcatch.tistory.com(블로그) 11 / Teams 링크 등.

### 유입경로 (referral)
- **현재 수집 상태**: `visitor_logs.referrer`에 `document.referrer`가 **이미 수집됨**
  (`useVisitorTracking.ts:71`). UTM 파라미터는 **미수집**(컬럼 없음).
- **개편**: 백엔드 `_classify_referrer()`로 referrer→채널 분류(직접 방문/앱 내 이동/Google·Naver·Daum
  검색/인스타·페북·유튜브·X/기타 외부). 어드민 "유입 경로" 섹션에 채널별 집계 표시.
- **UTM 확장 — ✅ 2026-07-06 실행 완료**: `20260706_visitor_utm.sql`(utm_source/medium/campaign/
  landing_path 컬럼 + 인덱스)을 **Supabase MCP로 프로덕션에 직접 적용**(컬럼 생성 확인). 프론트
  `useVisitorTracking`이 첫 진입 시 URL의 utm_* 캡처→sessionStorage 귀속→전 방문 기록에 저장,
  백엔드 `visitor-stats`가 utm_source/campaign 집계, 어드민에 "캠페인(UTM) 유입" 섹션 표시.
  **엔드투엔드 실측**: 테스트 UTM행 삽입→endpoint utm_total 집계 확인→삭제 / 브라우저 `/guide?utm_source=..`
  진입→DB에 utm 저장 확인→삭제(실데이터 무오염).

### 경로 한글 표기
- `frontend/src/lib/routeLabels.ts` 신설: 앱 라우트 전체 → 한글명칭 매핑 +
  `formatRoutePath('/home')` → `홈(/home)`. 인기 페이지·최근 방문 테이블·엑셀에 일관 적용.

### KPI 툴팁
- 4개 KPI 카드 각각에 ⓘ(클릭 토글, 모바일 대응) 팝업 — 그 숫자가 무엇을 세는지·집계기준을
  비전공자도 알게 서술(예: "오늘 방문 = 한국시간 자정부터 지금까지 페이지뷰. 예전 UTC 기준 9시간
  오차를 바로잡음").

---

## D. 고도화 로드맵은 `docs/admin_enhancement_roadmap_2026-07.md` 참조 (실행은 승인 후)
