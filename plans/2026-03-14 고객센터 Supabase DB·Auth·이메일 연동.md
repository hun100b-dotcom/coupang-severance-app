# 고객센터(CustomerService) 실제 DB 연동 및 이메일 푸시 자동화

**작성일**: 2026-03-14  
**목표**: 하드코딩된 상태/임시 배열을 Supabase Auth·Database·이메일 알림으로 전면 교체. UI/레이아웃은 1픽셀도 변경하지 않고, **상태(State)와 비동기 통신 로직만** 교체.

---

## 0. 무관용 원칙 (절대 준수)

| 금지 | 허용 |
|------|------|
| h-[85vh], 바텀시트 레이아웃, 카드/버튼 스타일 변경 | `currentView` 값 확장 (main \| login \| form \| success \| history) |
| 토스 스타일 시각 요소 수정 | `isLoggedIn` ↔ Supabase 세션 동기화 |
| 라우팅 구조 변경 | `handleSubmitInquiry` → DB Insert + (선택) 이메일 트리거 |
| 카테고리 칩/FAQ UI 변경 | `fetchInquiryHistory` → Supabase Select |
| | `handleOAuthLogin` → `supabase.auth.signInWithOAuth()` |

**제공된 정답 코드(JSX) 기준**  
- 뷰: `main`(검색·카테고리·1:1 문의·내 문의 내역·FAQ), `login`, `form`, `success`, `history` 유지.  
- 현재 프로젝트의 CustomerService는 `main` \| `form` \| `success` 만 있으므로, **login**·**history** 뷰를 정답 코드와 동일한 스타일로 추가한 뒤, 아래 로직만 연동한다.

---

## 1. 구현 명세 1: 실제 인증(Auth) 연결

### 1.1 할 일

- **CustomerService** 내 `handleOAuthLogin(provider)` 에서  
  `await supabase.auth.signInWithOAuth({ provider: 'kakao' | 'google' })` 호출.
- Supabase Auth 세션을 구독하여 **isLoggedIn** 을 실제 인증 상태와 동기화.
- 로그인 필요 시: 1:1 문의 클릭 → `login` 뷰, 내 문의 내역 클릭 → `login` 뷰.

### 1.2 프론트엔드 사전 작업

- 패키지: `npm install @supabase/supabase-js`
- 환경 변수 (`.env` / Vercel 등):
  - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL  
    (예: `https://xxxxx.supabase.co`)
  - `VITE_SUPABASE_ANON_KEY`: anon public key  
    (Supabase 대시보드 → Settings → API → Project API keys → anon public)
- 공용 클라이언트: `frontend/src/lib/supabaseClient.ts`  
  - `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` 로 한 번만 생성 후 export.

### 1.3 Supabase 대시보드에서 할 일 (CEO용)

1. **Authentication → Providers**  
   - **Google**: Enable, Client ID/Secret 입력 (Google Cloud Console에서 OAuth 2.0 클라이언트 생성 후 Redirect URI에 `https://<project-ref>.supabase.co/auth/v1/callback` 등록).  
   - **Kakao**: Enable, REST API 키/Redirect URI 등록 후 Supabase에 Client ID/Secret 입력.
2. **Authentication → URL Configuration**  
   - Site URL: 실제 서비스 도메인 (예: `https://your-app.vercel.app`).  
   - Redirect URLs: `https://your-app.vercel.app/**`, `http://localhost:5173/**` 등 개발/운영 URL 추가.

### 1.4 코드 연결 요약

- `onAuthStateChange` 로 `session` 감지 → `setIsLoggedIn(!!session?.user)`.
- `handleOAuthLogin('kakao' | 'google')` → `signInWithOAuth({ provider })` 호출 후 리다이렉트 처리( Supabase가 리다이렉트 ).

---

## 2. 구현 명세 2: Supabase DB 스키마 및 프론트 연동

### 2.1 DB 테이블 생성 SQL (Supabase SQL Editor에서 실행)

```sql
-- 문의(inquiries) 테이블
create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  content text not null,
  status text not null default '대기중' check (status in ('대기중', '답변완료')),
  created_at timestamptz not null default now(),
  answer text
);

-- RLS 정책: 본인 문의만 조회/삽입
alter table public.inquiries enable row level security;

create policy "Users can insert own inquiry"
  on public.inquiries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can select own inquiries"
  on public.inquiries for select
  to authenticated
  using (auth.uid() = user_id);

-- (선택) 관리자만 update: answer, status 변경용
-- create policy "Service role can update"
--   on public.inquiries for update
--   using (true);
--   with check (true);
-- 주의: 실제로는 service_role로 백오피스에서만 update 권한 두는 것을 권장.
```

