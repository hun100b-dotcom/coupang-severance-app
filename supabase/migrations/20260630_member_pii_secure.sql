-- 20260630_member_pii_secure.sql
-- 회원 PII 마스킹 서버측 재설계 (보안 🔴#4)
-- ─────────────────────────────────────────────────────────────────────
--
-- 목적:
--   1. 마스킹 해제 보안키를 "평문 + 공개 읽기"에서 "해시 + 비공개"로 이전.
--   2. 기존 system_settings.member_unmask_key 평문 행 제거(누구나 읽던 노출 차단).
--
-- 배경(위험):
--   005_super_admin_setup.sql 이 system_settings 에 'member_unmask_key' 를 평문으로
--   심었고, 같은 파일의 RLS 정책 system_settings_select_public = USING(true) 때문에
--   anon 을 포함한 누구나 이 보안키를 읽을 수 있었다. 클라이언트는 이 값을 받아
--   '===' 단순 비교로 마스킹을 해제했다 → 보안 통제가 아니라 UI 연출.
--
-- 변경 후:
--   보안키 해시는 admin_secrets 테이블(아래)에만 저장되고 RLS 로 클라이언트 접근을
--   전면 차단한다. 백엔드(FastAPI)만 service-role 키로 접근해 해시 검증을 수행한다.
--
-- 실행 방법: Supabase Dashboard → SQL Editor → 이 파일 붙여넣기 후 실행
--           (또는 Supabase MCP apply_migration)

-- ── 1. 관리자 비밀값 테이블 (해시 등 민감값 격리) ──────────────────────
CREATE TABLE IF NOT EXISTS public.admin_secrets (
  key         text PRIMARY KEY,          -- 예: 'member_unmask_key'
  value_hash  text NOT NULL,             -- PBKDF2 해시 ('pbkdf2_sha256$iter$salt$hash')
  algo        text NOT NULL DEFAULT 'pbkdf2_sha256',
  updated_by  text,                      -- 마지막으로 설정한 관리자 이메일
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 2. RLS: 클라이언트 전면 차단 ───────────────────────────────────────
-- RLS 를 켜고 어떤 정책도 만들지 않으면, anon/authenticated 클라이언트는
-- SELECT/INSERT/UPDATE/DELETE 가 모두 0행으로 거부된다.
-- 백엔드의 service-role 키는 RLS 를 우회하므로 백엔드만 읽고 쓸 수 있다.
ALTER TABLE public.admin_secrets ENABLE ROW LEVEL SECURITY;
-- (의도적으로 정책 없음 = deny-all to clients)

-- ── 3. 기존 평문 보안키 제거 (공개 노출 차단) ──────────────────────────
DELETE FROM public.system_settings WHERE key = 'member_unmask_key';

-- ── 완료 메시지 ────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ 20260630_member_pii_secure.sql 마이그레이션 완료';
  RAISE NOTICE '  - admin_secrets 테이블 생성 + RLS deny-all (백엔드 service-role 전용)';
  RAISE NOTICE '  - system_settings.member_unmask_key 평문 행 삭제';
  RAISE NOTICE '  ⚠ 적용 후: 슈퍼관리자가 Settings 에서 보안키를 다시 설정해야 함';
  RAISE NOTICE '    (평문→해시 전환이라 기존 키는 복구 불가)';
END $$;
