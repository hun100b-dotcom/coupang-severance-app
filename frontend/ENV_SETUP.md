# 환경 변수 설정 가이드 (.env / .env.local)

프론트엔드(Vite)에서 **Supabase** 로그인·DB를 쓰려면 아래 값들을 설정해야 합니다.  
코딩 초심자도 따라 할 수 있도록 단계별로 적었어요.

---

## 지금 할 일 (체크리스트)

1. **환경 변수**  
   - `frontend` 폴더에 `.env` 또는 `.env.local` 파일 만들기  
   - Supabase 대시보드 → **Settings → API** 에서 **Project URL**, **anon public** 키 복사  
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 에 붙여넣기  
   - 저장 후 터미널에서 `npm run dev` 다시 실행

2. **Supabase 테이블**  
   - Supabase 대시보드 → **SQL Editor** 열기  
   - 이 폴더의 **`supabase-tables.sql`** 파일 내용 전체 복사 후 실행  
   - `profiles`, `reports` 테이블과 RLS 정책이 한 번에 생성됨

3. **OAuth (선택)**  
   - **Authentication → Providers** 에서 Google / Kakao 사용 설정  
   - **Authentication → URL Configuration** 에서 Redirect URLs 에 `http://localhost:5173/mypage` 추가

---

## 1. 어떤 파일을 만들면 되나요?

- 프로젝트 루트가 아니라 **`frontend` 폴더 안**에 만듭니다.
- 파일 이름: **`.env`** 또는 **`.env.local`** (둘 중 하나만 있으면 됩니다.)
- 경로 예시: `coupang-severance-app/frontend/.env`

> `.env.local`은 보통 Git에 올리지 않고, 로컬에서만 쓰는 비밀 값용입니다.  
> 팀과 공유할 기본값만 넣을 때는 `.env`를 쓰고, 실제 비밀 키는 `.env.local`에 넣는 방식을 추천합니다.

---

## 2. 넣어야 할 변수들

`frontend/.env` 또는 `frontend/.env.local` 파일을 열고(없으면 새로 만들고) 아래 내용을 **그대로 복사**한 뒤, `=` 오른쪽에 본인 값으로 바꿔주세요.

```env
# ===== Supabase (필수: 로그인·마이페이지·리포트·프로필) =====
# Supabase 대시보드 → Settings → API 에서 확인할 수 있어요.

# Project URL (프로젝트 주소)
VITE_SUPABASE_URL=https://여기에본인프로젝트ID.supabase.co

# anon public key (공개 키 – 브라우저에서 사용해도 되는 키)
VITE_SUPABASE_ANON_KEY=여기에_anon_public_키_긴_문자열

# ===== 백엔드 API (선택) =====
# 배포 시 API 서버 주소. 비워두면 로컬 개발 시 /api → localhost:8000 으로 연결돼요.
# VITE_API_URL=https://coupang-severance-api.onrender.com/api
VITE_API_URL=
```

---

## 3. 각 변수 설명 (초보자용)

| 변수 이름 | 설명 | 예시 |
|-----------|------|------|
| **VITE_SUPABASE_URL** | Supabase 프로젝트의 URL. Supabase 대시보드 **Settings → API** 에서 **Project URL** 로 적혀 있는 주소입니다. | `https://abcdefgh.supabase.co` |
| **VITE_SUPABASE_ANON_KEY** | 같은 화면의 **Project API keys** 중 **anon public** 키. 긴 문자열입니다. 브라우저(프론트)에서 써도 되는 키예요. | `eyJhbGciOiJIUzI1NiIsInR5cCI6...` |
| **VITE_API_URL** | 퇴직금·실업급여 등 백엔드 API 서버 주소. 로컬에서는 비워두면 `/api` 요청이 자동으로 `localhost:8000`으로 갑니다. | (비워둠 또는 `https://.../api`) |

> **주의:** Vite에서는 **반드시 `VITE_` 로 시작하는 이름**만 브라우저 코드에서 읽을 수 있습니다.  
> `NEXT_PUBLIC_` 이나 그냥 `SUPABASE_URL` 은 이 프로젝트(React+Vite)에서는 사용하지 않습니다.

---

## 4. Supabase에서 값 찾는 방법

1. [Supabase](https://supabase.com) 로그인 후 해당 프로젝트 선택.
2. 왼쪽 메뉴에서 **Settings**(톱니바퀴) 클릭.
3. **API** 메뉴 클릭.
4. **Project URL** → `VITE_SUPABASE_URL` 에 복사.
5. **Project API keys** 의 **anon public** → `VITE_SUPABASE_ANON_KEY` 에 복사.

---

## 5. 적용 방법

- 파일을 저장한 뒤 **개발 서버를 한 번 종료했다가 다시 실행**해주세요.  
  (`npm run dev` 또는 `yarn dev` 다시 실행)
- 환경 변수는 서버를 켤 때만 읽기 때문에, 값을 바꾼 뒤에는 꼭 재시작해야 합니다.

---

## 6. Supabase 테이블 준비 (마이페이지·리포트용)

**가장 쉬운 방법:** 이 프로젝트에 포함된 **`frontend/supabase-tables.sql`** 파일을 Supabase 대시보드 → **SQL Editor** 에서 전체 복사 후 실행하세요.  
`profiles`, `reports` 테이블 생성과 RLS 정책, 로그인 시 자동으로 프로필 행을 만드는 트리거까지 한 번에 적용됩니다.

수동으로 만들 경우 참고용 테이블 구조:

- **profiles**  
  - `id` (uuid, PK) = `auth.users.id`  
  - `joined_at` (date, nullable) = 입사일 (퇴직금 D-Day 계산용)  
  - `marketing_agreement` (boolean) = 카카오 알림 수신 동의  
  - `updated_at` (timestamptz, 선택)

- **reports**  
  - `id` (uuid, PK)  
  - `user_id` (uuid) = 로그인한 사용자 ID  
  - `title` (text)  
  - `company_name` (text, nullable)  
  - `created_at` (timestamptz)