- **컬럼**: `id`, `user_id`, `category`, `content`, `status`(기본값 `'대기중'`), `created_at`, `answer`.  
- CEO 가이드: Supabase 대시보드 → **SQL Editor** → New query → 위 SQL 붙여넣기 → Run.

### 2.2 문의 남기기 (Insert)

- **handleSubmitInquiry** 에서:
  - `supabase.auth.getUser()` 또는 세션에서 `user.id` 확보.
  - `await supabase.from('inquiries').insert([{ user_id: user.id, category: inquiryCategory, content: inquiryText.trim(), status: '대기중' }])`.
  - 성공 시 `setCurrentView('success')`, 폼 초기화; 실패 시 에러 토스트/메시지.

### 2.3 내역 불러오기 (Select)

- **fetchInquiryHistory** 에서:
  - `const { data, error } = await supabase.from('inquiries').select('*').eq('user_id', user.id).order('created_at', { ascending: false })`.
  - 성공 시 `setInquiryHistory(data || [])`, 실패 시 빈 배열 또는 에러 처리.
  - 렌더 시 `answer` 있으면 “CATCH 팀의 답변” 영역에 표시, 없으면 “답변 대기중” 메시지.

### 2.4 타입 정합성

- `inquiryHistory` 항목 타입: `{ id: string, user_id: string, category: string, content: string, status: string, created_at: string, answer: string | null }`.
- `created_at` 표시 시 `new Date(item.created_at).toLocaleDateString('ko-KR')` 등으로 포맷.

---

## 3. 구현 명세 3: 관리자 이메일 푸시 자동화

**목표**: 문의가 DB에 Insert될 때마다 `catchmasteradmin@gmail.com` 으로 알림 발송.

### 권장: 옵션 A — Supabase Edge Function + Resend

- **이유**: Supabase 내부에서 완결, 코드로 제어 가능, Resend는 무료 티어로 충분.
- **흐름**: DB Insert → **Database Webhook**으로 Edge Function 호출 → Edge Function에서 Resend API로 이메일 전송.

#### A-1. Resend 가입 및 API 키

