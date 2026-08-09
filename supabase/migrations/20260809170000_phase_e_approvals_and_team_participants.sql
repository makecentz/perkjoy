-- Phase E: configurable approval policies and normalized team participants.
create table if not exists public.approval_policies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  reward_type text not null,
  minimum_amount numeric(12,2) not null default 0 check (minimum_amount >= 0),
  maximum_amount numeric(12,2) check (maximum_amount is null or maximum_amount >= minimum_amount),
  approval_level text not null check (approval_level in ('automatic','manager','admin','owner')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_celebration_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  team_celebration_id uuid not null references public.team_celebrations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (team_celebration_id, employee_id)
);

create index if not exists idx_approval_policies_org_active on public.approval_policies(organization_id, active);
create index if not exists idx_team_participants_celebration on public.team_celebration_participants(team_celebration_id);
create index if not exists idx_team_participants_employee on public.team_celebration_participants(employee_id);

alter table public.approval_policies enable row level security;
alter table public.team_celebration_participants enable row level security;

create policy approval_policies_org_select on public.approval_policies
  for select to authenticated using (private.is_org_member(organization_id));
create policy approval_policies_admin_insert on public.approval_policies
  for insert to authenticated with check (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]));
create policy approval_policies_admin_update on public.approval_policies
  for update to authenticated using (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]))
  with check (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]));
create policy approval_policies_admin_delete on public.approval_policies
  for delete to authenticated using (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]));

create policy team_participants_org_select on public.team_celebration_participants
  for select to authenticated using (private.is_org_member(organization_id));
create policy team_participants_admin_insert on public.team_celebration_participants
  for insert to authenticated with check (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]));
create policy team_participants_admin_update on public.team_celebration_participants
  for update to authenticated using (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]))
  with check (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]));
create policy team_participants_admin_delete on public.team_celebration_participants
  for delete to authenticated using (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]));

grant select, insert, update, delete on public.approval_policies, public.team_celebration_participants to authenticated;

create trigger set_updated_at before update on public.approval_policies
  for each row execute function private.set_updated_at();

