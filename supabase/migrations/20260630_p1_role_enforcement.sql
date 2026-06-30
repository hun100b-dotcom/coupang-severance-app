-- 20260630_p1_role_enforcement.sql
-- 🟠 P1 (높음): 관리자 역할 차등(viewer / admin / super_admin)을 서버(RLS)에서 진짜 강제
-- ─────────────────────────────────────────────────────────────────────
--
-- 무엇이 문제였나 (admin_review_2026-06-30.md 조사2 P1):
--   기존 RLS는 어드민 쓰기를 전부 public.is_admin() 으로만 막았다.
--   is_admin() = admin_accounts 에 auth.email() 이 is_active=true 면 true (★역할 무관).
--   → 'viewer' 로 등록된 계정도 is_admin()=true 라서 공지/문의/공고/지원자/설정/템플릿을
--     전부 CRUD 할 수 있었다. 즉 역할(viewer/admin)별 차등은 프론트 permission_levels(JSON)
--     클라이언트 검사에만 존재하고, 서버(DB)에는 "활성 관리자냐 아니냐" 2단계뿐이었다.
--
-- 무엇을 하나 (3단계 권한 모델 도입):
--   ┌ public.is_admin()        = 활성 관리자 전체 (super_admin + admin + viewer)  → 읽기(SELECT)
--   ├ public.is_admin_writer() = 운영 관리자      (super_admin + admin)            → 쓰기(INSERT/UPDATE/DELETE)  ★신규
--   └ public.is_super_admin()  = 최고 관리자      (super_admin)                     → 관리자 계정 관리·민감조작
--
--   어드민이 쓰는 테이블의 INSERT/UPDATE/DELETE 정책을 is_admin() → is_admin_writer() 로 교체한다.
--   SELECT 정책은 is_admin() 을 유지한다 → viewer 는 "보기만" 가능, "쓰기"는 차단.
--   admin_accounts 쓰기는 기존대로 is_super_admin() 유지(이 파일에서 손대지 않음).
--   감사로그(audit_logs / admin_audit_logs) INSERT 는 is_admin() 유지 — 사유는 §7 참조.
--
-- 안전성 / 멱등성:
--   - is_admin_writer() 는 CREATE OR REPLACE (재실행 안전).
--   - 모든 정책은 DROP POLICY IF EXISTS 후 CREATE (재실행 안전). 정책명은 기존과 동일하게 유지.
--   - SECURITY DEFINER + SET search_path=public,pg_temp (V6 하드닝 정책과 동일 패턴).
--   - 현재 운영 관리자 3명이 모두 super_admin 이면 is_admin_writer()=true → 동작 변화 0 (영향 없음).
--     (검증: §9-(c) 의 "현 관리자 역할 분포" SQL 로 적용 전 1회 확인.)
--
-- 실행 방법: Supabase Dashboard → SQL Editor 붙여넣기 실행 (또는 MCP apply_migration).
--   ⚠ 이 파일은 레포에 커밋만 되고 자동 적용되지 않는다. 종훈님이 MCP로 직접 적용.
-- ─────────────────────────────────────────────────────────────────────


-- =====================================================================
-- §0. [적용 전 1회 확인] 대상 테이블들의 현재 정책 전수 캡처
--     아래 DROP 대상 정책명이 라이브와 1글자라도 다르면 DROP 이 조용히 통과(미적용)되므로,
--     적용 전에 반드시 실행해 정책명을 눈으로 대조할 것.
-- =====================================================================
--   SELECT tablename, policyname, cmd, qual, with_check
--     FROM pg_policies
--    WHERE schemaname='public'
--      AND tablename IN ('notices','inquiries','job_postings','job_applications',
--                        'system_settings','inquiry_templates','notifications')
--    ORDER BY tablename, cmd, policyname;
--   -- 기대: cmd=UPDATE/INSERT/DELETE 정책의 qual/with_check 에 현재 is_admin() 이 보임.
--   --       이걸 is_admin_writer() 로 바꾸는 것이 이 마이그레이션의 목적.


