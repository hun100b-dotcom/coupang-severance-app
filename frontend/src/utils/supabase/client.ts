/**
 * Supabase 클라이언트 초기화
 * - 환경 변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)로 브라우저용 클라이언트를 생성합니다.
 * - 인증(Auth), DB(Realtime 등) 접근 시 이 클라이언트를 사용합니다.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Vite 프로젝트에서는 VITE_ 접두사가 붙은 환경 변수만 클라이언트에서 사용 가능합니다.
const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

let client: SupabaseClient | null = null

try {
  if (url && anonKey) {
    client = createClient(url, anonKey)
  }
} catch {
  client = null
}

export const supabase = client
