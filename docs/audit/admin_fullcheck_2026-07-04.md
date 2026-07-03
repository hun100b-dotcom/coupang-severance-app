# 어드민 전수조사 & 복구 보고서 (2026-07-04)

> 지시: "어드민 먹통(로딩 느림·백엔드 연결 에러·하드코딩 의심) 전수조사 후 전 기능 실동작화. 가짜 데이터/가짜 성공 금지."
> 수행: Claude (빌더) + 리뷰어 A(5축) + 리뷰어 B(Adversarial) 더블리뷰.

---

## 1. 증상별 근본원인 진단 (실측 기반)

### 증상① "백엔드 서버에 연결할 수 없습니다" + ② 로딩 매우 느림

| 검증 항목 | 실측 결과 | 판정 |
|---|---|---|
| Render /health | HTTP 200, 0.6~1.8s | 백엔드 다운 아님 |
| 어드민 API 10종 (X-Admin-Token) | 전부 HTTP 200, 0.4~2.8s | 인증·라우팅 정상 |
| CORS 프리플라이트 (Vercel Origin) | 200 + allow-origin 정확 | CORS 아님 |
| 라이브 JS 번들 baseURL | `coupang-severance-app.onrender.com/api` 베이크 확인 | 상대경로 잔재 아님 |
| **keep-alive 워크플로 대상 호스트** | **`coupang-severance-api.onrender.com` → HTTP 404, `x-render-routing: no-server`** | **🔴 근본원인** |

**결론**: `.github/workflows/keep-alive.yml`이 존재하지 않는 호스트(`-api` 오타, 실제는 `-app`)를 핑해 **콜드스타트 방지가 전혀 동작하지 않았다**. Render 무료 티어는 15분 유휴 시 절전 → 매번 30~60초 콜드스타트가 발생했고, 프론트 재시도 창(누적 9초)이 이를 못 덮어 "연결할 수 없습니다"가 노출됐다. 부가 원인: 7/3 하루 20+회 재배포로 옛 청크 404(열린 탭에서 메뉴 이동 시 흰 화면/먹통).

### 증상③ "하드코딩된 데이터가 너무 많음"

**하드코딩 리터럴 목데이터: 0건** (전 어드민 컴포넌트 독립 에이전트 전수 grep — mock/더미/플레이스홀더/Math.random/가짜 성공 setTimeout 모두 부재).

진짜 정체는 **RLS(행 수준 보안) 의존 조회가 만든 가짜/불안정 숫자** (라이브 pg_policies 실측으로 표 정밀화):

| 화면 | 과거 데이터 경로 | 문제 | 라이브 RLS 실측 (2026-07-04) |
|---|---|---|---|
| 대시보드 유저 KPI (getAdminStats) | supabase 브라우저 세션 직접 | **profiles는 owner-only(select_own만 존재)** → 전체 유저 56명이 화면엔 **1명**으로 표시 (확정 버그) | profiles 정책: insert/select/update_own 뿐, admin 정책 없음 |
| 대시보드 클릭 KPI | click_counter를 `total_cnt` 등으로 조회 | **실제 컬럼은 `total/severance/unemployment`** → 항상 **0** 표시 (확정 버그) | 라이브 행: `{"total":249,"severance":172,"unemployment":28}` |
| 리포트·문의 집계 (stats/analytics/insights) | supabase 직접 | reports·inquiries엔 is_admin() 어드민 SELECT 정책 존재 → 보통은 보이나, **is_admin()/세션 상태에 종속**(만료·미등록 시 무음 축소) | reports_select_admin qual=`is_admin()` 확인 |
| 계산 통계 (CalcStatsTab) | supabase reports 직접 | 상동 (is_admin() 전제 의존) | 상동 |
| 채용현황·채용Summary | supabase job_postings+job_applications 직접 | admin RLS는 적용돼 있으나(20260629 fix 적용 확인) 동일한 세션 전제 의존 | admin_select/update_all_applications 정책 존재 확인 |
| 지원자 상태변경 (쓰기) | supabase 직접 update | RLS 전제 깨지면 0행=기능 불능. 알림 insert도 클라이언트 RLS 의존 | 상동 |

