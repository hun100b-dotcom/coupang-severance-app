# CLAUDE.md

이 파일은 이 저장소의 코드로 작업할 때 Claude Code (claude.ai/code)에 대한 지침을 제공합니다.

## 프로젝트 개요

**CATCH (퇴직금 한번에)** — 한국의 일용직 근로자를 위한 퇴직금 및 실업급여 계산기로, 주로 쿠팡, 마켓컬리, CJ대한통운 직원을 대상으로 합니다. 사용자는 근로복지공단 일용근로내역서 PDF를 업로드하거나 근무일 수를 수동으로 입력하면, 앱은 한국 노동법에 따라 적격 퇴직금/실업급여를 계산합니다.

- **프론트엔드**: React 18 + TypeScript + Vite + Tailwind CSS, Vercel에 배포
- **백엔드**: FastAPI (Python 3.12), Render (싱가포르)에 배포
- **데이터베이스**: Supabase Postgres — 클릭 카운터, 사용자 문의, 사용자 프로필 저장
- **인증**: Supabase OAuth (카카오 + 구글) — `@supabase/supabase-js`를 통해 프론트엔드에서 전적으로 관리

## 개발 명령어

### 백엔드 설정 (처음 실행)

```powershell
cd coupang-severance-app
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### 백엔드 개발 서버

```powershell
# 터미널 1
.\backend\.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

접속: `http://localhost:8000` | Swagger API 문서: `http://localhost:8000/docs`

### 프론트엔드 설정 & 개발

```powershell
# 터미널 2
cd frontend
npm install
npm run dev
```

접속: `http://localhost:5173`

**참고**: Vite는 개발 모드에서 자동으로 `/api/*` → `http://localhost:8000`으로 프록시합니다.

### 프론트엔드 빌드

```powershell
cd frontend
npm run build  # 실행: tsc -b && vite build → frontend/dist에 출력
```

### 유효성 검증 테스트

```powershell
.\backend\.venv\Scripts\Activate.ps1
python tests\validate_severance_logic.py  # 로직을 픽스처와 비교하여 테스트
```

## 고수준 아키텍처

### 요청 흐름

```
브라우저 (React SPA)
  │
  ├─ /api/* (개발 시 Vite 프록시, 프로덕션에서 VITE_API_URL 환경변수)
  │       │
  │       └─► FastAPI 백엔드 (포트 8000)
  │               ├─ /api/severance/*     — PDF 파싱, 정밀 계산
  │               ├─ /api/unemployment/*  — 실업급여 적격성
  │               ├─ /api/click-count     — 방문 카운터
  │               └─ /api/inquiry/notify  — Discord 웹훅 (1:1 문의)
  │
  └─ Supabase (프론트엔드에서 직접)
          ├─ 인증: signInWithOAuth를 통한 OAuth, onAuthStateChange를 통한 세션
          ├─ profiles: 사용자 프로필 (joined_at, marketing_agreement)
          ├─ reports: 저장된 계산 결과 (id, user_id, title, company_name, payload)
          └─ inquiries: 1:1 고객 문의 (created_at, message, status)
```

### 주요 모듈

#### 백엔드 (`backend/app/`)

- **`services/pdf.py`** — `pdfplumber`를 사용하여 근로복지공단 일용근로내역서 PDF를 파싱합니다. 다중 페이지 테이블, 반복되는 헤더, 4가지 날짜 형식을 처리합니다. `COMPANY_KEYWORDS` 사전은 표준 이름을 알려진 변형 (쿠팡, 마켓컬리 등)으로 매핑합니다.
- **`services/severance.py`** — 핵심 퇴직금 적격성 로직입니다. **28일 역순 블록 알고리즘**을 사용합니다: 마지막 근무일부터 고용을 28일 블록으로 분할하고, 근무일수 ≥8일 (≡ 4주 평균 ≥15시간/주)이면 블록이 적격입니다. `qualifying_days ≥ 365`이면 적격입니다. 또한 3개월 고용 간격을 감지하여 별개 세그먼트로 분할합니다.
- **`services/unemployment.py`** — 실업급여 적격성: 지난 18개월 내 보험일 수 ≥ 180을 확인합니다.
- **`services/counter.py`** — Supabase `click_counter` 테이블로 지원되는 클릭 카운터입니다. Supabase를 사용할 수 없으면 `data/click_count.json`으로 폴백합니다.
- **`services/notify.py`** — 사용자가 1:1 문의를 제출할 때 Discord 웹훅 알림을 보냅니다. 오류를 조용히 억제합니다.
- **`api/severance.py`, `api/unemployment.py`** — 계산용 HTTP 엔드포인트입니다. 각각 두 가지 모드를 지원합니다:
  - **정밀 계산 (Precise)**: 사용자가 PDF 업로드 → 백엔드에서 파싱, 회사별 필터링, 전체 알고리즘 실행
  - **쉬운 계산 (Simple)**: 사용자가 근무일 수 + 평균 일급 입력 → 백엔드에서 공식 직접 적용

