# 📋 CATCH 작업 일지 & 다음 작업

> **이 파일은 모든 세션의 시작점입니다.**
> CLI, IDE, Dispatch, Cowork, 일반 채팅 — 어디서든 작업을 시작하면 이 파일을 가장 먼저 읽으세요.
> 작업이 끝나면 반드시 이 파일을 업데이트하세요.

---

## 🔴 다음 작업 (TODO)

| 우선순위 | 작업 | 상세 |
|---------|------|------|
| **P0** | legal_variables 마이그레이션 DB 완전 적용 | `label` 컬럼 없음 확인 (2026-06-10). Supabase SQL Editor → `ALTER TABLE public.legal_variables ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT '';` 실행 후 데이터 업데이트 |
| **P0** | GSC 수동 색인 요청 | 종훈님이 GSC 접속 → 각 URL 검색바 입력 → "색인 생성 요청" 클릭 |
| **P1** | 채용팀 연락 → 공고 데이터 수집 | 쿠팡/컬리/CJ 채용담당자 연락 (코드 작업 아님) |
| **P2** | Phase 2 B2C 랜딩 고도화 | 검색 노출 모니터링 (1~4주 소요) |
| **P3** | 앱스토어/플레이스토어 출시 | PWA → 네이티브 앱 래핑(Capacitor/TWA) 검토 |
| **P4** | Phase 3 B2B 랜딩 + 유료화 | - |

---

## ✅ 완료 작업 이력

### 세션 12 — 2026-06-10 (전수 검사 6영역 재점검)

**작업 요약**: Phase A~G 전 영역 전수 검사 수행. 세션 11에서 이미 핫픽스 완료된 항목들 확인.

**추가 발견 사항**
- `legal_variables` 테이블: `label` 컬럼 없음 (마이그레이션 SQL에는 있지만 DB 미적용). 단, 프론트 `legalVariables.ts`와 admin `LegalVariables.tsx` 모두 label 미사용 → **현재 기능 영향 없음** (P3)
- DB 데이터 정상: `min_hourly_wage=10320(2026)`, `unemployment_max_daily=68100(2026)` ✅

**6-Step 재검증 결과 (2026-06-10)**

| Step | 항목 | 결과 |
|------|------|------|
| 1 | git status (코드 clean) | ✅ |
| 2 | Vercel 200 (0.93s) | ✅ |
| 3 | Render /health 200 (0.30s) | ✅ |
| 4 | PDF 4종 /precise → 422 (정상) | ✅ |
| 5 | TypeScript 에러 0건 / dark 잔재 0건 | ✅ |
| 6 | 핵심 8개 파일 존재 (TargetMenu 포함) | ✅ |

**코드 레벨 검증 요약**
- TypeScript 빌드 에러: 0건 ✅
- 빈 catch 블록: 없음 ✅
- dark: Tailwind 클래스: 0건 ✅ (V2/V3는 의도적 다크 랜딩)
- any 타입 남발: api.ts 1건 (최소) ✅
- 인증 가드: MyPage 비로그인→/login 리다이렉트 ✅
- GuestGate: 4개 계산기 PDF 업로드 보호 ✅
- 어드민 인증: X-Admin-Token 401 정상 ✅

---

### 세션 11 — 2026-06-10 (전수검사 핫픽스 8파일 + Render 재활성 확인)

**커밋 `deb3558`: fix(audit): TargetMenu 접근 + Guide SPA full reload + a11y + dead code (8파일)**

| 파일 | 변경 내용 |
|------|---------|
| `AdminSidebar.tsx` | MENU_TREE 시스템 그룹에 target 항목 누락 추가 |
| `AdminPage.tsx` | FLAT_MENUS에 target 추가 (모바일 드롭다운) |
| `SeveranceGuide.tsx` | GuideCard + 본문 inline `<a href>` → `<Link to>` + Link import |
| `UnemploymentGuide.tsx` | 동일 패턴 |
| `WeeklyAllowanceGuide.tsx` | GuideCard `<a href>` → `<Link to>` + Link import |
| `AnnualLeaveGuide.tsx` | GuideCard `<a href>` → `<Link to>` + Link import |
| `ProfileSection.tsx` | img `alt=""` → `alt={name}` (접근성 수정) |
| `SeveranceFlow.tsx` | 빈 `useEffect` 제거 + import에서 `useEffect` 삭제 |

