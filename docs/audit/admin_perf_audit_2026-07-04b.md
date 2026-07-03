# 어드민 성능 전수조사 보고서 (2026-07-04, 2차)

> 지시: "어드민 로딩 매우 느림 + 탭별 느림 + 끝에 '백엔드 연결 불가'. 전 탭 전수조사 → 보고 → FIX(탭별 더블리뷰 A+B)."
> 전제: 1차(2026-07-04 `41ba7da`)에서 keep-alive 오타·RLS 과소집계·옛 청크 404를 고쳐 배포 완료(라이브 번들 `index-DuSCl_gl.js` 확인). **그런데도 같은 증상 재발** → 남은 원인을 실측으로 재조사.

---

## 0. 실측 요약 (라이브, 웜 상태)

| 항목 | 실측값 | 판정 |
|---|---|---|
| Render `/health` | 200, 0.13~0.30s | 백엔드 웜(지금은 정상) |
| 어드민 API baseURL | `coupang-severance-app.onrender.com/api` 베이크 확인 | 정상 |
| `/api/admin/stats` | 200, **3.0~3.3s** | 🔴 웜인데도 느림 |
| `/api/admin/analytics` | 200, 1.24~1.29s | 🟡 |
| `/api/admin/applications` | 200, 1.28~1.41s | 🟡 |
| `/api/admin/inquiries` | 200, 1.26~1.33s | 🟡 |
| `/api/admin/recruit-stats` | 200, 1.10~1.11s | 🟡 |
| `/api/admin/target/insights` | 200, 1.76s | 🟡 |
| `/api/admin/reports·notices·members·settings·logs·blocked-ips` | 200, 0.43~0.75s | 🟢(상대적) |
| 단일쿼리 1회 왕복 기준선 | ≈0.5s | — |

**핵심 관찰**: `/admin/stats`는 이미 `ThreadPoolExecutor(9)`로 9쿼리를 **병렬** 실행하는데도 3초.
데이터는 극소(유저 56·리포트 8·문의 28). 9병렬이 이상적이면 ≈0.6s여야 하나 실측 3s = **약 6배** → 병렬이 무언가에 잠식됨.

---

## 1. 근본원인 3층 (증거 기반)

### 🔴 원인 A — 백엔드 Supabase 호출에 연결 풀링(재사용) 전혀 없음 [최대 병목]

`backend/app/api/admin.py`의 모든 Supabase 접근(`_sb_get/_sb_post/_sb_patch/_sb_delete` + 인라인 `httpx.post` 다수)이
**모듈 레벨 원샷 `httpx.get(...)`** 를 씀(admin.py:77~112).

- httpx의 top-level `httpx.get()`는 **호출마다 새 Client를 만들고 → DNS 해석 → TCP 연결 → TLS 핸드셰이크 → 요청 → 연결 파기**를 반복한다. keep-alive/커넥션 풀 재사용이 0.
- Render(싱가포르)→Supabase 매 호출이 풀 핸드셰이크(2 RTT) 비용을 지불.
- `/admin/stats`는 9개를 동시에 쏘지만 **9개가 각자 새 TLS 핸드셰이크** → 병렬 이득이 setup 비용에 먹혀 3초.
- 이 병목은 **거의 모든 어드민 엔드포인트**(문의·지원자·분석·리포트·회원·설정…)에 공통 적용 → 전 탭이 "기본적으로 0.5~3초" 무겁다.

**처치 방향(FIX-A)**: 모듈 레벨 공유 `httpx.Client`(커넥션 풀 + keep-alive, 필요시 HTTP/2) 1개를 만들어 전 `_sb_*` 헬퍼가 재사용. sync 유지(async DNS 회피 주석 존중), `httpx.Client`는 스레드 세이프라 `ThreadPoolExecutor`와 안전. **예상 효과: stats 3s→~0.6s, 전 엔드포인트 0.2~1s 단축.**

### 🔴 원인 B — 아직 남은 "브라우저 세션 Supabase 직접 쿼리"(RLS 의존 → 느리거나 0행/무응답)

