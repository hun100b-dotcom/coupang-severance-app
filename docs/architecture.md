# CATCH 아키텍처 상세

> 원본: CLAUDE.md 65-141줄 (76줄) — 데이터 무결성 100% 보장

---

## 요청 흐름

```
브라우저 (React SPA)
  │
  ├─ /api/*  ──►  FastAPI 백엔드 (Render)
  │                 ├─ /api/severance/*        PDF 파싱 + 퇴직금 계산
  │                 ├─ /api/unemployment/*     실업급여 적격성
  │                 ├─ /api/weekly-allowance/* 주휴수당 계산
  │                 ├─ /api/annual-leave/*     연차수당 계산
  │                 ├─ /api/click-count        방문 카운터
  │                 ├─ /api/inquiry/notify     Discord 웹훅
  │                 └─ /api/admin/*            관리자 OS (X-Admin-Token 필수)
  │
  └─ Supabase (프론트엔드 직접 접근)
        ├─ 인증: signInWithOAuth, onAuthStateChange
        ├─ profiles   사용자 프로필
        ├─ reports    계산 결과 저장
        └─ inquiries  1:1 고객 문의
```

## 라우팅 구조 (App.tsx)

네비바(TopNav + BottomNav)가 **있는** 페이지는 `<Layout>` 중첩 라우트로 묶입니다. 독립 페이지는 Layout 밖에 있습니다.

```
/                   → Intro          (스플래시, Layout 없음)
/auth/callback      → AuthCallback   (OAuth 콜백, Layout 없음)
/login              → LoginPage      (Layout 없음)
/admin              → AdminPage      (자체 사이드바, Layout 없음)
                      ├─ 접근: VITE_ADMIN_EMAIL과 동일한 이메일
                      └─ 슈퍼어드민: catchmasterdmin@gmail.com만 Audit Logs, Settings 고급 기능 접근

<Layout>  ← TopNav(56px) + BottomNav(60px) 포함
  /home             → Home
  /severance        → SeveranceFlow
  /unemployment     → UnemploymentFlow
  /mypage           → MyPage
  /report/:id       → ReportDetail   (ProtectedRoute 필수)
  /payment          → PaymentGuide
  /weekly-allowance → WeeklyAllowancePage
  /annual-leave     → AnnualLeaveAllowancePage
  /my-benefits      → MyBenefitsPage
  /notices          → NoticesPage    (공지사항 전체 목록)
  *                 → Home
```

**중요 — CSS z-index**: `AnimatedBackground`는 `position: fixed; z-index: 0`이므로, Layout 내 모든 페이지 루트 div에는 반드시 `className="relative z-[1] ..."` 가 있어야 콘텐츠가 배경 위에 표시됩니다.

## 백엔드 핵심 모듈 (`backend/app/`)

- **`services/pdf.py`** — `pdfplumber`로 근로복지공단 PDF 파싱. 다중 페이지, 반복 헤더, 4가지 날짜 형식 처리. `COMPANY_KEYWORDS`로 회사명 정규화 (쿠팡 변형 등).
- **`services/severance.py`** — **28일 역순 블록 알고리즘**: 마지막 근무일부터 28일 블록으로 분할, 블록 내 근무일 ≥8이면 적격. `qualifying_days ≥ 365`면 퇴직금 적격. 3개월 공백 시 별도 세그먼트로 분리.
- **`services/unemployment.py`** — 실업급여: 최근 18개월 내 피보험일 수 ≥ 180 확인.
- **`services/counter.py`** — 클릭 카운터. Supabase `click_counter` 테이블 우선, 실패 시 `data/click_count.json` 폴백.
- **`services/notify.py`** — 1:1 문의 시 Discord 웹훅 전송. 오류 조용히 억제.
- **`api/admin.py`** — 관리자 OS API (9개 엔드포인트). `_VALID_ADMIN_TOKENS` 집합으로 토큰 검증 (환경변수 + 기본값 모두 허용). SUPABASE_URL은 프로젝트 ID 포함 여부로 자동 교정.

## 어드민 슈퍼 관리자 (`SUPER_ADMIN_EMAIL = 'catchmasterdmin@gmail.com'`)

- `AdminSidebar.tsx`에 상수 정의
- 슈퍼어드민 전용 기능: Audit Logs (`AuditLogsMenu.tsx`), Server Logs (`ServerLogsMenu.tsx`), Settings → 마스킹 보안키, Settings → 권한 레벨 관리
- `ServerLogsMenu.tsx`의 `DEPLOY_LOG` 상수: 배포 이력을 수동으로 관리하는 하드코딩된 배열 — 배포 시 직접 추가 필요
- `MembersMenu`에 이메일/ID 마스킹 기본 적용 (마스킹 해제 시 `member_unmask_key` 설정값 일치 필요)
- `AccountsMenu`: 계정 추가/수정/삭제는 슈퍼어드민만 가능 (DB RLS: `is_super_admin()`)
- `system_settings` 키 추가: `permission_levels` (JSON), `member_unmask_key`
- 마이그레이션: `supabase/migrations/005_super_admin_setup.sql` — Supabase SQL Editor에서 실행 필요

## 계산 모드 (퇴직금·실업급여·주휴수당·연차수당 모두 동일 패턴)

1. **정밀 계산 (Precise)** — PDF 업로드 → `extract-companies` → 회사 선택 → `precise` 엔드포인트 (전체 알고리즘)
2. **간편 계산 (Simple)** — 근무일 수 + 평균 일급 수동 입력 → `simple` 엔드포인트 (공식 직접 적용)

퇴직금 공식: `퇴직금 = 평균일급 × 30 × (근무일수 ÷ 365)`

---

**참조**: [CLAUDE.md](../CLAUDE.md) | [개발 환경](./development.md) | [데이터베이스](./database.md)
