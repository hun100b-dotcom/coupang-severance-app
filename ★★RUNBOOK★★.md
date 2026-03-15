# 📘 퇴직금 한번에 (CATCH) — 실행·배포·API 가이드

> 로컬 실행, Git 푸시, API 연동, 사용 중인 API/키를 한곳에 정리한 가이드입니다.

---

## 📌 목차

1. [로컬 실행 (터미널 명령어)](#1-로컬-실행-터미널-명령어)
2. [Git 푸시 방법](#2-git-푸시-방법)
2-1. [Vercel 환경 변수 넣는 방법 (단계별)](#2-1-vercel-환경-변수-넣는-방법-단계별)
2-2. [카카오/구글 로그인 오류 해결 (redirect_uri_mismatch, KOE205)](#2-2-카카오구글-로그인-오류-해결-redirect_uri_mismatch-koe205)
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

### 6단계 (배포 도메인 사용 시): Supabase 리다이렉트 URL 등록

로그인(카카오/구글)을 **배포된 사이트**에서 쓰려면 Supabase에 배포 URL을 등록해야 합니다.

1. **Supabase 대시보드** → 프로젝트 선택 → **Authentication** → **URL Configuration**
2. **Site URL** 에 배포 주소 입력 (예: `https://coupang-severance-app.vercel.app`)
3. **Redirect URLs** 에 아래를 **추가** (기존 로컬 주소는 그대로 두고):
   - `https://coupang-severance-app.vercel.app/**`
   - `https://coupang-severance-app.vercel.app/auth/callback`  ← **소셜 로그인 후 세션 처리용 (필수)**
   - `https://coupang-severance-app.vercel.app/mypage`
4. **Save** 클릭

> 앱은 **getURL()** 로 현재 주소(로컬/배포)를 자동 인식하고, 로그인 후 **/auth/callback** 에서 세션을 잡은 뒤 마이페이지로 보냅니다. Redirect URLs에 **/auth/callback** 이 없으면 로그인이 완료돼도 세션이 안 잡힐 수 있습니다.  
> 로컬만 쓸 때는 `http://localhost:5173` / `http://localhost:5173/auth/callback` / `http://localhost:5173/mypage` 를 등록하세요.

---

## 2-2. 카카오/구글 로그인 오류 해결 (redirect_uri_mismatch, KOE205)

**증상:** 구글 로그인 시 "400 오류: redirect_uri_mismatch", 카카오 로그인 시 "잘못된 요청 (KOE205)" 이 나오는 경우.

**원인:** OAuth는 **우리 앱 → 구글/카카오 → Supabase 콜백 → 우리 앱** 순서로 동작합니다. 구글/카카오 쪽에 **Supabase가 받을 콜백 주소**를 등록해 두어야 합니다. (우리 앱 주소가 아님.)

### Supabase 콜백 URL (여기 주소를 구글·카카오에 등록)

이 프로젝트의 Supabase URL이 `https://hmjxrqhcwjyfkvlcejfc.supabase.co` 이므로, 콜백 주소는 아래 하나입니다.

```
https://hmjxrqhcwjyfkvlcejfc.supabase.co/auth/v1/callback
```

---

### 구글 (400 redirect_uri_mismatch) 수정 방법

1. **Google Cloud Console** 접속 → [https://console.cloud.google.com](https://console.cloud.google.com)
2. 프로젝트 선택 후 **APIs & Services** → **Credentials** (사용자 인증 정보)
3. **OAuth 2.0 Client IDs** 목록에서 Supabase 로그인에 쓰는 **Web application** 클라이언트 클릭
4. **Authorized redirect URIs** (승인된 리디렉션 URI)에 아래를 **정확히** 추가:
   - `https://hmjxrqhcwjyfkvlcejfc.supabase.co/auth/v1/callback`
5. **Save** 클릭 후 1~2분 정도 기다린 뒤 다시 로그인 시도

> 로컬 테스트용이라면 `http://localhost:5173` 이 아니라 위 Supabase 콜백 URL만 추가하면 됩니다. (Supabase가 로컬/배포 구분을 처리합니다.)

---

### 카카오 (KOE205) 수정 방법

1. **Kakao Developers** 접속 → [https://developers.kakao.com](https://developers.kakao.com) → 로그인
2. **내 애플리케이션** → CATCH(또는 해당 앱) 선택
3. **앱 설정** → **플랫폼** → **Web** 플랫폼이 있는지 확인 (없으면 **Web** 추가)
4. **Web** 플랫폼의 **Redirect URI** 란에 아래를 **정확히** 추가:
   - `https://hmjxrqhcwjyfkvlcejfc.supabase.co/auth/v1/callback`
5. **저장** 클릭 후 다시 로그인 시도

---

### 체크리스트 요약

| 위치 | 등록할 URL |
|------|------------|
| **Supabase** (Authentication → URL Configuration) | Site URL·Redirect URLs에 **우리 앱 주소** (예: `https://coupang-severance-app.vercel.app`, `.../mypage`) |
| **Google Cloud Console** (OAuth 클라이언트) | Authorized redirect URIs에 **Supabase 콜백** `https://hmjxrqhcwjyfkvlcejfc.supabase.co/auth/v1/callback` |
| **Kakao Developers** (Web 플랫폼) | Redirect URI에 **Supabase 콜백** `https://hmjxrqhcwjyfkvlcejfc.supabase.co/auth/v1/callback` |

---

### ⚠️ 구글 "401 disabled_client" (OAuth 클라이언트가 비활성화됨)

**증상:** "액세스 차단됨: 승인 오류", "The OAuth client was disabled.", **401 오류: disabled_client**

**원인:** Google Cloud Console에서 사용 중인 **OAuth 2.0 클라이언트가 꺼져 있음**.

**해결 (순서대로):**

1. [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services** → **Credentials**
2. **OAuth 2.0 Client IDs** 목록에서 CATCH/ Supabase 로그인에 쓰는 **Web client** 클릭
3. 상단 또는 상세 화면에서 **상태**가 "사용 중지됨"이면 **사용 설정** / **Enable** 버튼 클릭
4. **저장** 후 1~2분 뒤 다시 로그인 시도

> 클라이언트를 실수로 삭제했다면, 동일한 프로젝트에서 **새 OAuth 클라이언트 ID(웹 애플리케이션)** 를 만들고, Redirect URI에 Supabase 콜백 URL을 넣은 뒤, Supabase **Authentication → Providers → Google** 에 새 Client ID / Client Secret 을 다시 등록해야 합니다.

---

### ⚠️ 카카오 "KOE006" (앱 관리자 설정 오류)

**증상:** "앱 관리자 설정 오류 (KOE006)", "CATCH 서비스 설정에 오류가 있어, 이용할 수 없습니다."

**원인:** Kakao Developers 앱 설정·플랫폼·동의항목·앱 상태 중 하나가 맞지 않음.

**해결 (아래를 하나씩 확인):**

1. **Redirect URI 정확히 일치**
   - [Kakao Developers](https://developers.kakao.com) → **내 애플리케이션** → 해당 앱 → **앱 설정** → **플랫폼** → **Web**
   - **Redirect URI**에 **아래만** 정확히 등록되어 있는지 확인 (공백/슬래시 하나라도 다르면 오류):
     - `https://hmjxrqhcwjyfkvlcejfc.supabase.co/auth/v1/callback`
   - 다른 테스트용 URL이 필요하면 그때만 추가하고, 위 Supabase 콜백은 반드시 포함

2. **동의 항목**
   - **제품 설정** → **카카오 로그인** → **동의 항목**
   - Supabase/앱에서 쓰는 항목(**닉네임, 프로필 사진** 등)이 **비활성**이면 **필수 동의** 또는 **선택 동의**로 설정 후 저장

3. **앱 키와 Supabase 일치**
   - **앱 설정** → **앱 키** 에서 **REST API 키** 확인
   - Supabase **Authentication** → **Providers** → **Kakao** 에 넣은 **Client ID**(앱 키) / **Client Secret**(REST API 키 또는 해당 시크릿) 이 이 앱과 동일한지 확인

4. **앱 상태(개발/활성)**
   - **앱 설정** → **앱 상태**가 **개발중**이면, **제품 설정** → **카카오 로그인** → **동의 항목** 등에서 사용할 수 있는지, 또는 **앱 실행 환경**을 **운영**으로 전환해야 하는지 확인 (카카오 정책에 따라 개발중 앱은 제한이 있을 수 있음)

5. **다른 오류가 계속되면**
   - Kakao Developers 고객센터 또는 [개발자 문서](https://developers.kakao.com)에서 "KOE006" 검색 후 최신 안내 확인

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
