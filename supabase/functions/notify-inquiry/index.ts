// Supabase Edge Function: notify-inquiry
// 역할: 1:1 문의가 접수되면 Discord Webhook으로 알림을 발송합니다.
// 이 함수는 Supabase 서버에서 실행되므로, Discord Webhook URL을
// 클라이언트 코드나 환경변수 파일에 노출하지 않아도 됩니다.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS 허용 헤더: 프론트엔드(브라우저)에서 호출 가능하도록 설정합니다.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // OPTIONS preflight 요청 처리 (브라우저 CORS 정책 준수)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 프론트엔드에서 전달한 문의 정보를 파싱합니다.
    const { message, category, userEmail, userId, createdAt } = await req.json()

    // Discord Webhook URL은 Supabase 대시보드 Secrets에서 관리합니다.
    // 절대 코드에 하드코딩하지 마세요.
    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL')
    if (!webhookUrl) {
      throw new Error('DISCORD_WEBHOOK_URL 환경변수가 설정되지 않았습니다. Supabase 대시보드 → Edge Functions → Secrets에서 추가하세요.')
    }

    // Discord Embed 메시지 구성
    const discordPayload = {
      embeds: [{
        title: '📨 새 1:1 문의가 접수되었습니다',
        color: 0x3182F6, // CATCH 브랜드 블루 컬러
        fields: [
          {
            name: '📂 카테고리',
            value: category || '미분류',
            inline: true,
          },
          {
            name: '👤 사용자',
            value: userEmail || userId || '비로그인',
            inline: true,
          },
          {
            name: '📝 문의 내용',
            // Discord embed field value 최대 1024자 제한
            value: (message || '내용 없음').slice(0, 1024),
            inline: false,
          },
          {
            name: '🕐 접수 시각',
            value: createdAt || new Date().toISOString(),
            inline: false,
          },
        ],
        footer: { text: 'CATCH 서비스' },
        timestamp: new Date().toISOString(),
      }]
    }

    // Discord Webhook API 호출
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Discord 응답 오류: ${res.status} ${errText}`)
    }

    // 성공 응답 반환
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  } catch (err) {
    // 오류 로그는 서버(Supabase)에만 남기고, 클라이언트에는 일반 오류 메시지를 반환합니다.
    console.error('Discord 알림 발송 실패:', err)
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    )
  }
})