-- =====================================================================
-- §1. 신규 함수 — public.is_admin_writer()  (운영 관리자: super_admin + admin)
--     viewer 는 제외된다. is_super_admin() 을 포함하므로 하드코딩 super 이메일
--     (catchmasterdmin)도 admin_accounts 시드가 없어도 항상 writer 로 인정된다.
-- =====================================================================
CREATE OR REPLACE FUNCTION public.is_admin_writer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT
    public.is_super_admin()  -- super_admin(역할) OR 하드코딩 super 이메일
    OR EXISTS (
      SELECT 1
        FROM public.admin_accounts
       WHERE email = auth.email()
         AND role = 'admin'
         AND is_active = true
    );
$$;

COMMENT ON FUNCTION public.is_admin_writer() IS
  'P1 역할강제: 운영 관리자(super_admin+admin) 여부. viewer 제외. 어드민 쓰기 RLS 전용.';


-- =====================================================================
-- §2. notices (공지사항) — INSERT/UPDATE/DELETE 를 writer 전용으로
--     SELECT(notices_select_public)는 그대로 둔다(공개 조회 + 관리자 조회 유지).
--     출처: 004_security_rls.sql
-- =====================================================================
DROP POLICY IF EXISTS "notices_insert_admin" ON public.notices;
CREATE POLICY "notices_insert_admin"
  ON public.notices FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_writer());

DROP POLICY IF EXISTS "notices_update_admin" ON public.notices;
CREATE POLICY "notices_update_admin"
  ON public.notices FOR UPDATE
  TO authenticated
  USING (public.is_admin_writer())
  WITH CHECK (public.is_admin_writer());

DROP POLICY IF EXISTS "notices_delete_admin" ON public.notices;
CREATE POLICY "notices_delete_admin"
  ON public.notices FOR DELETE
  TO authenticated
  USING (public.is_admin_writer());


-- =====================================================================
-- §3. inquiries (1:1 문의) — 관리자 UPDATE 를 writer 전용으로
--     SELECT(inquiries_select_own: 본인 OR is_admin)·INSERT(inquiries_insert_auth: 본인)는 유지.
--     → viewer 는 문의를 "볼" 수 있으나 상태/답변 변경은 불가.
--     출처: 20260629_fix_inquiries_rls_is_admin.sql (최신)
-- =====================================================================
DROP POLICY IF EXISTS "inquiries_update_admin" ON public.inquiries;
CREATE POLICY "inquiries_update_admin"
  ON public.inquiries FOR UPDATE
  TO authenticated
  USING (public.is_admin_writer())
  WITH CHECK (public.is_admin_writer());


-- =====================================================================
-- §4. job_postings (채용공고) — INSERT/UPDATE/DELETE 를 writer 전용으로
--     SELECT 2종("Admins can view all jobs"=is_admin, "Authenticated…active jobs")은 유지.
--     출처: 20260405_fix_job_postings_rls.sql (최신)
-- =====================================================================
DROP POLICY IF EXISTS "Admins can insert jobs" ON public.job_postings;
CREATE POLICY "Admins can insert jobs"
  ON public.job_postings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_writer());

DROP POLICY IF EXISTS "Admins can update jobs" ON public.job_postings;
CREATE POLICY "Admins can update jobs"
  ON public.job_postings FOR UPDATE
  TO authenticated
  USING (public.is_admin_writer());

DROP POLICY IF EXISTS "Admins can delete jobs" ON public.job_postings;
CREATE POLICY "Admins can delete jobs"
  ON public.job_postings FOR DELETE
  TO authenticated
  USING (public.is_admin_writer());


-- =====================================================================
-- §5. job_applications (지원자 내역) — 관리자 UPDATE 를 writer 전용으로
--     SELECT(applications_select_admin=is_admin)·본인정책(applications_own, FOR ALL)은 유지.
--     → viewer 는 지원자를 "볼" 수 있으나 상태(확정/거절/검토중) 변경은 불가.
--     출처: 20260629_fix_job_applications_admin_rls.sql
-- =====================================================================
DROP POLICY IF EXISTS "applications_update_admin" ON public.job_applications;
CREATE POLICY "applications_update_admin"
  ON public.job_applications FOR UPDATE
  TO authenticated
  USING (public.is_admin_writer())
  WITH CHECK (public.is_admin_writer());


