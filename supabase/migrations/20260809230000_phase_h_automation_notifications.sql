alter table public.notifications
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists action_label text,
  add column if not exists action_href text;

create table if not exists public.automation_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  run_key text not null,
  status text not null default 'completed' check (status in ('completed','completed_with_attention')),
  rules_evaluated integer not null default 0 check (rules_evaluated >= 0),
  moments_evaluated integer not null default 0 check (moments_evaluated >= 0),
  scheduled_count integer not null default 0 check (scheduled_count >= 0),
  approval_count integer not null default 0 check (approval_count >= 0),
  duplicate_count integer not null default 0 check (duplicate_count >= 0),
  created_at timestamptz not null default now(),
  unique (organization_id, run_key)
);

create index if not exists idx_notifications_org_created on public.notifications(organization_id, created_at desc);
create index if not exists idx_notifications_org_read on public.notifications(organization_id, read_at);
create index if not exists idx_automation_runs_org_created on public.automation_runs(organization_id, created_at desc);

alter table public.notifications enable row level security;
alter table public.automation_runs enable row level security;

create policy "organization members view automation runs" on public.automation_runs
  for select to authenticated
  using (private.is_org_member(organization_id));

grant select on public.automation_runs to authenticated;
