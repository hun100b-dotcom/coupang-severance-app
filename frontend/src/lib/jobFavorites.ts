// 채용 즐겨찾기 CRUD — Supabase DB (로그인 필수)
// 회사 또는 센터 단위로 즐겨찾기 가능
import { supabase } from './supabase'
import type { JobFavorite } from '../types/supabase'

/** 즐겨찾기 목록 조회 */
export async function listFavorites(userId: string): Promise<JobFavorite[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('job_favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[즐겨찾기 조회 오류]', error); return [] }
  return (data ?? []) as JobFavorite[]
}

/** 즐겨찾기 추가 (회사 또는 센터) */
export async function addFavorite(
  userId: string,
  type: 'company' | 'center',
  value: string,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('job_favorites')
    .insert({ user_id: userId, favorite_type: type, favorite_value: value })
  if (error) { console.error('[즐겨찾기 추가 오류]', error); return false }
  return true
}

/** 즐겨찾기 삭제 */
export async function removeFavorite(
  userId: string,
  type: 'company' | 'center',
  value: string,
): Promise<boolean> {
  if (!supabase) return false
  const { error } = await supabase
    .from('job_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('favorite_type', type)
    .eq('favorite_value', value)
  if (error) { console.error('[즐겨찾기 삭제 오류]', error); return false }
  return true
}

/** 특정 값이 즐겨찾기인지 확인 (클라이언트 사이드) */
export function isFavorited(
  favorites: JobFavorite[],
  type: 'company' | 'center',
  value: string,
): boolean {
  return favorites.some(f => f.favorite_type === type && f.favorite_value === value)
}