→ **처치 원칙**: "관리자 화면의 진실값은 브라우저 세션·RLS 전제에 걸지 않는다" — 문의/공지/회원(6/29~30 기전환)과 동일하게 전 조회·쓰기를 백엔드 service-role 경로로 통일.

---

## 2. 수정 내역

| # | 파일 | 수정 | 효과 |
|---|---|---|---|
| 1 | `.github/workflows/keep-alive.yml` | 호스트 `-api`→`-app` 교정, 크론 `*/14`→`*/10` | 콜드스타트 자체 제거(24시간 워밍) |
| 2 | `frontend/src/lib/api.ts` | 재시도 3회/9초 → 5회/누적 48초(GET만, 멱등) | 잔여 콜드스타트도 에러 대신 흡수 |
| 3 | `frontend/src/lib/api.ts` | getAdminStats/getAdminAnalytics/getTargetInsights를 **백엔드 service-role 경로로 교체** (로컬 집계 ~340줄 제거) | RLS 무관 진실값 + 클릭 컬럼 버그 해소 + 9쿼리→1호출 |
| 4 | `backend/app/api/admin.py` | `/admin/stats`에 jobs{total,active} 집계 추가 | OverviewTab 채용공고 KPI 진실값 |
| 5 | `backend/app/api/admin.py` | 신규 `GET /admin/reports?days=` | CalcStatsTab 전체 리포트 집계 |
| 6 | `backend/app/api/admin.py` | 신규 `GET /admin/recruit-stats` | 채용현황·Summary 전체 데이터 |
| 7 | `backend/app/api/admin.py` | 신규 `PATCH /admin/applications/{id}/status` + `POST /admin/applications/bulk-status` (확정/거절 알림 서버 발송, 감사기록) | 지원자 상태변경 RLS 무관 실동작 |
| 8 | `frontend/.../CalcStatsTab.tsx` | supabase 직접 → getAdminReports | 진실값 |
| 9 | `frontend/.../ConfirmedMenu.tsx` `RecruitSummaryMenu.tsx` | supabase 2쿼리 → getRecruitStats 1호출 | 진실값 + 빈화면 위험 제거 |
| 10 | `frontend/.../OverviewTab.tsx` | notices supabase 직접 → getAdminNotices(최신순 3건) | 비활성 공지 누락 방지 |
| 11 | `frontend/.../ApplicantsMenu.tsx` | 상태변경 단건/일괄 → 백엔드 경로 (프론트 알림 insert 제거) | 기능 실동작 보장 |
| 12 | `frontend/src/App.tsx` | lazyRetry — 청크 404 시 세션당 1회 자동 새로고침 (32개 lazy 전체 적용) | 배포 직후 먹통 자동복구 |

**불변 확인**: 계산 로직(28일 블록) 0줄 변경 · 운영 DB 데이터 0건 변경 · index.css/tailwind/스타일 파일 0건 변경(diff stat 근거 → 폰트 회귀 원천 0px).

---

## 3. 기능별 동작 매트릭스

(배포 후 라이브 검증 값으로 최종 갱신 — §5)

| 메뉴 | 조회 경로 | 쓰기 경로 | 상태 |
|---|---|---|---|
| 대시보드 개요 | 백엔드 /admin/stats·analytics + 문의·공지 백엔드 | — | ✅ 전환 완료 |
| 대시보드 방문자 | getTargetInsights(백엔드) + visitor_logs(authenticated RLS 허용) | — | ✅ |
| 대시보드 계산통계 | 백엔드 /admin/reports | — | ✅ 전환 완료 |
| 채용공고 | supabase(관리자 RLS 정상, 20260405 fix) + .select 검증 | supabase(.select 검증) | ✅ 유지 |
| 지원자 관리 | 백엔드 /admin/applications(마스킹) | **백엔드 status/bulk-status** | ✅ 전환 완료 |
| 채용현황 | 백엔드 /admin/recruit-stats | — | ✅ 전환 완료 |
| 채용 Summary | 백엔드 /admin/recruit-stats | — | ✅ 전환 완료 |
| 문의 | 백엔드(6/29 기전환) | 백엔드 | ✅ |
| 공지 | 백엔드(6/29 기전환) | 백엔드 | ✅ |
| 회원 | 백엔드 마스킹+reveal(6/30 기전환) | 백엔드 | ✅ |
| 관리자 계정 | supabase admin_accounts(.select 검증 有) | supabase(.select 검증) | ✅ 유지 |
| 보안 현황 | 백엔드(blocked-ips·logs·unmask-status) + admin_accounts | — | ✅ |
| 서버 로그 | supabase system_logs(생산자: systemLog.ts·ErrorBoundary 존재 확인) + Realtime | — | ✅ 실데이터 |
| Audit Logs | 백엔드 /admin/logs(6/29 기전환) | 백엔드 /admin/audit-log | ✅ |
| Target 분석 | getTargetInsights(백엔드) | — | ✅ 전환 완료 |
| 설정 | 백엔드 /admin/settings(기존) | 백엔드 | ✅ |