1차에서 상당수를 백엔드로 옮겼으나 **아래 탭은 여전히 프론트가 `supabase.from(...)` 브라우저 세션으로 직접 조회**. 관리자 RLS 정책 부재·세션 만료 시 느려지거나 조용히 0행/에러 → "느림/빈 화면"의 원인.

| 파일 | 직접 쿼리 | 문제 |
|---|---|---|
| `menus/JobPostingsMenu.tsx` | job_postings 조회 후 job_applications 지원자 카운트 **2차 쿼리(직렬 N+1)** | 브라우저 RLS 왕복 2회 + 저장/삭제/재진입마다 전체 재로드 |
| `tabs/VisitorTab.tsx` | visitor_logs 직접(1000건) + 이후 마스킹 프로필 조회(직렬) | RLS 왕복 + 직렬 대기 + 클라 정렬 |
| `tabs/RecruitTab.tsx` | job_postings + job_applications 직접(Promise.all) | 브라우저 RLS 2쿼리(대시보드 위젯) |
| `menus/AccountsMenu.tsx` | admin_accounts + system_settings 직접 | RLS 의존, 조회 실패 시 에러 배너 없음(무음) |
| `menus/SecurityMenu.tsx` | admin_accounts(role) 직접 | 관리자 수 과소집계 위험 |
| `menus/ServerLogsMenu.tsx` | system_logs 직접 + **Realtime 구독이 필터/페이지 바뀔 때마다 재구독** | 구독 누수·탭 전환 매번 재로드 |
| `settings/SettingsMenu.tsx`(PermissionLevels 하위) | system_settings 직접 | RLS 의존 |
| `pages/AdminPage.tsx`(게이트) | admin_accounts + system_settings 직접 | 진입 게이트라 유지 필요하나 로딩 체감에 포함 |

### 🟡 원인 C — 콜드스타트(간헐) + 재시도 창이 "느림→연결불가"를 증폭

- Render 무료 티어는 15분 유휴 시 절전. 1차에서 keep-alive를 pg_cron(10분)+GitHub Actions로 이중화했으나, **pg_cron 실동작을 이 세션에선 Supabase MCP 미연결로 직접 검증 못 함**(지금 웜인 것은 확인). 크론 지연 시 드물게 콜드스타트 잔존 가능.
- 프론트 재시도(GET 한정, 2→4→8→14→20초 = 누적 48초)는 콜드스타트를 "에러 대신 대기"로 흡수하지만, **콜드스타트가 실제로 나면 그 탭은 최대 48초 대기** → 사용자에겐 "각 탭이 미친듯이 느리다"로 체감, 끝내 초과하면 "연결 불가".
- 즉 **A·B로 기본 로딩을 가볍게 만들고, C(콜드스타트 빈도)를 0에 수렴**시켜야 재시도 창이 발동조차 안 함.

---

## 2. 탭별 데이터 로딩 매트릭스 (4개 Explore 에이전트 전수 매핑)

경로: (B)=백엔드 api.ts service-role / (A)=브라우저 supabase 직접

| 코어 | 메뉴 | 조회 경로 | 병렬성 | 이슈 |
|---|---|---|---|---|
| 운영 | 대시보드/Overview | (B)×4 Promise.all | ✅병렬 | stats 3s가 전체 지배 |
| 운영 | 대시보드/Visitor | (A)+(B) 직렬 | ❌직렬 | RLS직접+직렬+1000건 |
| 운영 | 대시보드/CalcStats | (B)×1 | — | 양호 |
| 운영 | 대시보드/Recruit위젯 | (A)×2 Promise.all | ✅ | RLS직접 |
| 시스템 | Target 분석 | (B)×1 | — | 양호(1.76s) |
| 채용 | 공고 | **(A) N+1 직렬** | ❌ | 🔴RLS+N+1+재진입 재로드 |
| 채용 | 지원자 | (B) + (A)드롭다운 | ✅ | job_postings 중복로드 |
| 채용 | 현황 | (B)×1 로컬필터 | ✅ | 양호(모범) |
| 채용 | 분석(Summary) | (B)×1 로컬필터 | ✅ | 양호(모범) |
| 소통 | 문의 | (B)×2 별도 useEffect | 🟡준직렬 | Promise.all 병렬화 여지 |
| 소통 | 공지 | (B)×1 | — | CRUD 후 전체 refetch |
| 인원 | 회원 | (B) 마스킹 + reveal 단건 | — | 양호(reveal 의도적) |
| 인원 | 관리자계정 | **(A)×2** | 🟡 | 🔴RLS직접+에러 무음 |
| 시스템 | 설정 | (B)×2 Promise.all | ✅ | PermissionLevels 하위만 (A) |
| 시스템 | 보안 | (A)+(B)×4 | ✅병렬 | admin_accounts (A)+감사로그 2회 |
| 시스템 | 서버로그 | (A)+Realtime / (B)감사 | — | 🔴Realtime 재구독 churn |
| 시스템 | 감사로그 | (B)×1 | — | 양호 |

