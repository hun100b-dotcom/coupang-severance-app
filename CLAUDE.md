# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**CATCH (퇴직금 한번에)** — 한국의 일용직 근로자를 위한 퇴직금·실업급여·주휴수당·연차수당 계산기. 주요 대상: 쿠팡, 마켓컬리, CJ대한통운 직원. 근로복지공단 일용근로내역서 PDF 업로드 또는 수동 입력으로 계산.

- **프론트엔드**: React 18 + TypeScript + Vite + Tailwind CSS → Vercel 자동 배포
- **백엔드**: FastAPI (Python 3.12) → Render 싱가포르 자동 배포
- **데이터베이스**: Supabase Postgres (클릭 카운터, 문의, 프로필, 계산 결과)
- **인증**: Supabase OAuth (카카오 + 구글) — 프론트엔드 전용 (`@supabase/supabase-js`)

---

## 개발 명령어

### 백엔드 (처음 실행)

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### 백엔드 개발 서버

```powershell
.\backend\.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger 문서: `http://localhost:8000/docs`

### 프론트엔드

```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173 (Vite가 /api/* → :8000 자동 프록시)
npm run build    # tsc -b && vite build → frontend/dist
```

### 유효성 검증 테스트

```powershell
.\backend\.venv\Scripts\Activate.ps1
python tests\validate_severance_logic.py
```

### E2E 테스트 (Playwright)

```powershell
cd frontend
npx playwright test              # 전체 실행 (headless)
npx playwright test --ui         # UI 모드 (대화형)
npx playwright test e2e/foo.spec.ts  # 단일 파일 실행
npx playwright show-report       # 마지막 결과 리포트
```

