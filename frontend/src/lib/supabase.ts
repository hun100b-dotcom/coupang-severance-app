// Supabase 브라우저 클라이언트를 생성하는 파일입니다.
// 이 파일에서 만든 클라이언트만 전체 앱에서 공통으로 사용합니다.

import { createClient, SupabaseClient } from '@supabase/supabase-js' // Supabase SDK에서 클라이언트 생성 함수를 가져옵니다.

const url = import.meta.env.VITE_SUPABASE_URL ?? '' // .env.local에 정의된 Supabase 프로젝트 URL을 읽어옵니다.
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '' // .env.local에 정의된 익명 공개 키(anon key)를 읽어옵니다.

let client: SupabaseClient | null = null // 실제로 사용할 Supabase 클라이언트를 저장할 변수를 준비합니다.

try {
  if (url && anonKey) {
    client = createClient(url, anonKey) // URL과 anon key가 모두 존재할 때에만 Supabase 클라이언트를 생성합니다.
  }
} catch {
  client = null // 클라이언트 생성 중 오류가 발생하면 null로 두어 이후 코드에서 방어적으로 처리할 수 있게 합니다.
}

export const supabase = client // 다른 파일에서 Supabase 클라이언트를 import 해서 쓸 수 있도록 내보냅니다.

