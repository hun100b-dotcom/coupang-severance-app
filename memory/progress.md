# 📋 CATCH 작업 일지 & 다음 작업

> **이 파일은 모든 세션의 시작점입니다.**
> CLI, IDE, Dispatch, Cowork, 일반 채팅 — 어디서든 작업을 시작하면 이 파일을 가장 먼저 읽으세요.
> 작업이 끝나면 반드시 이 파일을 업데이트하세요.

---

## 🔴 다음 작업 (TODO)

| 우선순위 | 작업 | 상세 |
|---------|------|------|
| **P0** | GSC 나머지 URL 색인 요청 | 하루 2~3개씩. `/landing`, `/guide`, `/guide/severance`, `/guide/unemployment`, `/guide/weekly-allowance`, `/guide/annual-leave`, `/severance`, `/unemployment`, `/calculator` (GSC 상단 검색바에 URL 입력 → "색인 생성 요청" 클릭) |
| **P1** | [계획 완료] 모바일 반응형 전수 점검 + 수정 | iPhone SE 375px 기준 10~15개 파일 — 플랜: `docs/plans/2026-04-12-p1-plan.md` |
| **P1** | [계획 완료] 실업급여·주휴수당·연차수당 E2E 테스트 | Playwright 3개 spec 파일 신규 생성 — 플랜: `docs/plans/2026-04-12-p1-plan.md` |
| **P1** | Phase 1 잔여 작업 | 실제 채용팀 연락→공고 수집, 홈 채용 프리뷰 고도화, 관리자 채용공고 데이터 관리 검증 |
| **P2** | [계획 완료] 네이버 SEO 블로그 원고 2편 | `docs/blog/naver-severance-guide.md`, `docs/blog/naver-unemployment-guide.md` |
| **P2** | [계획 완료] Product Hunt / Alternativeto 등재 자료 | `docs/launch/product-hunt-draft.md`, `docs/launch/alternativeto-draft.md` |
| **P2** | Phase 2 B2C 랜딩 + SEO 고도화 | 랜딩 페이지 추가 개선, 검색 노출 모니터링(1~4주 소요) |
| **P3** | 앱스토어/플레이스토어 출시 | PWA → 네이티브 앱 래핑(Capacitor/TWA) 검토 필요 |
| **P4** | Phase 3 B2B 랜딩 + 유료화 | - |

---

## ✅ 완료 작업 이력

### 세션 7 — 2026-04-12 (플래너 에이전트 — objective-boyd)

**P1 작업 플랜 수립 (플랜 문서 작성)**

- `docs/plans/2026-04-12-p1-plan.md` 신규 생성
  - 작업 1: 모바일 반응형 전수 점검 (10~15개 파일, iPhone SE 375px 기준)
  - 작업 2: 실업급여·주휴수당·연차수당 E2E 테스트 (Playwright spec 3~5개 신규)
  - 작업 3: 네이버 SEO 블로그 원고 2편 (docs/blog/ 신규)
  - 작업 4: Product Hunt / Alternativeto 등재 자료 (docs/launch/ 신규)
- `memory/progress.md` TODO 테이블 업데이트 (4개 작업 계획 추가)
- 각 작업별 영향 파일 목록, 구현 전략, 리스크 평가 완료

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

**push 상태**: 미완료 (아래 참고)

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
| API | https://coupang-severance-api.onrender.com | Render 자동배포 |
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
