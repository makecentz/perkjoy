create extension if not exists pgcrypto;

create type public.organization_role as enum ('OWNER', 'ADMIN', 'MANAGER', 'VIEWER');
create type public.reward_status as enum ('draft','pending_approval','scheduled','processing','sent','delivered','redeemed','failed','cancelled','refunded');
create type public.approval_mode as enum ('automatic','approval_required','reminder_only');

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null default '', last_name text not null default '',
  is_super_admin boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organizations (
  id uuid primary key default gen_random_uuid(), name text not null,
  city text, state text, postal_code text, timezone text not null default 'America/New_York',
  stripe_customer_id text unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_members (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role public.organization_role not null,
  manager_scope_enabled boolean not null default false, created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create table public.departments (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, name)
);
create table public.employees (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null, last_name text not null, email text not null, phone text,
  birthday_month smallint not null check (birthday_month between 1 and 12), birthday_day smallint not null check (birthday_day between 1 and 31),
  hire_date date not null, department_id uuid references public.departments(id) on delete set null, job_title text,
  manager_employee_id uuid references public.employees(id) on delete set null, work_location text,
  address_line_1 text, address_line_2 text, city text, state text, postal_code text,
  recognition_preferences jsonb not null default '{}'::jsonb, status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (organization_id, email)
);
create table public.automation_rules (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null, event_type text not null, reward_type text not null, reward_amount numeric(12,2) not null default 0 check (reward_amount >= 0),
  vendor_product_id uuid, send_offset_days integer not null default 0, active boolean not null default true,
  approval_required boolean not null default false, minimum_tenure integer, anniversary_years integer[], applicable_department_id uuid references public.departments(id) on delete set null,
  message_template text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.recognition_events (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, rule_id uuid references public.automation_rules(id) on delete set null,
  event_type text not null, event_year integer not null, event_key text not null, event_date date not null,
  status text not null default 'scheduled', metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (organization_id, event_key)
);
create table public.rewards (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, recognition_event_id uuid references public.recognition_events(id) on delete set null,
  provider text not null, provider_order_id text, provider_reward_id text, amount numeric(12,2) not null check (amount >= 0), currency char(3) not null default 'USD',
  recipient_name text not null, recipient_email text not null, delivery_method text not null default 'email', status public.reward_status not null default 'draft',
  sent_at timestamptz, delivered_at timestamptz, redeemed_at timestamptz, failure_reason text, idempotency_key text not null,
  test_mode boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (organization_id, idempotency_key), unique (provider, provider_reward_id)
);
create table public.reward_provider_events (
  id uuid primary key default gen_random_uuid(), provider text not null, provider_event_id text not null unique,
  reward_id uuid references public.rewards(id) on delete set null, payload jsonb not null,
  processed_at timestamptz, created_at timestamptz not null default now()
);
create table public.vendors (
  id uuid primary key default gen_random_uuid(), business_name text not null, slug text not null unique, description text,
  logo_url text, website_url text, email text, phone text, address text, city text not null, state text not null, postal_code text,
  service_area jsonb not null default '{}'::jsonb, minimum_notice_hours integer not null default 48 check (minimum_notice_hours >= 0),
  active boolean not null default true, featured boolean not null default false, demo boolean not null default false,
  internal_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.vendor_products (
  id uuid primary key default gen_random_uuid(), vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null, description text, category text not null, image_url text,
  retail_price numeric(12,2) not null check (retail_price >= 0), perkjoy_cost numeric(12,2) not null check (perkjoy_cost >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0), minimum_notice_hours integer not null default 48,
  active boolean not null default true, options jsonb not null default '{}'::jsonb, service_area jsonb not null default '{}'::jsonb,
  serves_people integer, lead_time_text text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.automation_rules add constraint automation_rules_vendor_product_fk foreign key (vendor_product_id) references public.vendor_products(id) on delete set null;
create table public.local_gift_orders (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict, product_id uuid not null references public.vendor_products(id) on delete restrict,
  delivery_address jsonb not null, delivery_date date not null, options jsonb not null default '{}'::jsonb, gift_message text,
  customer_amount numeric(12,2) not null check (customer_amount >= 0), vendor_cost numeric(12,2) not null check (vendor_cost >= 0), delivery_fee numeric(12,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','pending_payment','paid','submitted_to_vendor','vendor_confirmed','preparing','out_for_delivery','delivered','cancelled','refunded','issue')),
  internal_notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade, type text not null, title text not null, body text not null,
  channel text not null check (channel in ('in_app','email')), read_at timestamptz, sent_at timestamptz, created_at timestamptz not null default now()
);
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null unique references public.organizations(id) on delete cascade,
  stripe_customer_id text not null, stripe_subscription_id text not null unique, stripe_price_id text not null,
  subscription_status text not null, current_period_end timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  approval_mode public.approval_mode not null default 'approval_required', monthly_budget numeric(12,2) not null default 500 check (monthly_budget >= 0),
  prevent_above_budget boolean not null default false, default_reward_amount numeric(12,2) not null default 25,
  leap_day_preference text not null default 'feb28' check (leap_day_preference in ('feb28','mar1')),
  default_birthday_message text, default_anniversary_message text, notification_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null, action text not null, entity_type text not null, entity_id uuid,
  metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create index idx_members_user_org on public.organization_members(user_id, organization_id);
create index idx_employees_org_status on public.employees(organization_id, status);
create index idx_employees_org_birthday on public.employees(organization_id, birthday_month, birthday_day) where status = 'active';
create index idx_rules_org_event_active on public.automation_rules(organization_id, event_type) where active;
create index idx_events_org_date on public.recognition_events(organization_id, event_date);
create index idx_rewards_org_status_created on public.rewards(organization_id, status, created_at desc);
create index idx_orders_org_delivery on public.local_gift_orders(organization_id, delivery_date, status);
create index idx_notifications_user_created on public.notifications(user_id, created_at desc);
create index idx_audit_org_created on public.audit_logs(organization_id, created_at desc);

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.organization_members m where m.organization_id = target_organization_id and m.user_id = (select auth.uid())
  );
$$;
create or replace function private.has_org_role(target_organization_id uuid, allowed_roles public.organization_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.organization_members m where m.organization_id = target_organization_id and m.user_id = (select auth.uid()) and m.role = any(allowed_roles)
  );
$$;
revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.has_org_role(uuid, public.organization_role[]) from public, anon;
grant execute on function private.is_org_member(uuid), private.has_org_role(uuid, public.organization_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.automation_rules enable row level security;
alter table public.recognition_events enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_provider_events enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_products enable row level security;
alter table public.local_gift_orders enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;
alter table public.organization_settings enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select_self on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_self on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id and is_super_admin = false);
create policy organizations_member_select on public.organizations for select to authenticated using (private.is_org_member(id));
create policy organizations_admin_update on public.organizations for update to authenticated using (private.has_org_role(id, array['OWNER','ADMIN']::public.organization_role[])) with check (private.has_org_role(id, array['OWNER','ADMIN']::public.organization_role[]));
create policy members_select_org on public.organization_members for select to authenticated using (private.is_org_member(organization_id));
create policy members_admin_insert on public.organization_members for insert to authenticated with check (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]));
create policy members_owner_update on public.organization_members for update to authenticated using (private.has_org_role(organization_id, array['OWNER']::public.organization_role[])) with check (private.has_org_role(organization_id, array['OWNER']::public.organization_role[]));
create policy members_owner_delete on public.organization_members for delete to authenticated using (private.has_org_role(organization_id, array['OWNER']::public.organization_role[]));

do $$ declare table_name text; begin
  foreach table_name in array array['departments','employees','automation_rules','recognition_events','rewards','local_gift_orders','organization_settings','audit_logs'] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.is_org_member(organization_id))', table_name || '_org_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_org_role(organization_id, array[''OWNER'',''ADMIN'']::public.organization_role[]))', table_name || '_admin_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_org_role(organization_id, array[''OWNER'',''ADMIN'']::public.organization_role[])) with check (private.has_org_role(organization_id, array[''OWNER'',''ADMIN'']::public.organization_role[]))', table_name || '_admin_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_org_role(organization_id, array[''OWNER'',''ADMIN'']::public.organization_role[]))', table_name || '_admin_delete', table_name);
  end loop;
