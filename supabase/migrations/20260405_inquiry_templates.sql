-- 20260405_inquiry_templates.sql
-- 문의 답변 템플릿 테이블 생성
-- 관리자가 자주 쓰는 답변을 미리 저장해 두고 재사용할 수 있도록 합니다.

CREATE TABLE IF NOT EXISTS public.inquiry_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,                    -- 템플릿 제목
  content     text        NOT NULL,                    -- 템플릿 본문
  category    text        NOT NULL DEFAULT '기타',     -- 문의 카테고리
  use_count   integer     NOT NULL DEFAULT 0,          -- 사용 횟수 (자동 집계)
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.inquiry_templates ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회/생성/수정/삭제 가능
DROP POLICY IF EXISTS "inquiry_templates_admin_all" ON public.inquiry_templates;
CREATE POLICY "inquiry_templates_admin_all"
  ON public.inquiry_templates FOR ALL
  TO authenticated
  USING  (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── 완료 메시지 ──────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ 20260405_inquiry_templates.sql 완료: inquiry_templates 테이블 생성';
END $$;
