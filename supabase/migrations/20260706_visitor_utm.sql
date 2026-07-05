-- ============================================================
-- 20260706_visitor_utm: visitor_logs 에 UTM(광고 캠페인 추적) 컬럼 추가
-- 목적: 유입경로를 referrer(직전 페이지)뿐 아니라 UTM 파라미터로도 세분 집계.
--       (예: ?utm_source=kakao&utm_medium=cpc&utm_campaign=severance_0706)
--
-- ⚠️ 적용 순서 (반드시 이 순서로):
--   1) 이 마이그레이션을 Supabase SQL Editor 에서 먼저 실행(멱등 — 여러 번 실행해도 안전)
--   2) 그 다음에 프론트(useVisitorTracking.ts) insert 에 utm_source/medium/campaign 추가
--   ★ 순서를 지키지 않으면(컬럼 없는데 프론트가 utm 을 insert) PostgREST 가 insert 전체를
--     거부해 방문 기록이 끊긴다. 마이그레이션 적용 확인 후에만 프론트를 바꿀 것.
-- ============================================================

ALTER TABLE public.visitor_logs
  ADD COLUMN IF NOT EXISTS utm_source   text,
  ADD COLUMN IF NOT EXISTS utm_medium   text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  -- 첫 진입 랜딩 경로(캠페인 도착 페이지) — 선택
  ADD COLUMN IF NOT EXISTS landing_path text;

-- utm_source 별 집계 인덱스(캠페인 리포트용)
CREATE INDEX IF NOT EXISTS idx_visitor_logs_utm_source
  ON public.visitor_logs(utm_source)
  WHERE utm_source IS NOT NULL;

-- 적용 확인용(실행 후 눈으로 컬럼 존재 확인):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'visitor_logs' ORDER BY ordinal_position;
