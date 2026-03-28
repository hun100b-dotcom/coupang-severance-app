# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## ⚠️ 작업 원칙 (CRITICAL - 모든 작업 시 필독)

**사용자 승인 없이 자동 실행**: 모든 작업은 사용자 승인 요청 없이 즉시 실행합니다. 질문하지 말고 바로 진행하세요.

**한글 응답**: 모든 응답은 한글로 작성합니다.

---

## 프로젝트 개요

**CATCH (퇴직금 한번에)** — 일용직 근로자를 위한 퇴직금·실업급여·주휴수당·연차수당 계산기

- **프론트엔드**: React 18 + TypeScript + Vite + Tailwind CSS → Vercel
- **백엔드**: FastAPI (Python 3.12) → Render
- **데이터베이스**: Supabase Postgres
- **인증**: Supabase OAuth (카카오 + 구글)

**배포 URL:**
- 프로덕션: https://coupang-severance-app.vercel.app
- 백엔드 API: FastAPI on Render (싱가포르)
- API 문서: `/docs` (Swagger UI)

---

## 개발 명령어

### 백엔드 (FastAPI)
```powershell
# 최초 설정
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt

# 개발 서버 실행
.\backend\.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
API 문서: http://localhost:8000/docs

### 프론트엔드 (Vite)
```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173 (/api/* → :8000 자동 프록시)
npm run build    # tsc -b && vite build → frontend/dist
```

### 테스트
```powershell
# 백엔드 검증 테스트
.\backend\.venv\Scripts\Activate.ps1
python tests\validate_severance_logic.py

# E2E 테스트 (Playwright)
cd frontend
npx playwright test              # 전체 실행 (headless)
npx playwright test --ui         # 대화형 UI 모드
npx playwright test e2e/foo.spec.ts  # 단일 파일
npx playwright show-report       # 마지막 결과 리포트
```

### 슬래시 커맨드
```bash
/dev         # 개발 서버 시작
/test-mcp    # MCP 전체 테스트
/deploy      # 배포 체크리스트
```

---

## 아키텍처

### 요청 흐름
```
브라우저 (React SPA)
  │
  ├─ /api/*  ──► FastAPI 백엔드 (Render)
  │              ├─ /api/severance/*        PDF 파싱 + 퇴직금 계산
  │              ├─ /api/unemployment/*     실업급여 적격성
  │              ├─ /api/weekly-allowance/* 주휴수당 계산
  │              ├─ /api/annual-leave/*     연차수당 계산
  │              ├─ /api/click-count        방문 카운터
  │              ├─ /api/inquiry/notify     Discord 웹훅
  │              └─ /api/admin/*            관리자 OS (X-Admin-Token 필수)
  │
  └─ Supabase (프론트엔드 직접 접근)
       ├─ 인증: signInWithOAuth, onAuthStateChange
       ├─ profiles   사용자 프로필
       ├─ reports    계산 결과 저장
       └─ inquiries  1:1 고객 문의
```

### 라우팅 구조 (App.tsx)

**네비 없는 페이지** (`<Layout>` 밖):
- `/` → Intro (스플래시, 6초 후 자동 이동)
- `/auth/callback` → AuthCallback (OAuth 콜백)
- `/login` → LoginPage
- `/admin` → AdminPage (자체 사이드바, VITE_ADMIN_EMAIL 필요)

**네비 있는 페이지** (`<Layout>` 안 - TopNav + BottomNav):
- `/home` → Home
- `/severance` → SeveranceFlow
- `/unemployment` → UnemploymentFlow
- `/mypage` → MyPage
- `/report/:id` → ReportDetail (ProtectedRoute 필수)
- `/payment` → PaymentGuide
- `/weekly-allowance` → WeeklyAllowancePage
- `/annual-leave` → AnnualLeaveAllowancePage
- `/my-benefits` → MyBenefitsPage
- `/notices` → NoticesPage

**중요 CSS z-index**: `AnimatedBackground`는 `position: fixed; z-index: 0`입니다. Layout 내 모든 페이지 루트 div는 반드시 `className="relative z-[1] ..."`가 있어야 배경 위에 콘텐츠가 표시됩니다.

### 백엔드 핵심 모듈 (`backend/app/`)

- **`services/pdf.py`** — 근로복지공단 PDF 파싱 (`pdfplumber` 사용). 다중 페이지, 반복 헤더, 4가지 날짜 형식 처리. `COMPANY_KEYWORDS`로 회사명 정규화 (쿠팡 변형 등).

- **`services/severance.py`** — **28일 역산 블록 알고리즘**: 핵심 적격성 로직. 마지막 근무일부터 역순으로 28일 블록 분할. 블록당 근무일 ≥8이면 적격. `qualifying_days ≥ 365` → 퇴직금 적격. 3개월 공백 시 세그먼트 분리.

- **`services/unemployment.py`** — 실업급여: 최근 18개월 내 피보험일 수 ≥ 180 확인.

- **`services/counter.py`** — 클릭 카운터. Supabase `click_counter` 테이블 우선, 실패 시 `data/click_count.json` 폴백.

- **`services/notify.py`** — 1:1 문의 시 Discord 웹훅 전송. 오류 조용히 억제.

- **`api/admin.py`** — 관리자 OS API (9개 엔드포인트). `_VALID_ADMIN_TOKENS` 집합으로 토큰 검증 (환경변수 + 기본값). SUPABASE_URL 프로젝트 ID 포함 여부 자동 교정.

### 계산 모드 (모든 서비스 동일 패턴)

1. **정밀 계산** — PDF 업로드 → `extract-companies` → 회사 선택 → `precise` 엔드포인트 (전체 알고리즘)
2. **간편 계산** — 근무일수 + 평균일급 수동 입력 → `simple` 엔드포인트 (공식 직접 적용)

퇴직금 공식: `퇴직금 = 평균일급 × 30 × (근무일수 ÷ 365)`

---

## 코드 패턴

### Supabase 클라이언트
```typescript
import { supabase } from '../lib/supabase'  // 중앙 클라이언트
```

### API 호출
```typescript
import { api } from '../lib/api'
const response = await api.post('/severance/precise', { ... })
```

### 클릭 카운터
```typescript
import { registerClick } from '../lib/api'
registerClick('severance')  // fire-and-forget
```

---

## MCP 서버 (최우선 사용)

모든 작업 시 MCP를 최우선으로 사용합니다:

- **Supabase MCP**: DB 쿼리, 마이그레이션, 테이블 조회
- **Notion MCP**: "📋 CATCH 개발 태스크" DB 동기화
- **GitHub MCP**: 커밋 조회, PR 생성
- **Vercel MCP**: 배포 상태, 환경변수
- **Playwright MCP**: E2E 테스트 자동 실행

**예시**: "Supabase profiles 테이블 구조 보여줘" → Supabase MCP 자동 사용

[MCP 상세 가이드](docs/mcp-guide.md)

---

## 필수 구현 사항

1. **Notion 동기화**: 작업 완료 시 "📋 CATCH 개발 태스크" 자동 업데이트 (Notion MCP 사용)
2. **28일 블록 알고리즘**: 퇴직금 적격성 핵심 로직 (`backend/app/services/severance.py`)
3. **회사 필터링**: 2단계 구조 - PDF 추출 → 회사 선택 → 정밀 계산
4. **레이아웃 분리**: `Intro`, `Login`, `Admin`은 Layout 밖. 나머지는 `<Layout>` 안.
5. **슈퍼 어드민**: `catchmasterdmin@gmail.com`만 Audit Logs, Settings 고급 기능 접근
6. **어드민 토큰**: 백엔드는 `X-Admin-Token` 헤더로 검증 (env `VITE_ADMIN_SECRET` 또는 `VITE_SUPABASE_ANON_KEY` 뒤 32자 자동 파생)

---

## 배포

```bash
git push origin main  # Vercel (프론트) + Render (백엔드) 자동 배포
```

Vercel MCP로 배포 모니터링.

---

**상세 문서**: [docs/](docs/) — [개발 환경](docs/development.md) | [아키텍처](docs/architecture.md) | [환경변수](docs/environment.md) | [데이터베이스](docs/database.md) | [MCP 가이드](docs/mcp-guide.md)