---

## 3. FIX 계획 (우선순위 · 탭별 더블리뷰 A+B)

**불변 규칙**: 계산 로직(28일)·운영 DB 데이터·index.css 폰트 0건 변경. 각 스텝 A(5축)+B(적대) → `docs/dual_review/adminperf_*.md` 아카이브 → 커밋·푸시.

| 스텝 | 대상 | 조치 | 기대효과 |
|---|---|---|---|
| **1** | 백엔드 admin.py | 공유 `httpx.Client`(풀+keep-alive)로 전 `_sb_*` 전환 | 🔴전 엔드포인트 단축, stats 3s→~0.6s |
| **2** | JobPostingsMenu | 지원자 카운트를 백엔드 stats/recruit 경로로(또는 단일 집계 쿼리) → N+1 제거 | 공고탭 2쿼리→1, RLS 이탈 |
| **3** | ServerLogsMenu | Realtime 재구독 안정화(구독 1회, 필터는 로컬) + system_logs 백엔드화 검토 | 구독 누수·재로드 제거 |
| **4** | Accounts·Security·SettingsPermission | admin_accounts/system_settings 직접→백엔드, 에러 배너 노출 | RLS 무음 제거 |
| **5** | VisitorTab | 직렬→병렬 또는 백엔드 집계 | 방문자탭 단축 |
| **6** | 인프라 | pg_cron 실동작 확인 + UptimeRobot(5분) 병행 권고 | 콜드스타트 0 수렴 |

---

## 3.5 배포 후 라이브 실측 (스텝1·2 완료)

**스텝1 (백엔드 공유 httpx.Client) — 커밋 `d64f44d`, Render 배포 확인:**

| 엔드포인트 | 구코드 | 신코드 | 개선 |
|---|---|---|---|
| /admin/stats | 3.0~3.3s | **0.45~0.63s** | ~5.5x |
| /admin/analytics | 1.27s | 0.25~0.40s | ~4x |
| /admin/recruit-stats | 1.10s | 0.26~0.31s | ~4x |
| /admin/target/insights | 1.76s | 0.25~0.40s | ~5x |
| /admin/inquiries | 1.30s | 0.24~0.25s | ~5x |
| /admin/applications | 1.35s | 0.35~0.59s | ~3x |
| /admin/members·settings·logs | 0.5~0.75s | 0.22~0.25s | ~2.5x |

대시보드 Overview(4병렬) 벽시계: 구 ~3.3s+ → 신 ~1.3s(curl 프로세스 오버헤드 포함, 실브라우저는 더 빠름).
로컬 검증: 9병렬 1.511s→0.070s(21x). 더블리뷰 A·B 쌍방 PASS.

**스텝2 (ServerLogs Realtime churn) — 커밋 `15a5140`:** 구독 재생성 제거(ref 참조). 더블리뷰 A·B PASS, tsc 통과.

## 4. 남은 한계(솔직 고지)

- pg_cron 실행 이력은 이 세션에서 직접 조회 불가(Supabase MCP 미연결) → §6은 종훈님 확인 또는 다음 세션 MCP 연결 시 검증.
- 어드민 UI 로그인은 OAuth+admin_accounts 세션 필요 → 자동 렌더 검증 한계. API 레이어 curl 실측으로 대체.