#### 프론트엔드 (`frontend/src/`)

- **`lib/supabase.ts`** — 단일 Supabase 클라이언트 인스턴스입니다. **다른 모든 파일은 여기서만 임포트해야 합니다.** `VITE_SUPABASE_URL` 및 `VITE_SUPABASE_ANON_KEY`로 초기화됩니다.
- **`lib/api.ts`** — 중앙 집중식 Axios 인스턴스입니다. 개발 모드에서는 `baseURL = /api` (Vite로 프록시), 프로덕션에서는 `VITE_API_URL`입니다.
- **`contexts/AuthContext.tsx`** — 전역 인증 상태입니다. 앱 시작 시 `onAuthStateChange`를 한 번 구독합니다. `user`, `isLoggedIn`, `loading`, `logout`을 내보냅니다.
- **`pages/SeveranceFlow.tsx`** — 4단계 마법사: 회사 선택 → 적격성 확인 → 계산 모드 → 결과. PDF 업로드는 먼저 `/api/severance/extract-companies`를 트리거하여 회사 선택기를 표시합니다.
- **`pages/UnemploymentFlow.tsx`** — 실업급여를 위한 병렬 마법사입니다.
- **`pages/auth/callback.tsx`** — OAuth 콜백 핸들러입니다. 인증 코드를 세션으로 교환하고, 성공 시 `/mypage`로 리다이렉트하거나 실패 시 `/login`으로 리다이렉트합니다.
- **`pages/MyPage.tsx`** — 사용자 프로필 (Supabase 프로필에서), 과거 계산 결과 (reports 테이블에서), 문의 이력을 표시합니다.
- **`components/mypage/RetirementWidget.tsx`** — 최신 저장된 계산 결과를 표시하거나 새 계산을 시작하도록 프롬프트합니다.
- **`components/ErrorBoundary.tsx`** — React 렌더링 오류를 캡처하고 폴백 UI를 표시합니다.

### 계산 모드

퇴직금 및 실업급여 흐름 모두 지원:

1. **정밀 계산 (Precise)** — 사용자가 PDF를 업로드합니다. 백엔드는 `pdfplumber`로 파싱하고, 회사별로 근무일을 추출한 후, 전체 28일 블록 알고리즘을 실행합니다.
2. **쉬운 계산 (Simple)** — 사용자가 근무일 수와 평균 일급을 수동으로 입력합니다. 백엔드는 공식을 적용합니다: `퇴직금 = 평균_일급 × 30 × (근무일_수 ÷ 365)`.

## 핵심 구현 패턴

### Supabase 클라이언트 임포트

**중요**: 항상 중앙 클라이언트에서 Supabase를 임포트하세요:

```typescript
import { supabase } from '../lib/supabase'  // ✓ 올바름
// 아님: import { createClient } from '@supabase/supabase-js'  ✗
```

### 인증 상태

`AuthContext`를 통해 전역 인증 상태에 접근하세요:

```typescript
import { useAuth } from '../contexts/AuthContext'
const { user, isLoggedIn, logout } = useAuth()
```

### API 호출

중앙 집중식 Axios 인스턴스를 사용하세요:

```typescript
import { api } from '../lib/api'
const response = await api.post('/severance/precise', { /* payload */ })
```

### 결과 저장