-- =====================================================================
-- §6. system_settings (시스템 설정) — 쓰기를 writer 전용으로
--     기존: system_settings_write_admin = FOR ALL USING is_admin() WITH CHECK is_admin()
--           (FOR ALL 은 SELECT 까지 포함하지만, SELECT 는 별도 정책
--            system_settings_select_public(USING true)가 공개 허용 중이라
--            FOR ALL 을 없애도 읽기는 그대로 동작 → viewer/anon 읽기 영향 없음).
--     변경: FOR ALL 정책을 제거하고 INSERT/UPDATE/DELETE 만 writer 전용으로 명시.
--           SELECT 정책(system_settings_select_public)은 손대지 않는다.
--     출처: 005_super_admin_setup.sql
--   ⚠ 참고: system_settings 의 공개 SELECT(민감키 member_unmask_key 노출)는 P1 범위 밖의
--           별도 이슈다. 여기서는 "쓰기 역할강제"만 다루고 읽기 정책은 변경하지 않는다.
-- =====================================================================
DROP POLICY IF EXISTS "system_settings_write_admin"  ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_insert_writer" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_update_writer" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_delete_writer" ON public.system_settings;

CREATE POLICY "system_settings_insert_writer"
  ON public.system_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_writer());

CREATE POLICY "system_settings_update_writer"
  ON public.system_settings FOR UPDATE
  TO authenticated
  USING (public.is_admin_writer())
  WITH CHECK (public.is_admin_writer());

CREATE POLICY "system_settings_delete_writer"
  ON public.system_settings FOR DELETE
  TO authenticated
  USING (public.is_admin_writer());


-- =====================================================================
-- §7. inquiry_templates (답변 템플릿) — FOR ALL 을 SELECT(is_admin) + 쓰기(writer)로 분리
--     기존: inquiry_templates_admin_all = FOR ALL USING is_admin() WITH CHECK is_admin()
--           (FOR ALL 이라 SELECT 까지 is_admin → 단순 swap 하면 viewer 가 템플릿 목록을 못 봄)
--     변경: SELECT 는 is_admin() 으로 분리 유지(viewer 열람 가능),
--           INSERT/UPDATE/DELETE 는 is_admin_writer() 로 제한.
--     출처: 20260405_inquiry_templates.sql
-- =====================================================================
DROP POLICY IF EXISTS "inquiry_templates_admin_all"     ON public.inquiry_templates;
DROP POLICY IF EXISTS "inquiry_templates_select_admin"  ON public.inquiry_templates;
DROP POLICY IF EXISTS "inquiry_templates_insert_writer" ON public.inquiry_templates;
DROP POLICY IF EXISTS "inquiry_templates_update_writer" ON public.inquiry_templates;
DROP POLICY IF EXISTS "inquiry_templates_delete_writer" ON public.inquiry_templates;

CREATE POLICY "inquiry_templates_select_admin"
  ON public.inquiry_templates FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "inquiry_templates_insert_writer"
  ON public.inquiry_templates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_writer());

CREATE POLICY "inquiry_templates_update_writer"
  ON public.inquiry_templates FOR UPDATE
  TO authenticated
  USING (public.is_admin_writer())
  WITH CHECK (public.is_admin_writer());

CREATE POLICY "inquiry_templates_delete_writer"
  ON public.inquiry_templates FOR DELETE
  TO authenticated
  USING (public.is_admin_writer());


-- =====================================================================
-- §8. notifications (알림) — 관리자 발송 경로를 writer 전용으로
--     기존: notifications_insert_self_or_admin = WITH CHECK (auth.uid()=user_id OR is_admin())
--           (어드민이 지원자 확정/거절 시 타인 user_id 로 알림 INSERT — ApplicantsMenu)
--     변경: 관리자 발송분을 writer 로 좁힘 → (auth.uid()=user_id OR is_admin_writer())
--           본인 알림 자가삽입(auth.uid()=user_id)은 유지. viewer 는 알림 발송 불가
--           (지원자 상태변경이 §5 에서 막히는 것과 권한 정합).
--     출처: 20260630_v3_notifications_insert_restrict.sql
-- =====================================================================
DROP POLICY IF EXISTS "notifications_insert_self_or_admin" ON public.notifications;
CREATE POLICY "notifications_insert_self_or_admin"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin_writer());


