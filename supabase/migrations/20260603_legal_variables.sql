-- ============================================================
-- legal_variables 테이블: 최저시급 등 법정 변수 DB화
-- 관리자 페이지에서 수정 가능, 프론트엔드에서 캐시 조회
-- ============================================================

create table if not exists public.legal_variables (
  id            serial primary key,
  key           text not null unique,        -- 변수 식별자 (예: min_hourly_wage)
  value         numeric not null,            -- 값 (예: 10320)
  unit          text not null default '',    -- 단위 (예: KRW/h)
  effective_year int not null,               -- 적용 연도 (예: 2026)
  label         text not null default '',    -- 표시용 라벨 (예: 최저시급)
  updated_at    timestamptz not null default now(),
  updated_by    text not null default 'system'
);

-- RLS: 누구나 조회 가능, 수정은 서비스 롤 또는 관리자 인증 필요
alter table public.legal_variables enable row level security;

-- 조회: 누구나 가능
create policy "legal_variables 조회 허용" on public.legal_variables
  for select using (true);

-- 수정: 인증된 사용자만 (추후 관리자 정책으로 세분화)
create policy "legal_variables 수정 허용" on public.legal_variables
  for all using (auth.role() = 'authenticated');

-- 초기 데이터: 2026년 최저시급 10,320원
insert into public.legal_variables (key, value, unit, effective_year, label)
values
  ('min_hourly_wage', 10320, 'KRW/h', 2026, '2026년 최저시급')
on conflict (key) do update
  set value = excluded.value,
      unit = excluded.unit,
      effective_year = excluded.effective_year,
      label = excluded.label,
      updated_at = now();

-- updated_at 자동 갱신 트리거
create or replace function public.set_legal_variables_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_legal_variables_updated_at on public.legal_variables;
create trigger trg_legal_variables_updated_at
  before update on public.legal_variables
  for each row execute function public.set_legal_variables_updated_at();
