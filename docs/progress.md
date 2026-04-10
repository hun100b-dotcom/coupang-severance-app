# CATCH 프로젝트 진행 상황

> 이 파일은 git 레포에 저장되어 대화/메모리가 초기화되어도 유지됩니다.
> **새 세션 시작 시**: "CLAUDE.md와 docs/progress.md 읽고 작업 이어가자" 라고 말하세요.

---

## 최종 업데이트: 2026-04-10

---

## 1. 프로젝트 개요

**CATCH (퇴직금 한번에)** — 쿠팡·컬리·CJ 등 일용직·단기 근로자를 위한 퇴직금·실업급여·주휴수당·연차수당 자동 계산기 웹앱.
PDF 급여명세서 업로드로 정밀 계산하거나, 수동 입력으로 간편 계산할 수 있습니다.
카카오·Google 소셜 로그인 지원, 계산 결과 저장·공유 기능 포함.

- **프로덕션**: https://catch-daily-worker.vercel.app
- **API 문서**: https://coupang-severance-api.onrender.com/docs
- **슈퍼어드민**: catchmasterdmin@gmail.com

---

## 2. 기술 스택

| 분류 | 기술 | 버전 | 배포 |
|------|------|------|------|
| 프론트엔드 | React + TypeScript | 18.3.1 / 5.5.3 | Vercel (자동) |
| 빌드 | Vite + Tailwind CSS | 5.4.2 / 3.4.11 | - |
| 애니메이션 | Framer Motion | 11.5.4 | - |
| 라우터 | react-router-dom | 6.26.2 | - |
| 백엔드 | FastAPI (Python 3.12) | - | Render 싱가포르 (자동) |
| PDF 파싱 | pdfplumber | - | - |
| DB | Supabase PostgreSQL | RLS 활성화 | Supabase |
| 인증 | Supabase Auth (카카오, Google OAuth) | - | - |
| SEO | react-helmet-async | 3.0.0 | - |
| E2E 테스트 | Playwright | 1.58.2 | - |

---

## 3. 디렉토리 구조

```
coupang-severance-app/
├── frontend/
│   └── src/
│       ├── pages/          # 라우트별 페이지 (~28개)
│       │   ├── auth/callback.tsx       # OAuth 콜백 (핵심)
│       │   ├── guide/                  # SEO 가이드 5종
│       │   ├── SeveranceFlow.tsx       # 퇴직금 입력 (22KB)
│       │   ├── ResultSeverance.tsx     # 퇴직금 결과 (34KB)
│       │   ├── WeeklyAllowancePage.tsx # 주휴수당 (42KB)
│       │   ├── AnnualLeaveAllowancePage.tsx # 연차수당 (49KB)
│       │   ├── JobsPage.tsx            # 채용 피드
│       │   ├── AdminPage.tsx           # 관리자
│       │   └── LandingV1~V5.tsx        # 랜딩 A/B 5종
│       ├── components/     # Layout, TopNav, BottomNav, KakaoShareButton 등
│       ├── lib/
│       │   ├── supabase.ts # Supabase 클라이언트
│       │   ├── api.ts      # Axios API 인스턴스 (30KB)
│       │   └── pdfStorage.ts, jobFavorites.ts
│       ├── contexts/       # AuthContext
│       └── App.tsx         # 라우터 설정 (13KB)
├── backend/
│   └── app/api/
│       ├── severance.py (12KB)         # 퇴직금 PDF 파싱 + 계산
│       ├── unemployment.py (3.8KB)
│       ├── weekly_allowance.py (4.8KB)
│       ├── annual_leave.py (7KB)
│       └── admin.py (37KB)             # 관리자 API
├── supabase/migrations/    # SQL 마이그레이션 17개
├── memory/                 # 세션 메모리 (progress.md, decisions.md, lessons.md, architecture.md)
├── docs/                   # 프로젝트 문서 (이 파일 포함)
├── tasks/todo.md           # 태스크 체크리스트
└── CLAUDE.md               # Claude 작업 규칙
```

---

## 4. 주요 기능 (완료/진행/예정)

### ✅ Phase 0 — 완료 (2026-03-31 이전)
- 퇴직금 계산기 (PDF 정밀 + 수동 간편, 28일 블록 알고리즘)
- 실업급여 계산기 (PDF 정밀 + 수동 간편)
- 주휴수당 계산기
- 연차수당 계산기
- PDF 저장/재사용 (Supabase Storage + saved_pdfs 테이블)
- 마이페이지 (프로필, 계산이력, 문의, 탈퇴)
- Toss 디자인 통일 + 반응형

### 🔄 Phase 1 — 진행 중 (2026-04-02~현재)

