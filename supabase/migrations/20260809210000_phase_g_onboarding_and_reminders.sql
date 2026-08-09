alter table public.organization_settings
  add column if not exists celebration_style text not null default 'both',
  add column if not exists selected_template text,
  add column if not exists onboarding_completed boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_settings_celebration_style_check'
  ) then
    alter table public.organization_settings
      add constraint organization_settings_celebration_style_check
      check (celebration_style in ('digital', 'local', 'both'));
  end if;
end
$$;
