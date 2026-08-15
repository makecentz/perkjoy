-- Server-managed homepage activity showcase. Starter entries are explicitly
-- unverified so the public UI labels them as examples rather than real events.

create table public.social_proof_settings (
  id boolean primary key default true check (id),
  enabled boolean not null default true,
  initial_delay_seconds integer not null default 6 check (initial_delay_seconds between 0 and 120),
  display_duration_seconds integer not null default 6 check (display_duration_seconds between 3 and 30),
  interval_seconds integer not null default 22 check (interval_seconds between 8 and 300),
  entries jsonb not null default '[]'::jsonb check (jsonb_typeof(entries) = 'array'),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.social_proof_settings is
  'Server-only configuration for the homepage activity showcase. Unverified seeded entries must remain labeled as examples.';

alter table public.social_proof_settings enable row level security;
revoke all on public.social_proof_settings from public, anon, authenticated;
grant select, insert, update on public.social_proof_settings to service_role;

create index if not exists platform_financial_settings_updated_by_idx
  on public.platform_financial_settings(updated_by)
  where updated_by is not null;
create index social_proof_settings_updated_by_idx
  on public.social_proof_settings(updated_by)
  where updated_by is not null;

insert into public.social_proof_settings (
  id, enabled, initial_delay_seconds, display_duration_seconds, interval_seconds, entries
) values (
  true,
  true,
  6,
  6,
  22,
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Avery', 'kind', 'reward', 'plan', '', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Jordan', 'kind', 'subscription', 'plan', 'Starter', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Maya', 'kind', 'reward', 'plan', '', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Cameron', 'kind', 'subscription', 'plan', 'Growth', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Elena', 'kind', 'reward', 'plan', '', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Marcus', 'kind', 'subscription', 'plan', 'Business', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Priya', 'kind', 'reward', 'plan', '', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Theo', 'kind', 'subscription', 'plan', 'Starter', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Naomi', 'kind', 'reward', 'plan', '', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Daniel', 'kind', 'subscription', 'plan', 'Growth', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Sofia', 'kind', 'reward', 'plan', '', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Miles', 'kind', 'subscription', 'plan', 'Business', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Imani', 'kind', 'reward', 'plan', '', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Lucas', 'kind', 'subscription', 'plan', 'Growth', 'verified', false, 'active', true),
    jsonb_build_object('id', gen_random_uuid(), 'name', 'Chloe', 'kind', 'reward', 'plan', '', 'verified', false, 'active', true)
  )
)
on conflict (id) do nothing;
