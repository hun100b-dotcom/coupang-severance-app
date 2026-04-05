-- notices 테이블에 title 컬럼 추가
-- 기존 공지사항은 title이 빈 문자열('')로 기본값 설정됨
-- 적용: Supabase 대시보드 → SQL Editor 에서 실행하거나
--        supabase db push 로 자동 마이그레이션

ALTER TABLE notices
  ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '';

-- 기존 공지사항 데이터 마이그레이션:
-- content 앞 30자를 임시 title로 채워 넣습니다 (선택 사항)
-- UPDATE notices SET title = LEFT(content, 30) WHERE title = '';
