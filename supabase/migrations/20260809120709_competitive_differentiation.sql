create table public.markets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  city text not null,
  state text not null,
  country text not null default 'US',
  active boolean not null default false,
  launch_status text not null default 'coming_soon' check (launch_status in ('active','coming_soon')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  market_id uuid references public.markets(id) on delete set null,
  name text not null,
  location_type text not null default 'office' check (location_type in ('office','remote')),
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

alter table public.employees
  add column work_mode text not null default 'office' check (work_mode in ('office','remote','hybrid')),
  add column preferred_celebration_delivery text not null default 'workplace' check (preferred_celebration_delivery in ('workplace','home','digital_only')),
  add column organization_location_id uuid references public.organization_locations(id) on delete set null;

create table public.celebration_types (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  category text not null check (category in ('career','life')),
  active boolean not null default true,
  manual_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table public.employee_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  celebration_type_id uuid references public.celebration_types(id) on delete set null,
  title text not null,
  event_date date not null,
  category text not null check (category in ('career','life')),
  status text not null default 'needs_attention' check (status in ('needs_attention','scheduled','approval_required','handled','delivered','skipped')),
  reward_summary text not null default 'No celebration configured',
  handled_steps jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.celebration_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null unique references public.employees(id) on delete cascade,
  completeness smallint not null default 0 check (completeness between 0 and 100),
  privacy_mode text not null default 'recommendations_only' check (privacy_mode in ('share_with_hr','recommendations_only')),
  preferred_delivery text not null default 'workplace' check (preferred_delivery in ('workplace','home','digital_only')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.celebration_profile_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.celebration_preferences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null unique references public.employees(id) on delete cascade,
  food jsonb not null default '{}'::jsonb,
  rewards jsonb not null default '{}'::jsonb,
  interests text[] not null default '{}',
  shirt_size text,
  dietary_preferences text[] not null default '{}',
  share_with_hr boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vendors add column market_id uuid references public.markets(id) on delete set null;
alter table public.vendor_products
  add column customer_price numeric(12,2) not null default 0 check (customer_price >= 0),
  add column vendor_cost numeric(12,2) not null default 0 check (vendor_cost >= 0),
  add column delivery_cost numeric(12,2) not null default 0 check (delivery_cost >= 0),
  add column platform_fee numeric(12,2) not null default 0 check (platform_fee >= 0),
  add column gross_margin numeric(12,2) not null default 0,
  add column rating numeric(2,1) check (rating between 0 and 5),
  add column delivery_available boolean not null default true;

update public.vendor_products set
  customer_price = retail_price,
  vendor_cost = perkjoy_cost,
  delivery_cost = delivery_fee,
  gross_margin = retail_price - perkjoy_cost - delivery_fee;

create table public.vendor_availability (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  minimum_notice_hours integer not null default 48 check (minimum_notice_hours >= 0),
  available_days smallint[] not null default '{1,2,3,4,5}' check (available_days <@ array[0,1,2,3,4,5,6]::smallint[]),
  blackout_dates date[] not null default '{}',
  delivery_hours jsonb not null default '{}'::jsonb,
  fulfillment_method text not null default 'vendor_delivery' check (fulfillment_method in ('vendor_delivery','perkjoy_arranged','pickup','third_party')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vendor_id, market_id)
);

create table public.bundles (
  id uuid primary key default gen_random_uuid(),
  market_id uuid not null references public.markets(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete restrict,
  name text not null,
  description text,
  category text not null,
  customer_price numeric(12,2) not null check (customer_price >= 0),
  active boolean not null default true,
  manually_fulfilled_by_perkjoy boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (vendor_id is not null or manually_fulfilled_by_perkjoy)
);

create table public.bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.bundles(id) on delete cascade,
  product_id uuid references public.vendor_products(id) on delete set null,
  item_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  created_at timestamptz not null default now()
);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  employee_event_id uuid references public.employee_events(id) on delete set null,
  reward_type text not null check (reward_type in ('digital','local','experience','recognition_only','surprise_me','concierge')),
  title text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  recommendation_score smallint not null check (recommendation_score between 0 and 100),
  recommendation_reason text not null,
  something_different boolean not null default false,
  status text not null default 'recommended' check (status in ('recommended','awaiting_approval','approved','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  approval_level text not null check (approval_level in ('manager','admin','owner')),
  amount numeric(12,2) not null default 0 check (amount >= 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references auth.users(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.concierge_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete restrict,
  employee_event_id uuid references public.employee_events(id) on delete set null,
  occasion text not null,
  budget numeric(12,2) not null check (budget > 0),
  delivery_date date not null,
  status text not null default 'submitted' check (status in ('submitted','planning','recommendation_ready','awaiting_approval','approved','ordered','delivered')),
  recommendation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.team_celebrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  event_type text not null,
  event_date date not null,
  department_id uuid references public.departments(id) on delete set null,
  participant_employee_ids uuid[] not null default '{}',
  reward_mode text not null check (reward_mode in ('individual','team_experience')),
  budget numeric(12,2) not null default 0 check (budget >= 0),
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organization_settings
  add column department_budgets jsonb not null default '{}'::jsonb,
  add column manager_reward_limit numeric(12,2) not null default 25 check (manager_reward_limit >= 0),
  add column per_event_maximums jsonb not null default '{}'::jsonb,
  add column approval_thresholds jsonb not null default '{}'::jsonb,
  add column reminder_days smallint[] not null default '{30,14,7,3,1}';

create index idx_locations_org_active on public.organization_locations(organization_id, active);
create index idx_locations_market on public.organization_locations(market_id) where market_id is not null;
create index idx_employees_location on public.employees(organization_location_id) where organization_location_id is not null;
create index idx_celebration_types_org_active on public.celebration_types(organization_id, active);
create index idx_employee_events_org_date on public.employee_events(organization_id, event_date);
create index idx_employee_events_org_attention on public.employee_events(organization_id, status, event_date) where status in ('needs_attention','approval_required');
create index idx_employee_events_employee on public.employee_events(employee_id);
create index idx_celebration_profiles_org on public.celebration_profiles(organization_id);
create index idx_profile_invitations_employee on public.celebration_profile_invitations(employee_id, expires_at);
create index idx_profile_invitations_org on public.celebration_profile_invitations(organization_id);
create index idx_celebration_preferences_org on public.celebration_preferences(organization_id);
create index idx_vendors_market_active on public.vendors(market_id, active);
create index idx_vendor_availability_market on public.vendor_availability(market_id);
create index idx_bundles_market_active on public.bundles(market_id, active);
create index idx_bundle_items_bundle on public.bundle_items(bundle_id);
create index idx_bundle_items_product on public.bundle_items(product_id) where product_id is not null;
create index idx_recommendations_org_status on public.recommendations(organization_id, status);
create index idx_recommendations_employee on public.recommendations(employee_id, created_at desc);
create index idx_recommendations_event on public.recommendations(employee_event_id) where employee_event_id is not null;
create index idx_approvals_org_pending on public.approval_requests(organization_id, created_at desc) where status = 'pending';
create index idx_concierge_org_status on public.concierge_requests(organization_id, status, created_at desc);
create index idx_concierge_employee on public.concierge_requests(employee_id);
create index idx_team_celebrations_org_date on public.team_celebrations(organization_id, event_date);
create index idx_team_celebrations_department on public.team_celebrations(department_id) where department_id is not null;

alter table public.markets enable row level security;
alter table public.organization_locations enable row level security;
alter table public.celebration_types enable row level security;
alter table public.employee_events enable row level security;
alter table public.celebration_profiles enable row level security;
alter table public.celebration_profile_invitations enable row level security;
alter table public.celebration_preferences enable row level security;
alter table public.vendor_availability enable row level security;
alter table public.bundles enable row level security;
alter table public.bundle_items enable row level security;
alter table public.recommendations enable row level security;
alter table public.approval_requests enable row level security;
alter table public.concierge_requests enable row level security;
alter table public.team_celebrations enable row level security;

create policy markets_authenticated_select on public.markets for select to authenticated using (active or launch_status = 'coming_soon');
create policy vendor_availability_authenticated_select on public.vendor_availability for select to authenticated using (exists (select 1 from public.vendors v where v.id = vendor_id and v.active));
create policy bundles_authenticated_select on public.bundles for select to authenticated using (active);
create policy bundle_items_authenticated_select on public.bundle_items for select to authenticated using (exists (select 1 from public.bundles b where b.id = bundle_id and b.active));

do $$ declare table_name text; begin
  foreach table_name in array array['organization_locations','celebration_types','employee_events','celebration_profiles','recommendations','approval_requests','concierge_requests','team_celebrations'] loop
    execute format('create policy %I on public.%I for select to authenticated using (private.is_org_member(organization_id))', table_name || '_org_select', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.has_org_role(organization_id, array[''OWNER'',''ADMIN'']::public.organization_role[]))', table_name || '_admin_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.has_org_role(organization_id, array[''OWNER'',''ADMIN'']::public.organization_role[])) with check (private.has_org_role(organization_id, array[''OWNER'',''ADMIN'']::public.organization_role[]))', table_name || '_admin_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.has_org_role(organization_id, array[''OWNER'',''ADMIN'']::public.organization_role[]))', table_name || '_admin_delete', table_name);
  end loop;
end $$;

revoke all on public.celebration_profile_invitations, public.celebration_preferences from anon, authenticated;
grant select, insert, update, delete on public.organization_locations, public.celebration_types, public.employee_events, public.celebration_profiles, public.recommendations, public.approval_requests, public.concierge_requests, public.team_celebrations to authenticated;
grant select on public.markets, public.vendor_availability, public.bundles, public.bundle_items to authenticated;

revoke select on public.vendor_products from authenticated;
grant select (id, vendor_id, name, description, category, image_url, retail_price, delivery_fee, minimum_notice_hours, active, options, service_area, serves_people, lead_time_text, created_at, updated_at, customer_price, delivery_cost, platform_fee, rating, delivery_available) on public.vendor_products to authenticated;

do $$ declare table_name text; begin
  foreach table_name in array array['markets','organization_locations','celebration_types','employee_events','celebration_profiles','celebration_preferences','vendor_availability','bundles','recommendations','concierge_requests','team_celebrations'] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()', table_name);
  end loop;
end $$;

comment on table public.celebration_preferences is 'Sensitive employee preferences. Access only from audited server-side workflows; never expose with general organization-member RLS.';
comment on table public.celebration_profile_invitations is 'Stores only hashed, expiring profile invitation tokens. Raw tokens must never be persisted.';
comment on column public.celebration_preferences.dietary_preferences is 'Voluntary food preferences for recommendations; not medical diagnosis data.';
comment on column public.vendor_products.vendor_cost is 'Internal marketplace profitability data. Never grant to company customer roles.';
comment on column public.vendor_products.gross_margin is 'Internal marketplace profitability data. Never grant to company customer roles.';
