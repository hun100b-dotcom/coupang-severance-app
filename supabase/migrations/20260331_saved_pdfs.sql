-- PDF 저장 및 재사용 기능: saved_pdfs 테이블 + Storage 버킷 + RLS
-- 실행 위치: Supabase SQL Editor

-- 1. saved_pdfs 테이블 생성
CREATE TABLE IF NOT EXISTS saved_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 인덱스: 유저별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_saved_pdfs_user_id ON saved_pdfs(user_id);

-- 2. RLS 활성화 + 정책
ALTER TABLE saved_pdfs ENABLE ROW LEVEL SECURITY;

-- 본인 row만 SELECT
CREATE POLICY "Users can view own pdfs"
  ON saved_pdfs FOR SELECT
  USING (auth.uid() = user_id);

-- 본인만 INSERT (최대 5개 제한은 프론트에서 처리)
CREATE POLICY "Users can insert own pdfs"
  ON saved_pdfs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 본인만 DELETE
CREATE POLICY "Users can delete own pdfs"
  ON saved_pdfs FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Storage 버킷 생성 (private, 10MB 제한)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('user-pdfs', 'user-pdfs', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS 정책
-- 본인 폴더에만 업로드
CREATE POLICY "Users can upload own pdfs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 본인 폴더만 조회
CREATE POLICY "Users can read own pdfs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'user-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 본인 폴더만 삭제
CREATE POLICY "Users can delete own pdfs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'user-pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