**6-Step 검증 결과**

| Step | 항목 | 결과 |
|------|------|------|
| 1 | git push origin main | ✅ |
| 2 | Vercel 200 | ✅ |
| 3 | Render /health 200 | ✅ **(이전 세션 404→이번 세션 200 자동 복구)** |
| 4 | /docs /redoc /openapi.json 200 | ✅ |
| 5 | AdminSidebar target 항목 코드 검증 | ✅ (diff 확인) |
| 6 | GuideCard SPA 라우팅 (hasEventListeners:true) | ✅ |

**push**: ✅ origin main 완료 (Vercel 자동 배포)

---

### 세션 10 — 2026-06-09 (어드민 라이트 개편 완료 + 전역 전수검사)

**Task A — 어드민 UI/UX 전면 라이트 전환 완료 (커밋 3개)**

- `ee75d8d` Step 1-3: 공용컴포넌트 5개(AdminCard/KpiStrip/SignalCard/PageHeader/AdminTable) + AdminPage/Sidebar + 대시보드(Overview/Visitor/CalcStats/Recruit)
- `3446d66` Step 4-6: 채용(JobPostings/Applicants/Confirmed/RecruitSummary) + 콘텐츠(Inquiries/Notices) + 시스템(Members/Accounts/Settings/AuditLogs/ServerLogs/Target) 27파일
- `46bb0f9` 파란 버튼 텍스트 색 마무리 4파일 (TemplateManager/NoticesMenu/CmsSettings/ApplicantsMenu)
- `9b87bfa` TargetMenu 다크 잔재 제거 — `rgba(255,255,255,...)` → slate 라이트 토큰 21곳

**Task B — 전역 전수검사 결과**

| 항목 | 상태 | 비고 |
|------|------|------|
| 프론트엔드 23개 라우트 | ✅ 22개 200, 1개 307 | `/home` 307은 HomeGuard 미로그인 리다이렉트 (정상) |
| 어드민 다크 잔재 | ✅ 0건 | TargetMenu 수정 후 전체 클린 |
| 빌드 TypeScript 에러 | ✅ 0건 | |
| Render 백엔드 `/health` | ❌ 404 Not Found | **서비스 비활성화 추정 — 종훈님 Render Dashboard 확인 필요** |
| Render 백엔드 `/redoc` | ❌ 404 | |
| Render 백엔드 `/openapi.json` | ❌ 404 | |

**push**: ✅ origin main 완료 (Vercel 자동 배포)

---

### 세션 9 — 2026-06-03 (P0~P2 일괄 수정)

**진단 보고서(commit 5ee46b83) 기반 8개 작업 일괄 완료 (커밋 3개)**

**P0 — 버그 수정**
- WeeklyAllowancePage + AnnualLeaveAllowancePage: `fd.append('company', '기타')` 패턴으로 수정 (사업장 필터 버그)
- 최저시급 2025(10,030)→2026(10,320) 전면 업데이트
- `supabase/migrations/20260603_legal_variables.sql`: legal_variables 테이블 + 초기 데이터 (DB 적용 대기)
- `frontend/src/lib/legalVariables.ts`: Supabase fetch + 5분 캐시 + fallback 10,320

**P1 — 기능 개선**
- WeeklyAllowancePage + AnnualLeaveAllowancePage: PDF 에러 메시지 고도화 (Network/504/422 분기)
- WeeklyAllowancePage + AnnualLeaveAllowancePage: PdfGuide 발급 가이드 버튼 추가
- UnemploymentFlow: PDF 정밀계산 비로그인 → GuestGate 모달 (SeveranceFlow 패턴)

