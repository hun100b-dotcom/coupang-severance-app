# Vercel + Render 무료 배포 가이드

이 프로젝트는 **프론트엔드(React)** 와 **백엔드(FastAPI)** 로 나뉘어 있습니다.  
Vercel은 프론트엔드 배포에, Render는 백엔드 API 무료 호스팅에 사용합니다.

---

## 1단계: 백엔드 API 배포 (Render, 무료)

1. **Render 가입**  
   [render.com](https://render.com) → Sign Up (GitHub 연동 권장).

2. **새 Web Service 생성**  
   - Dashboard → **New** → **Web Service**
   - 저장소 연결: 이 프로젝트가 있는 GitHub 레포 선택 후 연결.

3. **설정**
   - **Name**: `coupang-severance-api` (원하는 이름 가능)
   - **Region**: Singapore 또는 가까운 지역
   - **Branch**: `main` (기본)
   - **Runtime**: **Python 3**
   - **Build Command**:  
     `pip install -r backend/requirements.txt`
   - **Start Command**:  
     `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
   - **Root Directory**: 비워두기 (레포 루트 기준)

4. **생성**  
   **Create Web Service** 클릭 후 빌드·배포 완료될 때까지 대기.

5. **백엔드 URL 확인**  
   배포 후 상단에 표시되는 URL 복사 (예: `https://coupang-severance-api.onrender.com`).  
   API 기준 주소는 **`https://<서비스이름>.onrender.com/api`** 입니다.

> ⚠️ Render 무료 티어는 약 15분 미사용 시 슬립됩니다. 첫 요청 시 콜드 스타트로 30초~1분 정도 걸릴 수 있습니다.

---

## 2단계: 프론트엔드 배포 (Vercel, 무료)

1. **Vercel 가입**  
   [vercel.com](https://vercel.com) → Sign Up (GitHub 연동 권장).

2. **프로젝트 임포트**  
   - Dashboard → **Add New** → **Project**
   - 이 프로젝트 GitHub 레포 선택 → **Import**

3. **빌드 설정 (이미 vercel.json에 반영됨)**
   - **Build Command**: `cd frontend && npm ci && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: 없음 (빌드 명령에서 `npm ci` 실행)

4. **환경 변수 설정**  
   Project → **Settings** → **Environment Variables** 에서 추가:

   | Name            | Value                                      |
   |-----------------|--------------------------------------------|
   | `VITE_API_URL`  | `https://<당신의-Render-URL>/api`          |

   예: Render URL이 `https://coupang-severance-api.onrender.com` 이면  
   `VITE_API_URL` = `https://coupang-severance-api.onrender.com/api`

   - **Environment**: Production, Preview, Development 모두 체크 권장.

5. **배포**  
   **Deploy** 클릭. 빌드가 끝나면 Vercel URL(예: `https://프로젝트이름.vercel.app`)에서 프론트엔드 접속 가능.

---

## 3단계: 동작 확인

1. Vercel URL로 접속해 화면이 뜨는지 확인.
2. 회사 선택 → 퇴직금/실업급여 계산 등 API를 쓰는 기능이 정상 동작하는지 확인.
3. 문제가 있으면 브라우저 개발자 도구(F12) → Network 탭에서 `/api` 요청이 Render URL로 가는지 확인.

---

## 요약

| 구분       | 서비스 | URL 예시                          |
|------------|--------|-----------------------------------|
| 프론트엔드 | Vercel | `https://xxx.vercel.app`          |
| 백엔드 API | Render | `https://xxx.onrender.com/api`    |

프론트엔드에서 `VITE_API_URL` 로 설정한 주소로 API 요청이 전달되므로, 두 URL이 위와 같이 분리되어 있으면 됩니다.

---

## (선택) Render 대신 다른 백엔드 호스팅

- **Railway**: [railway.app](https://railway.app) — 무료 크레딧 후 유료 전환 가능.
- **Fly.io**: [fly.io](https://fly.io) — 소규모 앱 무료 티어.
- **PythonAnywhere**: 웹 앱 1개 무료.

어디에 배포하든 **Start Command** 는 다음 형태로 맞추면 됩니다.  
`uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`  
(일부 서비스는 `PORT` 대신 다른 환경 변수명을 쓰므로, 해당 서비스 문서 확인.)

배포 후 나온 백엔드 URL의 `/api` 까지 포함한 값을 Vercel의 `VITE_API_URL` 에 넣으면 됩니다.