1. [resend.com](https://resend.com) 가입.
2. **API Keys** 메뉴에서 Create API Key → 키 복사 (예: `re_xxxx`).
3. (선택) 도메인 인증 후 발신자 이메일을 `noreply@yourdomain.com` 등으로 설정. 미인증 시 Resend 기본 발신자로도 테스트 가능.

#### A-2. Supabase Edge Function 생성 (CEO용 스텝)

1. Supabase 대시보드 로그인 → 프로젝트 선택.
2. 왼쪽 메뉴 **Edge Functions** 클릭.
3. **Create a new function** 클릭.
4. Function name: `send-inquiry-notification` (또는 원하는 이름).
5. **Create function** 후 에디터에 아래 **Deno 코드** 붙여넣기.

```typescript
// send-inquiry-notification.ts
import "jsr:@supabase/functions-js/edge_runtime";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = "catchmasteradmin@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204 });
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500 });
  }
  try {
    const payload = await req.json();
    const record = payload?.record ?? payload;
    const { id, category, content, created_at } = record;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "CATCH 알림 <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject: `[CATCH 문의] ${category} - 새 문의가 접수되었습니다`,
        html: `
          <p>새 1:1 문의가 접수되었습니다.</p>
          <ul>
            <li>문의 ID: ${id}</li>
            <li>분류: ${category}</li>
            <li>접수 시각: ${created_at}</li>
          </ul>
          <p>내용:</p>
          <pre>${content ?? ""}</pre>
        `,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: err }), { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
```

6. **Settings → Edge Function → Secrets** (또는 Project Settings → Edge Functions)에서 **RESEND_API_KEY** 추가, 값에 Resend API 키 입력.
7. **Deploy** 버튼으로 함수 배포.
8. 배포 후 **Edge Function URL** 복사 (예: `https://<project-ref>.supabase.co/functions/v1/send-inquiry-notification`).

#### A-3. Database Webhook 설정 (CEO용 스텝)

1. Supabase 대시보드 → **Database** → **Webhooks**.
2. **Create a new hook** 클릭.
3. **Name**: `on-inquiry-insert` (임의).
4. **Table**: `public.inquiries` 선택.
5. **Events**: **Insert** 만 체크.
6. **Type**: HTTP Request (또는 Supabase에서 제공하는 “Call Edge Function” 옵션이 있으면 해당 선택).
7. **HTTP Request** 인 경우:
   - **URL**: 위에서 복사한 Edge Function URL.
   - **HTTP Method**: POST.
   - **Headers**: `Content-Type: application/json`, `Authorization: Bearer <SUPABASE_ANON_KEY 또는 service_role key>` (Edge Function이 프로젝트 내부이면 anon으로도 가능한 경우 있음. 필요 시 Edge Function에서 권한 체크).
8. Supabase 문서에 따르면 Webhook payload에 `record` 가 포함되므로, Edge Function에서 `payload.record` 로 새 행 사용.
9. **Save** 후, 앱에서 문의 한 건 제출해 보고 `catchmasteradmin@gmail.com` 수신 여부 확인.

---

### 대안: 옵션 B — Database Webhook + Zapier/Make

- **흐름**: Insert 시 Supabase Webhook이 Zapier/Make의 Webhook URL로 POST → Zapier/Make에서 이메일 액션(Gmail, SendGrid 등) 실행.

#### B-1. Zapier 예시 (CEO용)

1. [zapier.com](https://zapier.com) 가입.
2. **Create Zap** → Trigger: **Webhooks by Zapier** → **Catch Hook** 선택.
3. Zapier가 부여한 Webhook URL 복사 (예: `https://hooks.zapier.com/...`).
4. Supabase **Database → Webhooks** → Create hook:
   - Table: `public.inquiries`, Event: **Insert**.
   - URL: Zapier Webhook URL, Method: POST.
5. Zapier에서 테스트로 문의 1건 제출 후 payload 확인.
6. Step 2 추가: **Gmail** 또는 **Email by Zapier** → Send Outbound Email.
   - To: `catchmasteradmin@gmail.com`.
   - Subject/Body: Webhook payload의 `record` 필드로 분류/내용/시간 넣기.
7. Zap 활성화.

#### B-2. Make (Integromat) 예시

1. [make.com](https://make.com) 가입.
2. 시나리오 생성 → **Webhooks** 모듈로 “Custom webhook” 생성 → URL 복사.
3. Supabase Webhook에서 해당 URL로 Insert 시 POST.
4. 다음 모듈에서 **Email** 또는 **Gmail** 등으로 관리자 이메일 발송 설정.

---

## 4. 실행 워크플로우 (순서)

1. **plan.md 검토 및 승인** (현 문서).
2. **Supabase**  
   - SQL Editor에서 `inquiries` 테이블 + RLS 실행.  
   - Auth Providers (Google/Kakao) 설정.  
   - (옵션 A) Edge Function 배포 + Webhook 연결 또는 (옵션 B) Zapier/Make 연동.
3. **프론트엔드**  
   - `@supabase/supabase-js` 설치, `supabaseClient.ts` 생성, 환경 변수 설정.  
   - CustomerService에 **login**·**history** 뷰 추가(제공된 정답 코드 레이아웃 유지).  
   - `handleOAuthLogin` → `signInWithOAuth`, 세션 구독 → `isLoggedIn` 동기화.  
   - `handleSubmitInquiry` → 로컬 배열 제거, `inquiries` Insert만 사용.  
   - `fetchInquiryHistory` → `inquiries` Select, `answer` 표시.  
   - UI/레이아웃/스타일은 변경하지 않음.
4. **검증**  
   - 비로그인 → 1:1 문의/내역 클릭 시 로그인 뷰.  
   - 카카오/구글 로그인 후 문의 작성 → success → history에서 DB 데이터 노출.  
   - 관리자 이메일 수신 확인.

---

## 5. 체크리스트 (승인 전 확인)

- [ ] `inquiries` 테이블 SQL 및 RLS 적용 여부
- [ ] Auth Provider (Google/Kakao) 및 Redirect URL 설정
- [ ] Edge Function + Webhook **또는** Zapier/Make 중 선택
- [ ] 프론트: Supabase 클라이언트·env·login/history 뷰·Auth·Insert/Select 만 수정, UI 무변경

---

**승인 후** 위 체크리스트와 본 명세에 따라 구현 진행. plan.md 승인 전까지 프론트엔드 코드 수정 없음.