**완료된 항목**
- [x] job_postings DB 테이블 + RLS + 인덱스 + 트리거
- [x] job_favorites DB 테이블 (즐겨찾기)
- [x] 관리자 JobsMenu — 공고 CRUD + 긴급토글 + 상태필터
- [x] BottomNav 7탭 → 5탭 개편 (홈|채용|계산기|공지|MY)
- [x] 계산기 허브 — 4서비스 독립 그래디언트 카드
- [x] 채용피드 UI — 섹션분류(오늘긴급/내일긴급/상시), 검색, 즐겨찾기
- [x] 공식 회사 로고 (쿠팡SVG/컬리PNG/CJ SVG)
- [x] 상세 팝업 (6영역 + 카카오맵 + CTA)
- [x] SEO 강화 (react-helmet-async, JSON-LD 구조화 데이터)
- [x] Google Search Console + Naver 서치어드바이저 등록
- [x] 추천인 시스템 (referral_code + user_referrals 테이블)
- [x] Render 콜드스타트 방지 (GitHub Actions 크론)
- [x] 카카오 공유 버튼

**미완료 항목**
- [ ] 실제 채용팀 연락 → 공고 데이터 수집 시작
- [ ] 홈 채용 프리뷰 고도화
- [ ] 관리자 채용공고 데이터 관리 검증

### 📋 Phase 2 — 다음 (B2C 랜딩 + SEO 고도화)
### 📋 Phase 3 — B2B 랜딩 + 유료화
### 📋 Phase 4 — Next.js 전환 + 스케일업

---

## 5. Supabase 구성 요약

### 주요 테이블 (총 17개 마이그레이션)

| 테이블 | 역할 |
|--------|------|
| profiles | 사용자 프로필, 온보딩, 마케팅 동의 |
| admin_accounts | 관리자 계정 (is_active) |
| admin_audit_logs | 관리자 감시 로그 |
| saved_pdfs | PDF 저장/재사용 (Storage) |
| job_postings | 채용 공고 (Phase 1) |
| job_favorites | 채용 즐겨찾기 |
| job_applications | 채용 지원 기록 + 포인트 |
| inquiries | 1:1 문의 (Discord 알림) |
| notices | 공지사항 |
| referral_codes | 추천인 코드 |
| user_referrals | 추천인 관계 |

### RLS 정책 요약
- 인증 사용자: `user_id = auth.uid()` → 자신의 데이터만 접근
- 관리자: `admin_accounts.is_active = true` → 전체 CRUD
- job_postings: 인증 사용자는 active 공고만 조회

### 인증 흐름
```
Login.tsx (카카오/Google 버튼)
  → Supabase Auth OAuth
  → auth/callback.tsx (세션 확인, 8초 타임아웃)
  → 마케팅 동의 localStorage → profiles 반영
  → onboarding_completed? → /onboarding 또는 /mypage
```

---

## 6. 핵심 파일 맵

| 역할 | 경로 |
|------|------|
| 라우터 전체 | `frontend/src/App.tsx` (13KB) |
| Supabase 클라이언트 | `frontend/src/lib/supabase.ts` |
| API 호출 전체 | `frontend/src/lib/api.ts` (30KB) |
| OAuth 콜백 처리 | `frontend/src/pages/auth/callback.tsx` |
| 퇴직금 입력 | `frontend/src/pages/SeveranceFlow.tsx` (22KB) |
| 퇴직금 결과 | `frontend/src/pages/ResultSeverance.tsx` (34KB) |
| 주휴수당 | `frontend/src/pages/WeeklyAllowancePage.tsx` (42KB) |
| 연차수당 | `frontend/src/pages/AnnualLeaveAllowancePage.tsx` (49KB) |
| 채용 피드 | `frontend/src/pages/JobsPage.tsx` |
| 관리자 대시보드 | `frontend/src/pages/AdminPage.tsx` |
| FastAPI 퇴직금 | `backend/app/api/severance.py` (12KB) |
| FastAPI 관리자 | `backend/app/api/admin.py` (37KB) |
| 28일 블록 알고리즘 | `backend/app/api/severance.py` (절대 변경 금지) |
| 세션 작업 일지 | `memory/progress.md` |
| Claude 작업 규칙 | `CLAUDE.md` |

---

## 7. 최근 작업 로그 (git log --oneline -20)

