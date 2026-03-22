# notify-inquiry Edge Function

1:1 문의가 접수되면 Discord Webhook으로 알림을 발송하는 Supabase Edge Function입니다.

## 환경변수 설정 방법 (Supabase 대시보드)

1. [Supabase 대시보드](https://supabase.com/dashboard) 접속
2. 프로젝트 선택 → **Edge Functions** 메뉴 클릭
3. `notify-inquiry` 함수 선택
4. 우측 상단 **"Secrets"** 클릭
5. 새 Secret 추가:
   - **Name**: `DISCORD_WEBHOOK_URL`
   - **Value**: Discord 채널 Webhook URL 붙여넣기

## Discord Webhook URL 발급 방법

1. Discord 채널 우클릭 → **채널 편집**
2. **연동** 탭 → **웹후크** → **새 웹후크**
3. 이름 설정 후 **웹후크 URL 복사**

## 로컬 테스트 시

`supabase/functions/notify-inquiry/.env.local` 파일을 생성하고 아래 내용을 추가합니다:

```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

> **주의**: `.env.local`은 절대 git에 커밋하지 마세요.

로컬 테스트 실행:

```bash
supabase functions serve notify-inquiry --env-file ./supabase/functions/notify-inquiry/.env.local
```

## 배포

```bash
supabase functions deploy notify-inquiry
```

## 호출 페이로드

```json
{
  "message": "문의 내용",
  "category": "퇴직금/실업급여",
  "userEmail": "user@example.com",
  "userId": "uuid",
  "createdAt": "2026-03-22T00:00:00.000Z"
}
```
