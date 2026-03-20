# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**CATCH (퇴직금 한번에)** — A severance pay and unemployment benefit calculator for daily-wage workers (일용직) in Korea, primarily targeting 쿠팡, 마켓컬리, CJ대한통운 employees. Users upload a 근로복지공단 일용근로내역서 (employment record PDF) or manually enter work days, and the app calculates eligible severance/unemployment benefits based on Korean labor law.

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS, deployed on Vercel
- **Backend**: FastAPI (Python 3.12), deployed on Render (Singapore)
- **Database**: Supabase Postgres — stores click counters, user inquiries, and user profiles
- **Auth**: Supabase OAuth (Kakao + Google) — managed entirely frontend-side via `@supabase/supabase-js`

## Development Commands

### Backend Setup (First Time)

```powershell
cd coupang-severance-app
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### Backend Dev Server

```powershell
# Terminal 1
.\backend\.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Access: `http://localhost:8000` | Swagger API docs: `http://localhost:8000/docs`

### Frontend Setup & Dev

```powershell
# Terminal 2
cd frontend
npm install
npm run dev
```

Access: `http://localhost:5173`

**Note**: Vite automatically proxies `/api/*` → `http://localhost:8000` in dev mode.

### Frontend Build

```powershell
cd frontend
npm run build  # Runs: tsc -b && vite build → output in frontend/dist
```

### Validation Tests

```powershell
.\backend\.venv\Scripts\Activate.ps1
python tests\validate_severance_logic.py  # Test logic against fixtures
```

## High-Level Architecture

### Request Flow

```
Browser (React SPA)
  │
  ├─ /api/* (Vite proxy in dev, VITE_API_URL env in prod)
  │       │
  │       └─► FastAPI Backend (port 8000)
  │               ├─ /api/severance/*     — PDF parse, precision calculation
  │               ├─ /api/unemployment/*  — Unemployment eligibility
  │               ├─ /api/click-count     — Visit counter
  │               └─ /api/inquiry/notify  — Discord webhook (1:1 inquiries)
  │
  └─ Supabase (frontend directly)
          ├─ Auth: OAuth via signInWithOAuth, session via onAuthStateChange
          ├─ profiles: User profile (joined_at, marketing_agreement)
          ├─ reports: Saved calculation results (id, user_id, title, company_name, payload)
          └─ inquiries: 1:1 customer inquiries (created_at, message, status)
```

### Key Modules

#### Backend (`backend/app/`)

- **`services/pdf.py`** — Parses 근로복지공단 일용근로내역서 PDFs using `pdfplumber`. Handles multi-page tables, repeated headers, and 4 date formats. `COMPANY_KEYWORDS` dict maps canonical names to known variants (쿠팡, 마켓컬리, etc.).
- **`services/severance.py`** — Core severance eligibility logic. Uses **28-day reverse-block algorithm**: from last work date, divides employment into 28-day blocks; a block qualifies if ≥8 work days (≡ 4-week average ≥15 hrs/week). Eligible if `qualifying_days ≥ 365`. Also detects 3-month employment gaps to split into separate segments.
- **`services/unemployment.py`** — Unemployment eligibility: checks insured days in last 18 months ≥ 180.
- **`services/counter.py`** — Click counter backed by Supabase `click_counter` table. Falls back to `data/click_count.json` if Supabase is unavailable.
- **`services/notify.py`** — Sends Discord webhook notification when a user submits a 1:1 inquiry. Silently suppresses errors.
- **`api/severance.py`, `api/unemployment.py`** — HTTP endpoints for calculation. Two modes each:
  - **정밀 계산 (Precise)**: User uploads PDF → backend parses, filters by company, runs full algorithm
  - **쉬운 계산 (Simple)**: User enters work days + average wage → backend applies formula directly

#### Frontend (`frontend/src/`)

- **`lib/supabase.ts`** — Single Supabase client instance. **All other files must import from here only.** Initialized with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- **`lib/api.ts`** — Centralized Axios instance. `baseURL = /api` in dev (proxied by Vite) and `VITE_API_URL` in production.
- **`contexts/AuthContext.tsx`** — Global auth state. Subscribes to `onAuthStateChange` once at app startup. Exports `user`, `isLoggedIn`, `loading`, `logout`.
- **`pages/SeveranceFlow.tsx`** — 4-step wizard: company selection → eligibility check → calculation mode → results. PDF upload triggers `/api/severance/extract-companies` first to show company selector.
- **`pages/UnemploymentFlow.tsx`** — Parallel wizard for unemployment benefits.
- **`pages/auth/callback.tsx`** — OAuth callback handler. Exchanges auth code for session, redirects to `/mypage` on success or `/login` on failure.
- **`pages/MyPage.tsx`** — Shows user profile (from Supabase profile), past calculation results (from reports table), and inquiries history.
- **`components/mypage/RetirementWidget.tsx`** — Displays latest saved calculation result or prompt to start a new calculation.
- **`components/ErrorBoundary.tsx`** — Catches React render errors and displays fallback UI.

