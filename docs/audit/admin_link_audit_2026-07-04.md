# 어드민 기능·연동 전수조사 보고서 (2026-07-04, 3차)

> 지시: "어드민 모든 기능 요소의 실사용 반영여부 + 실작동여부 + 사용자홈 양방향 연동을 전수 체크, 에러·무음실패·미연동 위젯 색출 후 FIX."
> 방법: Explore 에이전트 3기 병렬(프론트 지도 / 백엔드 API 지도 / 연동 체인 지도) + 라이브 실측(백엔드 15 엔드포인트 curl, Supabase 20테이블 실컬럼, anon RLS) + 듀얼리뷰(A 5축 + B 적대) 스텝별.
> 선행 조사와의 관계: 1차(6/29 기능감사)·2차(7/4 먹통·성능)가 잡은 항목은 재검증만, 이번엔 **연동 단절**에 집중.

---

## 1. 전수조사 결과 매트릭스

### 정상 확인 (실측 근거)

| 영역 | 검증 방법 | 결과 |
|---|---|---|
| 백엔드 어드민 API 15종 | 라이브 curl (X-Admin-Token) | **15/15 HTTP 200 + 실JSON**, 웜 0.2~1.1초 (stats: 유저56·클릭249·jobs8 진실값) |
| 공지 연동 (notices) | 어드민 쓰기 컬럼 vs 사용자 읽기 필터 대조 | 정상 — is_active·priority 쓰기/읽기 일치 (NoticesBanner·NoticesPage) |
| 채용공고 연동 | JobsPage/홈 프리뷰 쿼리 실측 | 정상 — status=active + 만료필터 + section/is_urgent/benefits 일치 |
| 지원자 상태 연동 | 백엔드 PATCH → notifications INSERT → MyApplicationsTab Realtime | 정상 (단, 알림 배지는 §2-1 버그) |
| 문의 연동 | 사용자 제출 → 어드민 답변 → 마이페이지 answer/status 표시 | 정상 — 컬럼 일치 (answered_at 라이브 존재 확인) |
| 클릭 카운터 | anon 읽기 + 백엔드 증가 경로 | 정상 — total/severance/unemployment 컬럼 일치 (7/4 2차에서 기수정) |
| 사용자측 RLS | anon 실측 | notices/job_postings/legal_variables/system_settings/click_counter 읽기 가능, inquiries/profiles 차단(정상) |
| 감사로그 adminEmail | ApplicantsMenu 코드 확인 | 세션 이메일 자동 주입 정상 — 라이브 "unknown" 1건은 이전 세션 curl 검증 흔적(버그 아님) |

### 발견 결함 (전부 이번 세션에서 FIX)

| # | 결함 | 심각도 | 근본원인 | FIX |
|---|---|---|---|---|
| 1 | **사용자 알림 배지 영영 0** — 어드민이 지원 확정/거절해도 사용자 마이페이지 빨간 점 안 뜸 | P0 | MyPage가 notifications를 `read` 컬럼으로 조회/갱신하는데 실컬럼은 `is_read` → PostgREST 400이 무음 처리 | STEP1 (`53e88f7`) |
| 2 | **법정변수 위젯 미연동(죽은 위젯)** — 어드민이 최저시급을 바꿔도 계산기에 무반영 | P0 | 위젯은 system_settings(minimum_wage_*)에 저장, 계산기는 legal_variables 테이블 소비. minimum_wage_* 소비처 0곳 실증 | STEP2 (`257327f`) — GET/PATCH /admin/legal-variables 신설 + 위젯 재작성 |
| 3 | **감사로그에 관리자 시크릿 유출** — `_write_audit(x_admin_token …)` 11곳이 토큰 원문을 admin_email로 기록, 라이브 audit_logs에 유출 행 실존 | P0(보안) | 감사기록 who 자리에 헤더 토큰을 그대로 전달 | STEP2 (`257327f`) — 11곳 "admin" 고정 |
| 4 | **CMS 공지배너/팝업 미연동(거짓 약속 위젯)** — "저장 즉시 홈 화면 반영" 문구에도 사용자측 소비 코드 전무 | P0 | announcement_*/popup_banner_* 소비처 0곳 실증 | STEP3 — 공개 GET /api/cms/banners(60초 캐시) + 홈 긴급공지 띠 + 진입 팝업(24h 보지않기) |
| 5 | 즐겨찾기 탭 만료 공고 노출 | P1 | MyFavoritesTab만 만료 필터 누락 (채용탭·홈은 있음) | STEP1 (`53e88f7`) |
| 6 | 템플릿 use_count 항상 0 | P2 | 백엔드 /templates/{id}/use 라우트는 있으나 프론트 미호출 | STEP4 — 템플릿 적용 시 markTemplateUsed 호출 |

