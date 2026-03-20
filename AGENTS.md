# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**CATCH (퇴직금 한번에)** — A severance pay and unemployment benefit calculator for daily-wage workers (일용직) in Korea, targeting 쿠팡, 마켓컬리, CJ대한통운 employees.

- **Frontend**: React + TypeScript + Vite + Tailwind, deployed to Vercel
- **Backend**: FastAPI (Python), deployed to Render (Singapore region)
- **Database**: Supabase (Postgres) — used only for click counter and user auth (inquiries)
- **Auth**: Supabase OAuth (Kakao + Google), managed entirely on the frontend via `@supabase/supabase-js`

## Development Commands

### Backend setup (first time)

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### Backend dev server (port 8000)

```powershell
.\backend\.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger docs: http://localhost:8000/docs

### Frontend setup (first time)

```powershell
cd frontend
npm install
```

### Frontend dev server (port 5173)

```powershell
cd frontend
npm run dev
```

Vite proxies `/api/*` → `http://localhost:8000` automatically in dev mode (`vite.config.ts`).

### Frontend build

```powershell
cd frontend
npm run build   # runs: tsc -b && vite build → output in frontend/dist
```

### Run both servers at once (Linux/macOS)

```bash
bash start.sh
```

### Logic validation (runs against test PDFs in tests/fixtures/)

```powershell
.\backend\.venv\Scripts\Activate.ps1
python tests\validate_severance_logic.py
```

### Generate test PDFs

```powershell
pip install reportlab
python scripts\generate_test_pdfs.py                # 4 basic PDFs
python scripts\generate_eligibility_test_pdfs.py    # 24 eligibility-boundary PDFs
```

## Architecture

### Request flow

```
Browser (React SPA)
  │
  ├─ /api/* (Vite proxy in dev, VITE_API_URL in prod)
  │       │
  │       └─► FastAPI (backend/app/main.py)
  │               ├─ /api/severance/*    — severance endpoints (api/severance.py)
  │               ├─ /api/unemployment/* — unemployment endpoints (api/unemployment.py)
  │               ├─ /api/click-count, /api/click/:service  — counter (api/common.py)
  │               └─ /api/inquiry/notify — Discord webhook notification (api/notify.py)
  │
  └─ Supabase (frontend only)
          ├─ Auth: Kakao/Google OAuth, session state via AuthContext
          └─ inquiries table: 1:1 customer inquiry storage
```

### Backend module responsibilities

- `backend/app/services/pdf.py` — Parses 근로복지공단 일용근로내역서 PDFs using `pdfplumber`. Handles multiple date formats, multi-page tables, and repeated header rows. `COMPANY_KEYWORDS` dict maps canonical company names to their known legal name variants.
- `backend/app/services/severance.py` — Core severance eligibility logic. Uses **28-day reverse-block algorithm**: starting from the last work date, divides employment into 28-day blocks; a block qualifies if ≥8 work days (≡ 4-week avg ≥15 hrs/week). `qualifying_days ≥ 365` → eligible. Also handles 3-month gap detection to split into separate employment segments.
- `backend/app/services/unemployment.py` — Unemployment benefit eligibility: checks if insured days within last 18 months ≥ 180.
- `backend/app/services/counter.py` — Click counter backed by Supabase `click_counter` table (single row, id=1). Falls back to `data/click_count.json` on Supabase failure.
- `backend/app/services/notify.py` — Sends Discord Webhook notification when a user submits a 1:1 inquiry. Silently swallows errors.

### Frontend module responsibilities

- `src/lib/api.ts` — All Axios calls to the backend. `baseURL` is `/api` in dev (proxied) and `VITE_API_URL` in production.
- `src/lib/supabase.ts` — Single Supabase client instance. **All other files must import from here only.**
- `src/contexts/AuthContext.tsx` — Global auth state via `onAuthStateChange`. Provides `user`, `isLoggedIn`, `loading`, `logout`.
- `src/pages/SeveranceFlow.tsx` — 4-step wizard (회사 선택 → 자격 확인 → 계산 방식 → 결과). PDF upload triggers `/api/severance/extract-companies` first to show a company chip selector before the actual `/api/severance/precise` call.
- `src/pages/UnemploymentFlow.tsx` — Parallel wizard for unemployment benefit calculation.
- `src/pages/auth/callback.tsx` — OAuth callback: exchanges code for session, redirects to `/mypage` on success or `/login` on failure.
- `src/utils/supabase/` — Supabase helper utilities (inquiry CRUD etc.)

### Calculation modes

Both severance and unemployment flows have two modes:
- **정밀 계산 (Precise)**: User uploads a PDF (근로복지공단 일용근로내역서). Backend parses it, filters by company, and runs the full algorithm.
- **쉬운 계산 (Simple)**: User manually inputs work days + average daily wage. Backend applies the formula directly with no PDF parsing.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon public key |
| `DISCORD_WEBHOOK_URL` | (Optional) Discord webhook for inquiry notifications |

### Frontend (`frontend/.env.local`)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase URL for browser client |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key for browser client |
| `VITE_API_URL` | Backend base URL in production (e.g. `https://xxx.onrender.com/api`). Leave empty in dev to use Vite proxy. |

See `frontend/.env.example` for a template.

## Deployment

- **Frontend → Vercel**: `vercel.json` at repo root. Build: `cd frontend && npm run build`. Output: `frontend/dist`. All non-asset routes rewrite to `/index.html` for SPA routing.
- **Backend → Render**: `render.yaml` at repo root. Python 3.12, Singapore region. Start: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`.

The backend's `main.py` also mounts `frontend/dist` as static files (`/assets`), so the FastAPI server can optionally serve the React SPA when `frontend/dist` exists.

## OAuth Configuration Notes

OAuth login (Kakao/Google) flows through **Supabase as the OAuth middleware**:

1. Frontend calls `supabase.auth.signInWithOAuth({ redirectTo: AUTH_CALLBACK_URL })`
2. Provider redirects to Supabase: `https://<project>.supabase.co/auth/v1/callback`
3. Supabase redirects to `https://coupang-severance-app.vercel.app/auth/callback`
4. `pages/auth/callback.tsx` calls `exchangeCodeForSession`, then navigates to `/mypage`

The provider OAuth apps (Google Cloud Console, Kakao Developers) must have the **Supabase callback URL** (`https://<project>.supabase.co/auth/v1/callback`) registered as an authorized redirect URI — **not** the app's own domain. Supabase's URL Configuration must have the app domain in its Redirect URLs list.
