import { createClient, SupabaseClient } from '@supabase/supabase-js'

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
