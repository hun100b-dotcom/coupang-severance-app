-- 20260704_keepalive_render_pg_cron.sql
-- Render 백엔드 콜드스타트 방지 — DB 주도 keep-alive (10분 주기)
-- ★ 2026-07-04 Supabase MCP(apply_migration)로 라이브 적용 완료 — 이 파일은 IaC 기록용.
--
-- 배경(2026-07-04 어드민 전수조사, docs/audit/admin_fullcheck_2026-07-04.md):
--   1) 기존 GitHub Actions keep-alive는 존재하지 않는 호스트(-api 오타)를 핑해 무효였고,
--   2) 오타를 고쳐도 GitHub 무료 스케줄러가 크론을 최대 2시간까지 지연시키는 것이 실측됨
--      (실행 이력: 11:08 → 13:07 → 15:23, 14분 크론인데 ~2시간 간격).
--   → Supabase pg_cron + pg_net으로 DB가 직접 10분마다 /health를 호출해
--     Render 15분 절전 기준을 안정적으로 회피한다(추가 외부 서비스 불필요).
--     GitHub Actions 크론은 이중 안전망으로 유지.
--
-- 적용 전 확인(1회):
--   select name, installed_version from pg_available_extensions where name in ('pg_cron','pg_net');
-- 적용 후 확인:
--   select jobid, jobname, schedule, active from cron.job where jobname='keep-render-alive';
--   실행 이력: select * from cron.job_run_details where jobid=(select jobid from cron.job where jobname='keep-render-alive') order by start_time desc limit 5;
-- 롤백(가역):
--   select cron.unschedule('keep-render-alive');

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 동일 이름 잡이 이미 있으면 제거 후 재등록(멱등)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'keep-render-alive') then
    perform cron.unschedule('keep-render-alive');
  end if;
end $$;

select cron.schedule(
  'keep-render-alive',
  '*/10 * * * *',  -- 10분마다 (Render 15분 절전 기준보다 짧게)
  $$ select net.http_get('https://coupang-severance-app.onrender.com/health', timeout_milliseconds := 60000); $$
);