**P2 — 품질 개선**
- UnemploymentFlow: runPrecise catch 강화 (Network/504/detail 분기)
- 실업급여 2026 상한액 66,000→**68,100원** 정정 (7년 만에 인상, 하한액 66,048원)
  수정 파일: UnemploymentFlow.tsx, UnemploymentGuide.tsx, CoupangUnemploymentLanding.tsx

**작업 7 (TargetTab lazy load)**: 이미 DashboardMenu.tsx에 구현돼 있음 — skip

**커밋 목록**
- `e0938c8`: fix(P0): 사업장 필터 버그 + 최저시급 2026 + PDF 가이드 + 에러 고도화
- `eb315af`: feat(P1/P2): 실업급여 GuestGate + runPrecise 에러 처리 강화
- `d7d9296`: fix(P2): 실업급여 상한액 66,000→68,100원 정정

**push**: ✅ origin main 완료 (Vercel 자동 배포 시작)

**미완료**
- legal_variables 테이블 DB 적용: Supabase 대시보드에서 SQL 직접 실행 필요 (MCP 없어서 자동 적용 불가)

---

### 세션 6 — 2026-04-10 (하네스 v2 — sharp-hodgkin)

**요구사항 D 전면 교체 + A/C/E 잔여 구현 (커밋 6개)**

**DB 마이그레이션 (Supabase MCP 직접 적용)**
- `20260410_job_postings_section_benefits.sql`: section(3종)/benefits 컬럼 추가
- `20260410_applications_personal_info.sql`: applicant_name/birth/gender/phone/consent 컬럼

**D-NEW (지원 시점 직접 입력 방식)**
- `ApplyFormModal.tsx` 신규 생성: 성명/생년월일/성별/휴대폰 + 개인정보 동의 아코디언
- 주민번호 뒤 1자리 미수집 — applicant_gender(남/여 텍스트)로 대체
- 동의 기본값 false, 미체크 시 제출 버튼 비활성
- 4자리 연도 강제 검증 (padStart 우회 버그 수정)
- `JobsPage.tsx`: 로그인 게이트 → 폼 모달 → INSERT

**A-1/2/3/4 어드민 공고 등록 개선**
- A-1: 숫자 입력 type=text+inputMode=numeric+천단위콤마
- A-2: date input min=오늘 + colorScheme=dark
- A-3: 섹션 3종 라디오 (오늘추가/내일긴급/상시)
- A-4: benefits 태그 칩 + 직접 입력 Enter

**C-4 마이페이지 빨간 점 배지**
- `MyPage.tsx`: notifications Realtime 구독 + 미읽음 카운트
- 지원현황 탭 클릭 시 자동 read=true

**E-1 xlsx 다운로드**
- `JobsMenu.tsx`: CSV 다운로드 (consent_third_party=true 건만)
- 휴대폰 마스킹 처리 (MVP 정책)

**문서**
- `docs/privacy-policy-draft.md`: 개인정보처리방침 초안
- `docs/security-checklist.md`: 보안 체크리스트
- `docs/plans/2026-04-10-v2-full-plan.md`: 전체 플랜

**커밋 목록**
- `089060d`: feat(db): section/benefits + 인적사항 마이그레이션
- `33157b9`: feat(types): 타입 업데이트
- `eda56e7`: feat(jobs): 지원 폼 모달
- `dd6b8f6`: feat(admin): A-1/2/3/4 + E-1
- `bfb0585`: feat(realtime): C-4 빨간 점 배지
- `00f9df3`: fix(security): 4자리 연도 강제 검증

**push 상태**: ✅ 완료 (이후 세션에서 확인됨, main 동기화 완료)

### 세션 8 — 2026-05-24 (현재 세션)

**SEO P0 3-Phase 전체 완료 (커밋 138ced6)**

**Phase 1 — 색인 점검 + 사이트맵 재정비**
- sitemap.xml: 신규 랜딩 3개 URL 추가 + 전체 lastmod 2026-05-24 갱신 (총 22개 URL)
- index.html 확인: `robots=index,follow` 정상, 정적 FAQPage(8Q) + HowTo JSON-LD 이미 존재
- robots.txt: 이상 없음. SPA prerender 없으나 index.html 정적 콘텐츠로 기본 크롤링 가능
- IndexNow 재제출: 13개 URL HTTP 202 (신규 3개 + 수정 10개) 접수 완료