-- =====================================================================
-- §7-NOTE. 의도적으로 제외한 테이블 (역할강제 대상 아님)
--   - admin_accounts        : 쓰기는 이미 is_super_admin() 전용(004). 그대로 둠.
--   - audit_logs (실사용)    : INSERT 는 is_admin() 유지. 이유 — viewer 의 행위도 감사기록에
--                              남아야 추적성이 보장된다. writer 로 좁히면 viewer 행위가 누락됨.
--                              (백엔드 _write_audit 는 service-role 로 RLS 우회 → 무관.)
--   - admin_audit_logs (미사용): V2 의 is_admin() INSERT 유지(동일 사유 + dead 테이블).
--   - profiles / page_views / visit_sessions 등 : 어드민 "쓰기" 경로 아님(조회·분석수집).
-- =====================================================================


-- ── 완료 메시지 ────────────────────────────────────────────────────────
DO $$
BEGIN
  RAISE NOTICE '✅ P1 적용: is_admin_writer() 신설 + 어드민 쓰기 7테이블 역할강제(viewer 쓰기 차단)';
  RAISE NOTICE '  - 대상: notices / inquiries / job_postings / job_applications / system_settings / inquiry_templates / notifications';
  RAISE NOTICE '  - SELECT 정책은 is_admin() 유지 → viewer 열람 가능, 쓰기만 차단';
  RAISE NOTICE '  - admin_accounts(super 전용)·audit_logs(is_admin 유지)는 비변경';
END $$;


-- =====================================================================
-- §9. [적용 후 검증 SQL]  (Supabase SQL Editor / MCP 에서 실행)
-- =====================================================================
--
-- (a) is_admin_writer() 가 생성됐고 search_path 가 고정됐는지
--   SELECT p.proname, p.oid::regprocedure AS signature, p.prosecdef AS security_definer, p.proconfig
--     FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--    WHERE n.nspname='public' AND p.proname='is_admin_writer';
--   -- 기대: proconfig 에 search_path=public, pg_temp / security_definer=true.
--
-- (b) 7개 테이블의 쓰기 정책이 is_admin_writer() 로 바뀌었는지 (UPDATE/INSERT/DELETE 만)
--   SELECT tablename, policyname, cmd, qual, with_check
--     FROM pg_policies
--    WHERE schemaname='public'
--      AND tablename IN ('notices','inquiries','job_postings','job_applications',
--                        'system_settings','inquiry_templates','notifications')
--      AND cmd IN ('INSERT','UPDATE','DELETE')
--    ORDER BY tablename, cmd;
--   -- 기대: qual/with_check 에 is_admin_writer() 포함. (notifications 는 self OR writer)
--   -- 동시에 SELECT 정책들은 여전히 is_admin()/public 인지도 같이 확인.
--
-- (c) 현 관리자 역할 분포 — 전원 super_admin 이면 이번 변경의 동작 영향 0
--   SELECT email, role, is_active FROM public.admin_accounts ORDER BY role, email;
--   -- 만약 role='admin' 계정이 있으면 그 계정도 계속 쓰기 가능(writer).
--   -- role='viewer' 계정이 있으면 그 계정만 이번 변경으로 쓰기가 차단된다.
--
-- (d) viewer 쓰기 차단 시뮬레이션 (역할 가정 평가 — 실제 세션 없이 논리 점검)
--     실사용 검증은 viewer 계정으로 로그인해 어드민에서 공지/문의 저장 시도 → "차단"되는지 확인.
--     DB 단독 점검은 아래로 "활성 viewer 가 writer 가 아님"을 확인:
--   SELECT email, role, is_active,
--          (role IN ('super_admin','admin') AND is_active) AS expected_writer
--     FROM public.admin_accounts
--    ORDER BY expected_writer, role;
--   -- 기대: viewer 행의 expected_writer=false (쓰기 차단 대상), admin/super=true.
--
-- (e) viewer 가 여전히 "읽기"는 되는지(SELECT 정책 보존 확인)
--   SELECT tablename, policyname, cmd, qual
--     FROM pg_policies
--    WHERE schemaname='public'
--      AND tablename IN ('notices','inquiries','job_postings','job_applications','inquiry_templates')
--      AND cmd='SELECT'
--    ORDER BY tablename;
--   -- 기대: is_admin() 또는 공개 조건이 남아 있음(viewer=is_admin 이므로 읽기 가능).
-- =====================================================================