테스트 파일: `frontend/e2e/` 디렉토리. 설정: `frontend/playwright.config.ts` (baseURL: http://localhost:5173, Chromium만 사용).

---

## 아키텍처

### 요청 흐름

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

### 라우팅 구조 (App.tsx)

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

### 백엔드 핵심 모듈 (`backend/app/`)

- **`services/pdf.py`** — `pdfplumber`로 근로복지공단 PDF 파싱. 다중 페이지, 반복 헤더, 4가지 날짜 형식 처리. `COMPANY_KEYWORDS`로 회사명 정규화 (쿠팡 변형 등).
- **`services/severance.py`** — **28일 역순 블록 알고리즘**: 마지막 근무일부터 28일 블록으로 분할, 블록 내 근무일 ≥8이면 적격. `qualifying_days ≥ 365`면 퇴직금 적격. 3개월 공백 시 별도 세그먼트로 분리.
- **`services/unemployment.py`** — 실업급여: 최근 18개월 내 피보험일 수 ≥ 180 확인.
- **`services/counter.py`** — 클릭 카운터. Supabase `click_counter` 테이블 우선, 실패 시 `data/click_count.json` 폴백.
- **`services/notify.py`** — 1:1 문의 시 Discord 웹훅 전송. 오류 조용히 억제.
- **`api/admin.py`** — 관리자 OS API (9개 엔드포인트). `_VALID_ADMIN_TOKENS` 집합으로 토큰 검증 (환경변수 + 기본값 모두 허용). SUPABASE_URL은 프로젝트 ID 포함 여부로 자동 교정.

### 어드민 슈퍼 관리자 (`SUPER_ADMIN_EMAIL = 'catchmasterdmin@gmail.com'`)

- `AdminSidebar.tsx`에 상수 정의
- 슈퍼어드민 전용 기능: Audit Logs (`AuditLogsMenu.tsx`), Server Logs (`ServerLogsMenu.tsx`), Settings → 마스킹 보안키, Settings → 권한 레벨 관리
- `ServerLogsMenu.tsx`의 `DEPLOY_LOG` 상수: 배포 이력을 수동으로 관리하는 하드코딩된 배열 — 배포 시 직접 추가 필요
- `MembersMenu`에 이메일/ID 마스킹 기본 적용 (마스킹 해제 시 `member_unmask_key` 설정값 일치 필요)
- `AccountsMenu`: 계정 추가/수정/삭제는 슈퍼어드민만 가능 (DB RLS: `is_super_admin()`)
- `system_settings` 키 추가: `permission_levels` (JSON), `member_unmask_key`
- 마이그레이션: `supabase/migrations/005_super_admin_setup.sql` — Supabase SQL Editor에서 실행 필요

### 계산 모드 (퇴직금·실업급여·주휴수당·연차수당 모두 동일 패턴)

1. **정밀 계산 (Precise)** — PDF 업로드 → `extract-companies` → 회사 선택 → `precise` 엔드포인트 (전체 알고리즘)
2. **간편 계산 (Simple)** — 근무일 수 + 평균 일급 수동 입력 → `simple` 엔드포인트 (공식 직접 적용)

퇴직금 공식: `퇴직금 = 평균일급 × 30 × (근무일수 ÷ 365)`

---

## 핵심 구현 패턴

### Supabase — 반드시 중앙 클라이언트 사용

```typescript
import { supabase } from '../lib/supabase'  // ✓
// import { createClient } from '@supabase/supabase-js'  ✗ 절대 금지
```

### 인증 상태

```typescript
import { useAuth } from '../contexts/AuthContext'
const { user, isLoggedIn, loading, logout } = useAuth()
```

### API 호출

```typescript
import { api } from '../lib/api'
const response = await api.post('/severance/precise', { ... })
```

### 클릭 카운터 등록

유효한 서비스 식별자: `severance | unemployment | weekly_allowance | annual_leave | benefits`

```typescript
import { registerClick } from '../lib/api'
registerClick('severance')  // fire-and-forget, await 불필요
```

### 계산 결과 저장

```typescript
await supabase.from('reports').insert({
  user_id: user.id,
  title: '회사명 날짜',
  company_name: '회사명',
  payload: {   // SeverancePayload 타입 (types/supabase.ts)
    severance: number,
    work_days: number,
    average_wage: number,
    eligible: boolean,
    eligibility_message: string,
    qualifying_days: number,
  },
})
```

### UI 스타일 패턴 (글래스모피즘)

```
카드:   bg-white/60 backdrop-blur-xl border border-white/60 shadow-[0_12px_40px_rgba(49,130,246,0.08)]
헤더:   bg-white/60 backdrop-blur-2xl border border-white/50
버튼:   components/Button.tsx의 PrimaryButton / SecondaryButton / ChoiceButton 사용
```

---

## 환경 변수

### 프론트엔드 (`frontend/.env.local`)

```
VITE_SUPABASE_URL=https://hmjxrqhcwjyfkvlcejfc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=                 # 개발 시 비워두기 (Vite 프록시), 프로덕션에서 백엔드 URL
VITE_ADMIN_SECRET=Luck2058qorwhdgns3
VITE_ADMIN_EMAIL=             # 관리자 이메일
```

### 백엔드 (`backend/.env`)

```
SUPABASE_URL=https://hmjxrqhcwjyfkvlcejfc.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # 관리자 API용
ADMIN_SECRET=Luck2058qorwhdgns3
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...  # 선택사항
```

---

## 배포

### Vercel (프론트엔드)

- `git push origin main` → 자동 빌드·배포
- 빌드: `cd frontend && npm run build` → `frontend/dist`
- `vercel.json`: 비자산 경로 전부 `/index.html`로 재쓰기 (SPA)
- Supabase OAuth 리다이렉트 URL 등록 필수: `https://coupang-severance-app.vercel.app/**`

### Render (백엔드)

- `git push origin main` → 자동 배포 (`render.yaml`: Python 3.12, 싱가포르)
- 시작: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- **주의**: Render의 `SUPABASE_URL` 환경변수가 잘못 설정되면 `counter.py`가 JSON 파일 폴백으로 전락하여 재배포 시 카운터가 초기화됩니다. `admin.py`처럼 URL에 프로젝트 ID 포함 여부를 검증하는 로직이 counter.py에도 있어야 합니다.

---

## Supabase 테이블 요약

| 테이블 | 용도 |
|---|---|
| `profiles` | 사용자 프로필 (id, email, display_name, marketing_agreement) |
| `reports` | 계산 결과 (user_id, title, company_name, payload JSONB) |
| `inquiries` | 1:1 문의 (category, content, status, answer) |
| `click_counter` | 단일 행 누적 카운터 (total, severance, unemployment) |
| `inquiry_templates` | 관리자 답변 매크로 |
| `system_settings` | Key-Value 시스템 설정 |
| `audit_logs` | 관리자 행동 감사 로그 |
| `blocked_ips` | IP 차단 목록 |
| `user_tags` | 사용자 자동 태그 |
| `notices` | 공지사항 (content, is_active, priority) — Home 배너·/notices 페이지 표시 |

---

## 향후 작업 시 필수 사항

1. **Notion 동기화**: 코드 변경 완료 후 "📋 CATCH 개발 태스크" Notion DB의 해당 작업을 "✅ 완료"로 업데이트하고 구현 노트를 추가하세요. Notion DB 세부 정보는 메모리를 참조하세요.

2. **28일 블록 알고리즘**: 퇴직금 적격성의 핵심. `backend/app/services/severance.py` 참조. 수정 시 `python tests/validate_severance_logic.py` 로 반드시 검증.

3. **회사 필터링**: PDF에서 모든 회사를 추출한 뒤 사용자가 선택한 회사로 필터링하는 2단계 구조. `extract-companies` → 회사 선택 → `precise` 순서를 깨지 말 것.

4. **레이아웃 분리**: `Intro`, `Login`, `AuthCallback`, `Admin`은 Layout 밖 (TopNav/BottomNav 없음). 나머지는 모두 `<Layout>` 중첩 라우트 안에 있어야 함.