```
183cb92  merge: SEO 강화 — react-helmet-async 동적 메타태그 + JSON-LD 구조화 데이터
547e8a2  feat: SEO 강화 — react-helmet-async 동적 메타태그 + JSON-LD 구조화 데이터
b5c4299  feat: 추천인 시스템 구축 (referral_code + user_referrals)
c60ac51  merge: Render 콜드스타트 방지 기능 main 반영
18b6611  feat: Render 콜드스타트 방지 — GitHub Actions 크론 + App 워밍업
fd162ed  feat: 카카오 공유 버튼 구현
97dd13e  docs: 작업 일지(progress.md) 리뉴얼 + CLAUDE.md 세션 시작 루틴 강화
3288194  feat(seo): 네이버 서치어드바이저 소유권 인증 메타태그 추가
ce86fe8  feat: Home 페이지에 노동법 가이드 진입 배너 추가
aeb531d  feat: SEO 가이드 페이지를 Layout 안으로 이동 (TopNav + BottomNav)
b991b32  fix: 미사용 변수 hoverTextColor 제거 (Vercel 빌드 에러 수정)
784937b  feat: 랜딩페이지 UX 개선 - 인용문 강조, 소멸시효 오류, 긴급모집 카드
b2f3c7c  feat: Google OAuth UX 개선 + SEO 콘텐츠 가이드 페이지 5종
e844a8d  fix: STATS '28만 3천' 줄바꿈 제거 — nowrap + fontSize 조정
46988d0  fix: landing page 6 issues - spacing, title, google auth, nav, popup, mobile
e37d2f4  fix: revert Intro to original design + redirect to /landing after intro
5f15623  fix: resolve Vercel build errors
c7469cf  Merge branch 'claude/focused-goldberg'
7c01dd0  fix: SplashScreen redesign with dark gradient + text visibility fix
463bd94  feat: 앱 접속 시 스플래시 로딩 화면 추가
```

---

## 8. 현재 진행 중인 작업 (Phase 1)

**상태**: Phase 1 UI/DB 구축은 완료. 실제 데이터(채용공고) 수집 단계 남음.

**SEO 현황**
| 항목 | 상태 |
|------|------|
| Google Search Console | ✅ 등록 완료 |
| Naver 서치어드바이저 | ✅ 등록 완료 |
| sitemap.xml | ✅ Google + Naver 제출 완료 |
| Google 색인 | 🔄 /home 요청 완료, 나머지 9개 대기 |
| Naver 색인 | 🔄 수집 요청 후 2~4주 소요 |

**인프라 상태**
- 프로덕션: ✅ https://catch-daily-worker.vercel.app
- API: ✅ https://coupang-severance-api.onrender.com
- 콜드스타트 방지: ✅ GitHub Actions 크론 (15분 주기 핑)
- OG 메타태그: ✅ 카카오/슬랙 공유 대응
- JSON-LD 구조화 데이터: ✅ WebApplication 스키마

---

## 9. 다음 작업 (P0/P1/P2)

| 우선순위 | 작업 | 상세 |
|---------|------|------|
| **P0** | GSC URL 색인 요청 (나머지 9개) | 하루 2~3개씩. `/landing`, `/guide`, `/guide/severance`, `/guide/unemployment`, `/guide/weekly-allowance`, `/guide/annual-leave`, `/severance`, `/unemployment`, `/calculator` |
| **P1** | 채용팀 연락 → 공고 데이터 수집 | 실제 쿠팡/컬리/CJ 채용담당자에게 연락 |
| **P1** | 홈 채용 프리뷰 고도화 | 현재 간단한 카드 → 동적 로딩 개선 |
| **P1** | 관리자 채용공고 데이터 관리 검증 | RLS 정책 실제 동작 확인 |
| **P2** | Phase 2 B2C 랜딩 + SEO 고도화 | 검색 노출 모니터링 (1~4주 소요 후) |
| **P3** | PWA → 앱스토어 출시 | Capacitor 또는 TWA 래핑 검토 |

---

## 10. 알려진 이슈 / 기술 부채

### 주의사항 (실수 방지)
- `index.html`의 `google-site-verification`, `naver-site-verification` 메타태그 **절대 삭제 금지**
- 빌드는 반드시 `npm run build` 사용 (`vite build` 단독 금지 → TypeScript 에러 누락됨)
- 28일 블록 알고리즘 (`severance.py`) **절대 임의 변경 금지**
- 구현 완료 후 반드시 `.claude/agents/reviewer.md` 기반 리뷰어 에이전트 호출

### 환경변수 주의
- 개발 환경: `VITE_API_URL` = 빈 문자열 (Vite 프록시 `/api/*` → `localhost:8000`)
- 프로덕션: `VITE_API_URL` = `https://coupang-severance-api.onrender.com`
- OAuth 콜백 URL은 Supabase URL(`*.supabase.co/auth/v1/callback`)이며 앱 도메인 아님

### 미완료 태스크
- 하네스 워크플로우 실제 테스트 (세션 3에서 생성, 아직 테스트 미완)

---

## 업데이트 규칙

- 주요 작업이 끝날 때마다 **섹션 8(현재 진행 중)**과 **섹션 9(다음 작업)** 수정
- Claude에게 **"진행상황 업데이트해줘"** 라고 말하면 이 파일을 수정합니다
- 상단 `최종 업데이트` 날짜도 함께 수정하세요
- 더 자세한 실시간 일지는 `memory/progress.md` 참조
