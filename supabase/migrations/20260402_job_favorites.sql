-- 채용 즐겨찾기: 회사 또는 센터 단위 즐겨찾기
-- 로그인 사용자 전용, RLS 본인만 CRUD

CREATE TABLE IF NOT EXISTS job_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  favorite_type text NOT NULL CHECK (favorite_type IN ('company', 'center')),
  favorite_value text NOT NULL,  -- 회사명 또는 "회사명::센터명" 형태
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, favorite_type, favorite_value)  -- 중복 방지
);

CREATE INDEX IF NOT EXISTS idx_job_favorites_user ON job_favorites(user_id);

ALTER TABLE job_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON job_favorites FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites"
  ON job_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON job_favorites FOR DELETE USING (auth.uid() = user_id);
