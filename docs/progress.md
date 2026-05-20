# CATCH 프로젝트 진행 상황

> 이 파일은 git 레포에 저장되어 대화/메모리가 초기화되어도 유지됩니다.
> **새 세션 시작 시**: "CLAUDE.md와 docs/progress.md 읽고 작업 이어가자" 라고 말하세요.

---

## 최종 업데이트: 2026-05-20

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

**추가 완료 항목 (4/11~5/10)**
- [x] 지원서 폼 전면 개편 (업무선택/경험/안전화/동의 + 성별 prefill)
- [x] DB 확장 — applications(task_options/work_date) + profiles(gender/consent_at) 마이그레이션
- [x] 어드민 공고 등록 5단계 스텝퍼 + 미리보기
- [x] 어드민 대시보드 5탭 구조 전면 재구성 (audit_logs + system_logs 연동)
- [x] 모바일 반응형 전역 수정 (375px 기준) + E2E 테스트 3종
- [x] 카카오 로그인 버그 수정 + 비로그인 게스트 모드 (GuestGate 모달 + 자동 저장)
- [x] 홈 채용 프리뷰 고도화 (만료 필터링, 로고, D-day, 섹션뱃지, 개별 상세팝업)
- [x] 관리자 채용공고 데이터 관리 검증 (필수값/과거날짜/연락처/URL 검증)
- [x] IndexNow API 키 추가 + sitemap lastmod 갱신
- [x] 지원자 관리 LMS형 필터 그리드 (ApplicantsMenu 전면 재구성)
- [x] 채용현황 대시보드 전면 개편 (ConfirmedMenu: 기간필터+차트+KPI)
- [x] 마이페이지 지원현황 — 5탭 언더라인 + 취소 바텀시트 + D-day 배지
- [x] 마이페이지 스케줄 — 달력 제거 → 타임라인 리스트 + 수입 통계
- [x] Discord 알림 연동 (문의 제출 시 Webhook + system_settings 우선 조회)
- [x] 방문자 식별 개선 (비회원 세션ID 표시)
- [x] SEO 키워드 랜딩 3개 (쿠팡 퇴직금/실업급여/일용직 퇴직금 가이드)
- [x] 블로그 초안 5편 + 마케팅킷 (카페/지식인/카카오 템플릿)
- [x] PDF 추출 실패 시 버튼 비활성화 + 에러 메시지 세분화

**미완료 항목**
- [ ] 실제 채용팀 연락 → 공고 데이터 수집 시작
- [ ] GSC URL 색인 수동 요청 (9개 — GSC 직접 접속 필요)

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
c44990b  fix(calc): PDF 추출 실패 시 버튼 비활성화 + 상태별 에러 메시지 개선   ← 최신
9adf9e9  feat(marketing): SEO 키워드 랜딩 3개 + 블로그 초안 5편 + 마케팅킷
bd13f01  docs(claude): 세션 시작 자동 처리 규칙 강화 (레포 경로/cowork/푸시 기본값)
8fb950c  merge: Discord 알림 경로 일원화 머지
6e0a884  fix: 방문자 식별 개선 + Discord 알람 연동 + CSV 필터 수정
82b8b53  chore: 하네스 워크플로우 강제 적용 — CLAUDE.md + sprint.md + memory 업데이트
eff6fd4  merge: 지원자관리 필터 그리드 + 채용현황 대시보드 개편 머지
047a166  feat(mypage): 지원현황 LMS형 필터 + 스케줄 타임라인 뷰 전면 재작성
a589fe1  feat(admin): 채용공고 등록 고도화 — 근무일자/조별금액/업무별금액 입력
41354ab  fix(admin): 어드민 대시보드 버그 4개 수정
f0de8ee  feat(jobs): 채용 피드 카드 + 상세팝업 UI/UX 전면 개선
62d8044  feat(admin): 어드민 채용관리 전면 재구성 — 아코디언 사이드바 + 4개 전용 메뉴
b43244a  feat(admin): 어드민 대시보드 전면 재구성 — 5개 서브탭 구조
921afe8  feat(phase1): 홈 채용 프리뷰 고도화 + 관리자 검증 강화
5e5237c  merge: 비로그인 저장하기 GuestGate 모달 + 로그인 후 자동 저장
20094ab  feat: 카카오 로그인 버그 수정 + 비로그인 게스트 모드 구현
7cacae5  fix(pdf): 저장된 PDF 인식 오류 수정
c7f0189  fix(mobile)+test(e2e): CalcLayout/ApplyFormModal 반응형 + E2E 3종
2f67fee  fix(mobile): 전역 모바일 반응형 수정 (375px 기준)
326f5ad  feat(apply): 지원서 폼 전면 개편 (업무/경험/교통/안전화/동의 단일)
```

---

## 8. 현재 진행 중인 작업 (Phase 1 마무리 + Phase 2 준비)

**상태**: Phase 1 코드 구현 완료. 실제 채용공고 데이터 수집(운영) 단계 남음. SEO 랜딩 3개 추가(5/10). Phase 2(B2C 랜딩 고도화) 준비 중.

**SEO 현황 (2026-05-20 기준)**
| 항목 | 상태 |
|------|------|
| Google Search Console | ✅ 등록 완료 |
| Naver 서치어드바이저 | ✅ 등록 완료 |
| sitemap.xml | ✅ 15개 URL 포함 (SEO 랜딩 3개 포함) |
| Google 색인 | 🔄 /home 이후 추가 요청 필요 (수동) |
| Naver 색인 | 🔄 진행 중 (수집 후 2~4주 소요) |
| SEO 키워드 랜딩 | ✅ 3개 추가 (/coupang-severance-calculator, /coupang-unemployment-calculator, /day-worker-severance-guide) |
| IndexNow | ✅ API 키 등록 완료 |

**인프라 상태**
- 프로덕션: ✅ https://catch-daily-worker.vercel.app (최신 커밋 c44990b 반영)
- API: ✅ https://coupang-severance-api.onrender.com
- 콜드스타트 방지: ✅ GitHub Actions 크론 (15분 주기 핑)
- OG 메타태그: ✅ 카카오/슬랙 공유 대응
- JSON-LD 구조화 데이터: ✅ WebApplication + FAQ/HowTo 스키마
- Discord 알림: ✅ 문의 제출 시 자동 Webhook (system_settings 우선)

---

## 9. 다음 작업 (P0/P1/P2)

| 우선순위 | 작업 | 상세 | 진행 여부 |
|---------|------|------|----------|
| **P0** | GSC URL 색인 수동 요청 | `/coupang-severance-calculator`, `/coupang-unemployment-calculator`, `/day-worker-severance-guide` 등 | 🔄 수동 클릭 필요 |
| **P1** | SEO 랜딩 3개 실측 검증 | 프로덕션 URL HTTP 200 확인 + OG 메타태그 점검 | 미착수 |
| **P1** | 채용팀 연락 → 공고 데이터 수집 | 쿠팡/컬리/CJ 채용담당자 연락 | 미착수 (운영) |
| **P2** | Phase 2 B2C 랜딩 + SEO 고도화 | 검색 노출 모니터링 (1~4주 후) | 대기 |
| **P3** | PWA → 앱스토어 출시 | Capacitor 또는 TWA 래핑 검토 | 미착수 |

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
