// PDF 저장 및 재사용 — Supabase Storage + DB CRUD 유틸
// 저장 경로: user-pdfs/{userId}/{timestamp}_{fileName}
import { supabase } from './supabase'
import type { SavedPdf } from '../types/supabase'

const BUCKET = 'user-pdfs'
const MAX_PDFS = 5

/** 저장된 PDF 목록 조회 */
export async function listSavedPdfs(userId: string): Promise<SavedPdf[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('saved_pdfs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) { console.error('[PDF 목록 조회 오류]', error); return [] }
  return (data ?? []) as SavedPdf[]
}

/** 저장된 PDF 개수 확인 */
export async function countSavedPdfs(userId: string): Promise<number> {
  if (!supabase) return 0
  const { count, error } = await supabase
    .from('saved_pdfs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) return 0
  return count ?? 0
}

/** PDF 업로드 (Storage + DB) — 최대 5개 제한 */
export async function uploadPdf(
  file: File,
  userId: string,
): Promise<{ success: boolean; pdf?: SavedPdf; error?: string }> {
  if (!supabase) return { success: false, error: 'Supabase 미연결' }

  // 개수 제한 확인
  const currentCount = await countSavedPdfs(userId)
  if (currentCount >= MAX_PDFS) {
    return { success: false, error: `PDF는 최대 ${MAX_PDFS}개까지 저장할 수 있어요. 기존 PDF를 삭제한 후 다시 시도해 주세요.` }
  }

  // Storage 업로드 (경로: userId/timestamp_uuid.pdf — 한글 파일명 인코딩 문제 방지)
  const safeId = crypto.randomUUID().slice(0, 8)
  const storagePath = `${userId}/${Date.now()}_${safeId}.pdf`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: 'application/pdf', upsert: false })
  if (uploadError) {
    console.error('[PDF Storage 업로드 오류]', uploadError)
    return { success: false, error: '파일 업로드에 실패했어요. 다시 시도해 주세요.' }
  }

  // DB에 메타데이터 저장
  const { data, error: dbError } = await supabase
    .from('saved_pdfs')
    .insert({
      user_id: userId,
      file_name: file.name,
      storage_path: storagePath,
      file_size: file.size,
    })
    .select()
    .single()
  if (dbError) {
    console.error('[PDF DB 저장 오류]', dbError)
    // Storage에서 롤백
    await supabase.storage.from(BUCKET).remove([storagePath])
    return { success: false, error: '저장에 실패했어요. 다시 시도해 주세요.' }
  }

  return { success: true, pdf: data as SavedPdf }
}

/** 저장된 PDF 다운로드 → File 객체로 반환 */
export async function downloadPdf(pdf: SavedPdf): Promise<File | null> {
  if (!supabase) return null
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(pdf.storage_path)
  if (error || !data) {
    console.error('[PDF 다운로드 오류]', error)
    return null
  }
  // Blob → File 변환 (원본 파일명 유지)
  return new File([data], pdf.file_name, { type: 'application/pdf' })
}

/** PDF 삭제 (Storage + DB) */
export async function deletePdf(pdf: SavedPdf): Promise<boolean> {
  if (!supabase) return false
  // Storage 삭제
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([pdf.storage_path])
  if (storageError) console.error('[PDF Storage 삭제 오류]', storageError)

  // DB 삭제
  const { error: dbError } = await supabase
    .from('saved_pdfs')
    .delete()
    .eq('id', pdf.id)
  if (dbError) { console.error('[PDF DB 삭제 오류]', dbError); return false }
  return true
}

/** 파일 사이즈 포맷 (bytes → "1.2 MB") */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export { MAX_PDFS }
