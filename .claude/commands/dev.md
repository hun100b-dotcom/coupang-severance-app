개발 서버를 시작하는 방법을 안내해줘:

## 백엔드 서버 (FastAPI)

```powershell
.\backend\.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

Swagger: http://localhost:8000/docs

## 프론트엔드 서버 (Vite)

```powershell
cd frontend
npm run dev
```

URL: http://localhost:5173

**참조**: [개발 환경 상세 가이드](../../docs/development.md)