### Calculation Modes

Both severance and unemployment flows support:

1. **정밀 계산 (Precise)** — User uploads PDF. Backend parses it with `pdfplumber`, extracts work dates by company, runs full 28-day block algorithm.
2. **쉬운 계산 (Simple)** — User manually enters total work days and average daily wage. Backend applies the formula: `severance = average_wage × 30 × (work_days ÷ 365)`.

## Key Implementation Patterns

### Supabase Client Import

**CRITICAL**: Always import Supabase from the central client:

```typescript
import { supabase } from '../lib/supabase'  // ✓ Correct
// NOT: import { createClient } from '@supabase/supabase-js'  ✗
```

### Authentication State

Access global auth state via `AuthContext`:

```typescript
import { useAuth } from '../contexts/AuthContext'
const { user, isLoggedIn, logout } = useAuth()
```

### API Calls

Use centralized Axios instance:

```typescript
import { api } from '../lib/api'
const response = await api.post('/severance/precise', { /* payload */ })
```

### Result Storage

When a user saves a calculation result, store it in the `reports` table with:

```typescript
await supabase.from('reports').insert({
  user_id: user.id,
  title: 'Company Name Calculation Date',
  company_name: 'Company Name',
  payload: {  // SeverancePayload type
    severance: number,
    work_days: number,
    average_wage: number,
    eligible: boolean,
    eligibility_message: string,
    qualifying_days: number,
  },
})
```

## Environment Variables

### Frontend (`frontend/.env.local`)

```
VITE_SUPABASE_URL=https://hmjxrqhcwjyfkvlcejfc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # Supabase anon public key
VITE_API_URL=  # Leave empty in dev (Vite proxies); set to backend URL in production
```

### Backend (`backend/.env`)

```
SUPABASE_URL=https://hmjxrqhcwjyfkvlcejfc.supabase.co
SUPABASE_ANON_KEY=eyJ...
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...  # Optional
```

## Deployment

### Frontend → Vercel

- Automatic deployment on `git push origin main`
- Build command: `cd frontend && npm run build`
- Output: `frontend/dist`
- `vercel.json` at repo root configures rewrite of all non-asset routes to `/index.html` (SPA)
- **Required env vars in Vercel project settings**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Supabase redirect URLs** (Settings → Authentication → URL Configuration):
  - `https://coupang-severance-app.vercel.app/**` (allow all paths)
  - `https://coupang-severance-app.vercel.app/auth/callback` (required for OAuth session)

### Backend → Render

- Automatic deployment on `git push origin main`
- `render.yaml` at repo root configures Python 3.12, Singapore region
- Start command: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- **Backend also mounts** `frontend/dist` as static files (`/assets`) if it exists, enabling the same server to optionally serve the frontend.

## Testing & Validation

- **Test PDFs**: `tests/fixtures/` contains sample employment records
- **Validation script**: `python tests/validate_severance_logic.py` validates logic against fixtures
- **Generate test PDFs**: `python scripts/generate_test_pdfs.py` (requires `reportlab`)

## Important Notes for Future Work

1. **Notion Sync**: After completing code changes, always update the corresponding Notion development task in the "📋 CATCH 개발 태스크" database with status "✅ 완료" and implementation notes. See memory for Notion DB details.

2. **28-Day Block Algorithm**: This is the core of severance eligibility. Understand it in `backend/app/services/severance.py`. A block is a 28-day window; it qualifies if ≥8 work days (roughly 4 weeks at ≥15 hrs/week). The algorithm runs backward from the last work date.

3. **Company Filtering**: The PDF parser extracts all work records. The `/api/severance/extract-companies` endpoint returns a list of companies found in the PDF. Users select a company, which then filters the data for the `/api/severance/precise` call.

4. **Error Boundaries**: Frontend components are wrapped in `<ErrorBoundary>` to catch unhandled React errors. The app uses `LoadingOverlay` for async operations and `SkeletonCard` for placeholders.

5. **Calculation Results Storage**: ReportDetail.tsx now displays saved `payload` data (severance amount, work days, average wage, eligibility) in card format. The payload is structured per `SeverancePayload` type in `types/supabase.ts`.
