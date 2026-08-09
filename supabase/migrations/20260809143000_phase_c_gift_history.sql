-- Phase C: durable gift history for personalized, non-repeating recommendations.
create table if not exists public.gift_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  recommendation_id uuid references public.recommendations(id) on delete set null,
  title text not null,
  reward_type text not null check (reward_type in ('digital','local','experience','recognition_only','surprise_me')),
  occasion text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'scheduled' check (status in ('scheduled','sent','delivered')),
  created_at timestamptz not null default now()
);

create index if not exists idx_gift_history_employee_created on public.gift_history(employee_id, created_at desc);
create index if not exists idx_gift_history_org_created on public.gift_history(organization_id, created_at desc);

alter table public.gift_history enable row level security;

create policy gift_history_org_select on public.gift_history
  for select to authenticated
  using (private.is_org_member(organization_id));

create policy gift_history_admin_insert on public.gift_history
  for insert to authenticated
  with check (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]));

create policy gift_history_admin_update on public.gift_history
  for update to authenticated
  using (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]))
  with check (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]));

grant select, insert, update on public.gift_history to authenticated;

comment on table public.gift_history is 'Past employee gifts used server-side to avoid repetitive recommendations. Never expose private preference inputs.';
