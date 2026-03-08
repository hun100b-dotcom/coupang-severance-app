#!/usr/bin/env bash
# 퇴직금 한번에 — React+FastAPI 실행 스크립트
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "  퇴직금 한번에  v2.0  (React + FastAPI)"
echo "============================================"

# ── 백엔드 의존성 설치 ──────────────────────────
echo ""
echo "[1/3] 백엔드 의존성 설치 중..."
if [ ! -d "$ROOT/backend/.venv" ]; then
  python3 -m venv "$ROOT/backend/.venv"
fi
source "$ROOT/backend/.venv/bin/activate"
pip install -q -r "$ROOT/backend/requirements.txt"

# ── 프론트엔드 의존성 설치 ─────────────────────
echo ""
echo "[2/3] 프론트엔드 의존성 설치 중..."
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  npm install --legacy-peer-deps
fi

# ── 동시 실행 ──────────────────────────────────
echo ""
echo "[3/3] 서버 시작 중..."
echo "  백엔드  → http://localhost:8000"
echo "  프론트  → http://localhost:5173"
echo ""

# 백엔드 백그라운드
cd "$ROOT"
source "$ROOT/backend/.venv/bin/activate"
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 프론트엔드 포그라운드
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo "  ✓ 백엔드  PID: $BACKEND_PID"
echo "  ✓ 프론트  PID: $FRONTEND_PID"
echo ""
echo "  브라우저에서 http://localhost:5173 을 열어주세요"
echo "  종료하려면 Ctrl+C"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