-- =====================================================================
-- §10. [롤백] — is_admin_writer() → is_admin() 로 원복 (역할강제 해제)
--      필요할 때만. 함수는 남겨둬도 무해하므로 정책만 원복해도 됨.
-- =====================================================================
--   -- notices
--   DROP POLICY IF EXISTS "notices_insert_admin" ON public.notices;
--   CREATE POLICY "notices_insert_admin" ON public.notices FOR INSERT TO authenticated WITH CHECK (public.is_admin());
--   DROP POLICY IF EXISTS "notices_update_admin" ON public.notices;
--   CREATE POLICY "notices_update_admin" ON public.notices FOR UPDATE TO authenticated USING (public.is_admin());
--   DROP POLICY IF EXISTS "notices_delete_admin" ON public.notices;
--   CREATE POLICY "notices_delete_admin" ON public.notices FOR DELETE TO authenticated USING (public.is_admin());
--   -- inquiries
--   DROP POLICY IF EXISTS "inquiries_update_admin" ON public.inquiries;
--   CREATE POLICY "inquiries_update_admin" ON public.inquiries FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
--   -- job_postings
--   DROP POLICY IF EXISTS "Admins can insert jobs" ON public.job_postings;
--   CREATE POLICY "Admins can insert jobs" ON public.job_postings FOR INSERT TO authenticated WITH CHECK (public.is_admin());
--   DROP POLICY IF EXISTS "Admins can update jobs" ON public.job_postings;
--   CREATE POLICY "Admins can update jobs" ON public.job_postings FOR UPDATE TO authenticated USING (public.is_admin());
--   DROP POLICY IF EXISTS "Admins can delete jobs" ON public.job_postings;
--   CREATE POLICY "Admins can delete jobs" ON public.job_postings FOR DELETE TO authenticated USING (public.is_admin());
--   -- job_applications
--   DROP POLICY IF EXISTS "applications_update_admin" ON public.job_applications;
--   CREATE POLICY "applications_update_admin" ON public.job_applications FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
--   -- system_settings (원복: 단일 FOR ALL 로)
--   DROP POLICY IF EXISTS "system_settings_insert_writer" ON public.system_settings;
--   DROP POLICY IF EXISTS "system_settings_update_writer" ON public.system_settings;
--   DROP POLICY IF EXISTS "system_settings_delete_writer" ON public.system_settings;
--   CREATE POLICY "system_settings_write_admin" ON public.system_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
--   -- inquiry_templates (원복: 단일 FOR ALL 로)
--   DROP POLICY IF EXISTS "inquiry_templates_select_admin"  ON public.inquiry_templates;
--   DROP POLICY IF EXISTS "inquiry_templates_insert_writer" ON public.inquiry_templates;
--   DROP POLICY IF EXISTS "inquiry_templates_update_writer" ON public.inquiry_templates;
--   DROP POLICY IF EXISTS "inquiry_templates_delete_writer" ON public.inquiry_templates;
--   CREATE POLICY "inquiry_templates_admin_all" ON public.inquiry_templates FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
--   -- notifications
--   DROP POLICY IF EXISTS "notifications_insert_self_or_admin" ON public.notifications;
--   CREATE POLICY "notifications_insert_self_or_admin" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin());
--   -- (선택) 함수 제거
--   -- DROP FUNCTION IF EXISTS public.is_admin_writer();
-- =====================================================================