**Phase 2 — FAQ JSON-LD 계산기 4개 페이지**
- WeeklyAllowancePage.tsx: FAQPage JSON-LD 6쌍 추가 (주휴수당 조건·공식·소멸시효)
- AnnualLeaveAllowancePage.tsx: FAQPage JSON-LD 6쌍 추가 (연차 발생·계산법·소멸시효)
- SeveranceFlow.tsx / UnemploymentFlow.tsx: 기존 FAQ 이미 있었음 — 변경 없음

**Phase 3 — 롱테일 키워드 랜딩 3종 신설**
- `/coupang-part-time-severance-method`: "쿠팡 알바 퇴직금 받는 법" (FAQPage 7쌍)
- `/daily-worker-severance-28days`: "일용직 퇴직금 28일 계산" (FAQPage 7쌍 + 블록 예시 표)
- `/coupang-cfs-severance-calculation`: "쿠팡 CFS 퇴직금 계산 방법" (FAQPage 7쌍 + 재판 안내)
- App.tsx 라우터 등록 + sitemap.xml 추가 + IndexNow 제출
- TypeScript 빌드 PASS, Vercel 자동 배포 시작

**커밋**: `138ced6` feat(seo): P0 SEO 3-Phase (7파일, +1,080줄)
**push**: ✅ origin main 완료

### 세션 7 — 2026-05-20 (distracted-almeida)

**현황 파악 + 문서 동기화 + SEO 제출**

**작업 1 — docs/progress.md 동기화** (`94f34c6`)
- 4/10~5/10 누락 18건 작업 이력 추가 (지원서폼/어드민대시보드/마이페이지타임라인/Discord/SEO랜딩3개 등)
- 최종업데이트 날짜 2026-04-10 → 2026-05-20
- Phase 1 미완료 항목 → 모두 완료로 체크

**작업 2 — SEO 랜딩 3개 라우팅 실측 검증** (코드 변경 없음)
- `/coupang-severance-calculator`, `/coupang-unemployment-calculator`, `/day-worker-severance-guide` 모두 HTTP 200 ✅
- App.tsx 라우팅 3개 모두 등록 확인 ✅
- PageMeta 컴포넌트로 OG/Twitter/JSON-LD 자동 처리 확인 ✅

**작업 3 — 홈 채용 프리뷰** (이미 완료 확인)
- `921afe8` (2026-04-14)에 이미 완전 구현 확인
- supabase.from('job_postings') 실시간 연동, 로딩/에러 상태, 만료 필터링 모두 있음

**작업 4 — sitemap.xml + IndexNow** (`b5066cd`)
- 모든 URL lastmod 2026-04-14 → 2026-05-20 갱신
- IndexNow API 16개 URL 제출 완료 (HTTP 200) — Bing/Yandex 크롤러에 자동 알림

**세션 7 커밋 목록**
- `94f34c6`: docs(progress): 4/10~5/10 작업 18건 동기화
- `b5066cd`: chore(seo): sitemap lastmod 갱신 + IndexNow 16개 제출

**남은 것**: GSC 수동 색인 클릭 (종훈님이 GSC 직접 접속 필요)

### 세션 5 — 2026-04-10

**추천인 시스템 구축 (커밋 b5c4299)**
- `supabase/migrations/20260410_referral_system.sql`: user_referrals 테이블 + profiles.referral_code + RLS + handle_new_user 트리거 업데이트
- `frontend/src/lib/referral.ts`: 추천 코드 생성/저장/조회 유틸 (ensureReferralCode, saveReferral, getReferralStats)
- `Login.tsx`: ?ref= URL 파라미터 감지 → localStorage 임시 저장
- `Onboarding.tsx`: 온보딩 완료 시 추천 관계 DB 기록 → localStorage 정리
- `MyRewardsTab.tsx`: 친구 추천하기 섹션 추가 (코드 복사, 링크 복사, 추천 수)
- Supabase SQL 마이그레이션 실행 필요 (Supabase 대시보드 → SQL Editor에서 실행)