end $$;

create policy notifications_user_select on public.notifications for select to authenticated using ((select auth.uid()) = user_id and private.is_org_member(organization_id));
create policy notifications_user_update on public.notifications for update to authenticated using ((select auth.uid()) = user_id and private.is_org_member(organization_id)) with check ((select auth.uid()) = user_id and private.is_org_member(organization_id));
create policy subscriptions_org_select on public.subscriptions for select to authenticated using (private.has_org_role(organization_id, array['OWNER','ADMIN']::public.organization_role[]));
create policy vendors_authenticated_select on public.vendors for select to authenticated using (active = true);
create policy products_authenticated_select on public.vendor_products for select to authenticated using (active = true and exists (select 1 from public.vendors v where v.id = vendor_id and v.active));

grant select, insert, update, delete on public.profiles, public.organizations, public.organization_members, public.departments, public.employees, public.automation_rules, public.recognition_events, public.rewards, public.local_gift_orders, public.notifications, public.organization_settings, public.audit_logs to authenticated;
grant select on public.vendors, public.vendor_products, public.subscriptions to authenticated;
revoke all on public.reward_provider_events from anon, authenticated;

create or replace function private.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
revoke all on function private.set_updated_at() from public, anon, authenticated;
do $$ declare table_name text; begin
  foreach table_name in array array['profiles','organizations','departments','employees','automation_rules','recognition_events','rewards','vendors','vendor_products','local_gift_orders','subscriptions','organization_settings'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name);
  end loop;
end $$;

comment on column public.profiles.is_super_admin is 'Server-managed only. Never set from user metadata or client input.';
comment on column public.rewards.idempotency_key is 'Deterministic key preventing duplicate rewards at the database layer.';
