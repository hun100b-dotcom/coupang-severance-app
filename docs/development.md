# 개발 환경 설정 및 명령어

> 원본: CLAUDE.md 16-62줄 (47줄) — 데이터 무결성 100% 보장

---

## 백엔드 (처음 실행)

```powershell
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

## 백엔드 개발 서버

```powershell
.\backend\.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger 문서: `http://localhost:8000/docs`

## 프론트엔드

```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173 (Vite가 /api/* → :8000 자동 프록시)
npm run build    # tsc -b && vite build → frontend/dist
```

## 유효성 검증 테스트

```powershell
.\backend\.venv\Scripts\Activate.ps1
python tests\validate_severance_logic.py
```

## E2E 테스트 (Playwright)

```powershell
cd frontend
npx playwright test              # 전체 실행 (headless)
npx playwright test --ui         # UI 모드 (대화형)
npx playwright test e2e/foo.spec.ts  # 단일 파일 실행
npx playwright show-report       # 마지막 결과 리포트
```

테스트 파일: `frontend/e2e/` 디렉토리. 설정: `frontend/playwright.config.ts` (baseURL: http://localhost:5173, Chromium만 사용).

---

**참조**: [CLAUDE.md](../CLAUDE.md) | [아키텍처](./architecture.md) | [환경변수](./environment.md)