### 세션 4 — 2026-04-09 (Cowork)

**Google Search Console 설정**
- `catch-daily-worker.vercel.app` 속성 추가 (소유권 HTML 태그 자동 인증)
- sitemap.xml 제출 완료
- `/home` URL 색인 생성 요청 완료 (1/10)
- 나머지 9개 URL은 일일 할당량 초과로 내일부터 진행

**네이버 서치어드바이저 설정**
- 사이트 소유권 인증 완료 (naver-site-verification 메타태그 추가)
- sitemap.xml 제출 완료
- 주요 URL 10개 웹페이지 수집 요청 완료
- 커밋: `3288194` feat(seo): 네이버 서치어드바이저 소유권 인증 메타태그 추가

**랜딩 페이지 개선 (LandingV1.tsx)**
- PAIN 섹션 사용자 후기 인용문 시각적 강조 (그래디언트 배경, "200만 원" 파란색 강조)
- 소멸시효 카드 데이터 오류 수정: "1년 이상" → "3년"
- SCHEDULE 섹션에 긴급·추가모집 알림 카드 추가 (🔥 빨간-주황 그래디언트)
- 미사용 변수(hoverTextColor) 제거 → Vercel 빌드 에러 수정

**SEO 가이드 페이지 앱 내 이동**
- 5개 가이드 라우트를 Layout 안으로 이동 (TopNav + BottomNav 표시)
- 가이드 페이지 자체 네비 제거, 패딩 조정
- Home에 "노동법 가이드" 진입 배너 추가

**SEO 컨설팅 리포트**
- `CATCH_런칭준비_컨설팅리포트.docx` 생성 (Google/Naver 검색 현황, 앱스토어 타이밍, 리스크 분석)

### 세션 3 — 2026-04-08

- 하네스 워크플로우 + Opus 리뷰어 서브에이전트 설정
- `.claude/agents/` 폴더 생성 (reviewer.md, reviewer-checklist.md)
- `.claude/commands/` 추가 (plan.md, sprint.md, review.md)
- memory/, tasks/ 인프라 구축

### 이전 세션

- Phase 0 완료: 4개 계산기, PDF 저장/재사용, 마이페이지, Toss 디자인
- Phase 1 진행: 채용정보 섹션 구축 (job_postings DB, 관리자 CRUD, 피드 UI 등)

---

## 🔧 현재 인프라 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| 프로덕션 URL | https://catch-daily-worker.vercel.app | Vercel 자동배포 |
| API | https://coupang-severance-app.onrender.com | Render 자동배포 |
| Google Search Console | ✅ 등록 완료 | 속성: catch-daily-worker.vercel.app |
| Naver Search Advisor | ✅ 등록 완료 | 소유권 인증 + 수집 요청 완료 |
| Google 색인 | 🔄 진행 중 | /home 요청 완료, 나머지 9개 대기 |
| Naver 색인 | 🔄 진행 중 | 수집 요청 후 2~4주 소요 |
| sitemap.xml | ✅ | Google + Naver 모두 제출 |
| robots.txt | ✅ | 크롤링 허용 설정 |
| OG 메타태그 | ✅ | 카카오/페이스북/슬랙 공유 대응 |
| JSON-LD 구조화 데이터 | ✅ | WebApplication 스키마 |

---

## 📌 주의사항 (실수 방지)

- 로컬 빌드 테스트는 반드시 `npm run build` 사용 (`vite build` 단독 금지 → tsc 에러 누락됨)
- 구현 완료 후 반드시 `.claude/agents/reviewer.md` 기반 리뷰어 에이전트 호출
- 28일 블록 알고리즘 로직 절대 임의 변경 금지
- index.html의 google-site-verification, naver-site-verification 메타태그 삭제 금지