### 미연동이지만 "의도된 읽기 전용"으로 판정 (미수정)

| 항목 | 판정 근거 |
|---|---|
| Target 분석 메뉴 | 쓰기 기능 자체가 없는 인사이트 대시보드 — 사용자 화면에 반영할 설정이 애초에 없음 (기획 미구현이 아니라 조회 전용) |
| permission_levels 설정 | 어드민 화면 메뉴 노출 제어에만 사용(사용자 무관) — 정상 |

---

## 2. 라이브 실측 상세 (근거 데이터)

- **notifications 실컬럼**: body, created_at, id, **is_read**, metadata, title, type, user_id (service-role SELECT)
- **audit_logs 토큰 유출**: `settings.update` 액션 admin_email="Luck2058…" 5행(3/21~3/27) + 이번 세션 라이브 구코드 경유 2행(7/4 07:33) = **총 7행**. 수정 코드 경유 기록은 "admin"으로 정상 확인(7/4 07:36·07:39 실측)
- **legal_variables 라이브**: min_hourly_wage 2025=10030/2026=10320, unemployment_max_daily 2025=66000/2026=68100, label 컬럼 존재(과거 P0 TODO는 이미 해소된 상태)
- **system_settings**: minimum_wage_hourly=10030(2025값, 소비처 0 고아 키), announcement_text="Test"/popup="TEST" — 사용자 노출 방지 위해 enabled 플래그 false 처리(어드민 UI에서 재활성 가능)
- **referral_codes 테이블 부재**: 코드 참조 0건이라 무해 (user_referrals·profiles.referral_code는 존재)

## 3. 남은 리스크·후속 (비차단, 솔직 고지)

1. **audit_logs 토큰 유출 7행 스크럽** — 감사로그 무결성(이력 수정) 트레이드오프가 있어 종훈님 결정 필요. 스크럽 SQL: `UPDATE audit_logs SET admin_email='admin' WHERE admin_email='Luck2058qorwhdgns3';` (Supabase SQL Editor 1회)
2. **system_settings anon 전체 읽기** — permission_levels 등 비공개성 키가 anon으로 읽힘. 이번에 사용자 배너 소비를 백엔드 경유로 설계해 의존성은 제거함. RLS 축소는 DDL이라 이 세션에서 적용 불가(파일·가이드 후속 과제)
3. **마이그레이션-라이브 스키마 드리프트** — 20260603_legal_variables.sql이 라이브(notes 컬럼·key+연도 복합키·updated_by uuid)와 불일치. 신규 환경 재현성 이슈(운영 무영향)
4. **notifications UPDATE RLS 라이브 확인** — "본인 알림 읽음 처리" 정책이 마이그레이션엔 존재하나 라이브 적용은 로그인 세션이 필요해 미실측 → 종훈님 스모크 1회(마이페이지 지원현황 탭 진입 → 새로고침 후 배지 안 되살아나면 정상)
5. **system_settings 고아 키**(minimum_wage_hourly/daily) — 운영 데이터라 삭제 보류, 소비처 없음(혼란 방지 차원 삭제는 선택)