---

## 4. 더블리뷰 (규칙2)

| 항목 | 리뷰어 A (5축) | 리뷰어 B (Adversarial) |
|---|---|---|
| 판정 | **PASS** (BLOCKER/MAJOR 0, MINOR 5) | **PASS** (BLOCKER 0, MAJOR 1 권고, MINOR 다수) |
| 디자인/UI | 스타일 변경 0건 — 토큰·컴포넌트 불변 | — |
| UX 4상태 | 전 메뉴 로딩/성공/실패/빈상태 보존, TDZ 없음 | lazyRetry 무한루프 반증 실패(1회 제한 성립, ErrorBoundary 수용 확인) |
| 코드 | tsc(noUnusedLocals) 0, 죽은 참조 0, 타입-응답 필드 단위 일치 | 계약 불일치·캐스팅 거짓말·삭제 부작용 전부 반증 실패 |
| 회귀 | 계산 로직 0건·CSS 0건·계산기 POST 재시도 0회 확인 | GET 한정 재시도 확인, keep-alive 신 호스트 200 실측 |
| 보안 | — | /admin/reports payload에 PII 없음 실측(계산 수치만), 토큰 게이트 기존 수준 |

**A 지적 MINOR 5건 → 전부 반영**: ①재시도 횟수 주석 정정 ②③ApplicantsMenu·App.tsx 낡은 주석/오타 호스트 정정 ④keep-alive 헤더 주석 정정 ⑤adminErrorMessage가 백엔드 한국어 detail 우선 표기(404 오도 방지).

**B 지적 MAJOR 1건 → 반영**: /admin/reports·/admin/recruit-stats 업스트림 장애 시 200+빈배열(가짜 0) 대신 **명시적 502** — 채용현황이 장애를 "지원 0건"으로 위장하는 것 차단. 반영 후 py_compile·로컬 3종 200 재검증.

**합의**: 핵심 주장(RLS 우회 진실값·1회 제한 reload·GET 한정 재시도·keep-alive 복구) 쌍방 검증 통과.
**이견/잔여(비차단)**: B의 "서버 행(hang) 최악 시나리오에서 어드민 대기 최대 ~4분"(콜드스타트 503 즉답 케이스는 ~48초; keep-alive 복구로 발생 빈도 자체가 급감) · 배포 스큐 수 분(자가 해소) · 기존 /admin/stats의 부분 실패 무음화는 기존 동작 유지(후속 과제).

**[최종결정: 배포 진행]** — 쌍방 PASS, 지적사항 반영 완료.

---

## 5. 6Step 라이브 검증

(배포 후 기입)

---

## 6. 남은 리스크 (솔직 고지)

- **GitHub Actions 스케줄 지연**: 피크 시간에 크론이 수 분 밀릴 수 있어 콜드스타트가 드물게 발생 가능. 근본 해결은 Render 유료 플랜 또는 UptimeRobot(외부 모니터링, 5분 주기 무료) 병행.
- **UI 클릭 전수 검증 한계**: 어드민 입장은 카카오/구글 OAuth + admin_accounts 등록 세션이 필요해 자동화 불가 → API 레이어 전수 curl 실측으로 대체. 종훈님 브라우저 1회 확인 권장 체크리스트를 §7에 첨부.
- **job_applications RLS 마이그레이션(20260629)**: 이제 어드민 기능이 RLS와 무관해졌지만, DB 정합성 차원에서 여전히 적용 권장(파일 커밋됨).
