# 📘 퇴직금 한번에 (CATCH) — 실행·배포·API 가이드

> 로컬 실행, Git 푸시, API 연동, 사용 중인 API/키를 한곳에 정리한 가이드입니다.

---

## 📌 목차

1. [로컬 실행 (터미널 명령어)](#1-로컬-실행-터미널-명령어)
2. [Git 푸시 방법](#2-git-푸시-방법)
2-1. [Vercel 환경 변수 넣는 방법 (단계별)](#2-1-vercel-환경-변수-넣는-방법-단계별)
3. [API 연동 구조](#3-api-연동-구조)
4. [사용 중인 API 및 키/환경 변수](#4-사용-중인-api-및-키환경-변수)
5. [키 관리 및 보안](#5-키-관리-및-보안)
6. [실행 체크리스트](#6-실행-체크리스트)

---

## 1. 로컬 실행 (터미널 명령어)

### 🔹 최초 1회 — 패키지 설치

#### 프론트엔드

```powershell
cd "c:\Users\hun10\OneDrive\바탕 화면\Github\coupang-severance-app\frontend"
npm install
```

#### 백엔드

```powershell
cd "c:\Users\hun10\OneDrive\바탕 화면\Github\coupang-severance-app"
python -m venv backend\.venv
.\backend\.venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

---

### 🔹 서버 실행 (매번)

| 서버 | 터미널 | 명령어 |
|------|--------|--------|
| **백엔드** | 터미널 1 | 아래 블록 실행 |
| **프론트엔드** | 터미널 2 | 아래 블록 실행 |

**터미널 1 — 백엔드 (포트 8000)**

```powershell
cd "c:\Users\hun10\OneDrive\바탕 화면\Github\coupang-severance-app"
.\backend\.venv\Scripts\Activate.ps1
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

**터미널 2 — 프론트엔드 (포트 5173)**

```powershell
cd "c:\Users\hun10\OneDrive\바탕 화면\Github\coupang-severance-app\frontend"
npm run dev
```

---

### 🔹 접속 주소

| 용도 | 주소 |
|------|------|
| 🌐 **앱 (프론트)** | http://localhost:5173 |
| ⚙️ **백엔드 API** | http://localhost:8000 |
| 📄 **API 문서 (Swagger)** | http://localhost:8000/docs |

**종료:** 각 터미널에서 `Ctrl + C`

---

## 2. Git 푸시 방법

```powershell
cd "c:\Users\hun10\OneDrive\바탕 화면\Github\coupang-severance-app"
git status
git add .
git commit -m "작업 내용 요약"
git push origin main
```

> 💡 브랜치 이름이 `main`이 아니면 `main` 부분을 해당 브랜치명으로 바꾸세요.

---

## 2-1. Vercel 환경 변수 넣는 방법 (단계별)

배포된 앱에서 **로그인·마이페이지**가 동작하려면 Vercel에 Supabase 키를 반드시 넣어야 합니다.  
아래 순서대로 **한 단계씩** 진행하세요.

### 1단계: Vercel 대시보드 들어가기

1. 브라우저에서 **https://vercel.com** 접속 후 로그인합니다.
2. 대시보드에서 **coupang-severance-app** 프로젝트를 클릭합니다.
3. 상단 탭에서 **Settings** 를 클릭합니다.

### 2단계: Environment Variables 페이지로 이동

4. 왼쪽 사이드 메뉴에서 **Environment Variables** 를 클릭합니다.  
   (Build and Deployment, Environments 아래에 있습니다.)
5. 화면에 **Environment Variables** 제목과 **Add Environment Variable** / **Link Shared Variable** 버튼이 보이면 올바른 위치입니다.

### 3단계: 첫 번째 변수 — VITE_SUPABASE_URL

6. **Add Environment Variable** 버튼을 클릭합니다.
7. **Name** 입력 칸에 아래를 **그대로** 입력합니다.  
   `VITE_SUPABASE_URL`
8. **Value** 입력 칸에 아래를 **그대로** 붙여넣습니다.  
   `https://hmjxrqhcwjyfkvlcejfc.supabase.co`
9. **Environments** 는 **All (Production, Preview, Development)** 그대로 두거나, 필요하면 **Production** 만 선택합니다.
10. 오른쪽 아래 **Save** 버튼을 클릭합니다.

### 4단계: 두 번째 변수 — VITE_SUPABASE_ANON_KEY

11. 다시 **Add Environment Variable** 버튼을 클릭합니다.
12. **Name** 입력 칸에 아래를 **그대로** 입력합니다.  
   `VITE_SUPABASE_ANON_KEY`
13. **Value** 입력 칸에 **본인이 쓰는 anon public 키 전체**를 붙여넣습니다.  
    (예: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` 로 시작하는 긴 문자열)
14. **Save** 버튼을 클릭합니다.

### 5단계: 적용을 위한 재배포

15. 상단 탭에서 **Deployments** 를 클릭합니다.
16. 가장 위에 있는 배포(맨 위 행) 오른쪽 **⋯(점 세 개)** 메뉴를 클릭합니다.
17. **Redeploy** 를 클릭합니다.
18. 확인 창이 나오면 **Redeploy** 를 한 번 더 클릭합니다.
19. 빌드가 끝날 때까지 기다린 뒤, 배포된 URL로 접속해 로그인/마이페이지가 되는지 확인합니다.

---

**정리:**  
- **Settings** → **Environment Variables** → **Add Environment Variable**  
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 두 개 추가 후 **Save**  
- **Deployments** → 맨 위 배포 **⋯** → **Redeploy**

---

## 3. API 연동 구조

```
┌─────────────┐      /api/*       ┌─────────────┐      REST API      ┌─────────────┐
│   프론트엔드  │  ──────────────►  │   백엔드     │  ──────────────►  │  Supabase   │
│  (React)    │   localhost:8000  │  (FastAPI)   │   click_counter   │   (DB)      │
└─────────────┘                   └─────────────┘                   └─────────────┘
```

| 구간 | 설명 |
|------|------|
| **프론트 → 백엔드** | 로컬: `baseURL = '/api'` → Vite가 `localhost:8000`으로 프록시. 배포 시 `VITE_API_URL`로 백엔드 주소 지정. |
| **백엔드 → Supabase** | 카운터(클릭 수) 저장. `SUPABASE_URL` + `SUPABASE_ANON_KEY`로 REST API 호출. |

---

## 4. 사용 중인 API 및 키/환경 변수

### 🔹 Supabase (백엔드 전용 — 클릭 카운터 저장)

| 환경 변수 | 용도 | 설정 위치 | 값 확인 위치 |
|-----------|------|------------|--------------|
| `SUPABASE_URL` | Supabase 프로젝트 URL | `backend/.env` | Supabase → Settings → General → **Project URL** |
| `SUPABASE_ANON_KEY` | API 인증용 anon 공개 키 | `backend/.env` | Supabase → Settings → **API Keys** → Legacy → **anon public** |

**Supabase 테이블:** `click_counter` (id=1 한 행, `total_cnt`, `severance_cnt`, `unemployment_cnt`)

---

### 🔹 프론트엔드 API 주소 (배포 시)

| 환경 변수 | 용도 | 설정 위치 | 비고 |
|-----------|------|------------|------|
| `VITE_API_URL` | 배포 환경에서 백엔드 서버 주소 | `frontend/.env` | 로컬은 비워두면 `/api`(프록시) 사용. 예: `https://xxx.onrender.com/api` |

---

### 🔹 외부 공개 API

| 종류 | 사용 여부 |
|------|-----------|
| 퇴직금/실업급여 계산 | ❌ 없음 (자체 백엔드 로직만 사용) |
| 클릭 카운터 저장 | ✅ **Supabase** (위 환경 변수로 연동) |

---

## 5. 키 관리 및 보안

- ⛔ **Git에 올리지 말 것:** `backend/.env`, `frontend/.env` (이미 `.gitignore`에 포함됨)
- 🔑 **실제 키 값:** 이 문서에는 변수 이름만 기재. 값은 Supabase 대시보드에서 복사해 각 `.env`에 입력
- ☁️ **배포 시:** Render, Vercel 등 해당 서비스의 **Environment**에 위 환경 변수 이름·값을 동일하게 설정

---

## 6. 실행 체크리스트

- [ ] `backend/.env` 에 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 설정
- [ ] 로컬 실행: 백엔드 터미널 → uvicorn 실행, 프론트 터미널 → `npm run dev`
- [ ] 배포 시: 백엔드 서버에 `SUPABASE_*` 설정, 프론트에 `VITE_API_URL` 설정 후 빌드
- [ ] **Vercel:** Settings → Environment Variables 에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가 후 Redeploy (자세한 단계는 [2-1](#2-1-vercel-환경-변수-넣는-방법-단계별) 참고)
- [ ] 푸시: `git add` → `commit` → `push origin main`

---

*마지막 업데이트: 프로젝트 기준*