사용자가 계산 결과를 저장할 때, `reports` 테이블에 저장하세요:

```typescript
await supabase.from('reports').insert({
  user_id: user.id,
  title: '회사명 계산 날짜',
  company_name: '회사명',
  payload: {  // SeverancePayload 타입
    severance: number,
    work_days: number,
    average_wage: number,
    eligible: boolean,
    eligibility_message: string,
    qualifying_days: number,
  },
})
```

## 환경 변수

### 프론트엔드 (`frontend/.env.local`)

```
VITE_SUPABASE_URL=https://hmjxrqhcwjyfkvlcejfc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # Supabase 익명 공개 키
VITE_API_URL=  # 개발 모드에서는 비워두기 (Vite 프록시); 프로덕션에서는 백엔드 URL 설정
```

### 백엔드 (`backend/.env`)

```
SUPABASE_URL=https://hmjxrqhcwjyfkvlcejfc.supabase.co
SUPABASE_ANON_KEY=eyJ...
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...  # 선택사항
```

## 배포

### 프론트엔드 → Vercel

- `git push origin main`시 자동 배포
- 빌드 명령어: `cd frontend && npm run build`
- 출력: `frontend/dist`
- 저장소 루트의 `vercel.json`은 모든 비자산 경로를 `/index.html`로 재쓰기하도록 구성 (SPA)
- **Vercel 프로젝트 설정에서 필수 환경 변수**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Supabase 리다이렉트 URL** (설정 → 인증 → URL 구성):
  - `https://coupang-severance-app.vercel.app/**` (모든 경로 허용)
  - `https://coupang-severance-app.vercel.app/auth/callback` (OAuth 세션에 필수)

### 백엔드 → Render

- `git push origin main`시 자동 배포
- 저장소 루트의 `render.yaml`은 Python 3.12, 싱가포르 지역으로 구성
- 시작 명령어: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- **백엔드는** 존재하면 `frontend/dist`를 정적 파일 (`/assets`)로 마운트하여, 같은 서버에서 선택적으로 프론트엔드를 제공할 수 있습니다.

## 테스트 & 유효성 검증

- **테스트 PDF**: `tests/fixtures/`에는 샘플 근로 기록이 있습니다
- **유효성 검증 스크립트**: `python tests/validate_severance_logic.py`는 픽스처에 대해 로직을 검증합니다
- **테스트 PDF 생성**: `python scripts/generate_test_pdfs.py` (`reportlab` 필요)

## 향후 작업을 위한 중요 사항

1. **Notion 동기화**: 코드 변경을 완료한 후 항상 "📋 CATCH 개발 태스크" 데이터베이스의 해당 Notion 개발 작업을 상태 "✅ 완료"로 업데이트하고 구현 노트를 추가하세요. Notion DB 세부 정보는 메모리를 참조하세요.

2. **28일 블록 알고리즘**: 이것이 퇴직금 적격성의 핵심입니다. `backend/app/services/severance.py`에서 이해하세요. 블록은 28일 윈도우입니다. 근무일 ≥8일 (대략 주당 ≥15시간의 4주)이면 적격입니다. 알고리즘은 마지막 근무일부터 역순으로 실행됩니다.

3. **회사 필터링**: PDF 파서는 모든 근무 기록을 추출합니다. `/api/severance/extract-companies` 엔드포인트는 PDF에서 발견된 회사 목록을 반환합니다. 사용자가 회사를 선택하면, 이는 `/api/severance/precise` 호출에 대한 데이터를 필터링합니다.

4. **오류 경계**: 프론트엔드 컴포넌트는 처리되지 않은 React 오류를 캡처하기 위해 `<ErrorBoundary>`로 래핑됩니다. 앱은 비동기 작업에 `LoadingOverlay`를 사용하고 플레이스홀더에 `SkeletonCard`를 사용합니다.

5. **계산 결과 저장**: ReportDetail.tsx는 이제 저장된 `payload` 데이터 (퇴직금 금액, 근무일, 평균 일급, 적격성)를 카드 형식으로 표시합니다. 페이로드는 `types/supabase.ts`의 `SeverancePayload` 타입에 따라 구조화됩니다.
