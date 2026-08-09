-- Complete the production Supabase data path for authenticated PerkJoy workspaces.

-- The platform RLS event trigger does not need to be callable through the Data API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- The application writes user-scoped notifications and audit-safe automation runs.
create policy notifications_user_insert on public.notifications
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and private.is_org_member(organization_id)
  );

create policy automation_runs_admin_insert on public.automation_runs
  for insert to authenticated
  with check (
    private.has_org_role(
      organization_id,
      array['OWNER','ADMIN']::public.organization_role[]
    )
  );

grant insert on public.automation_runs to authenticated;

-- Safely create the first organization for an authenticated Supabase user.
-- User metadata is used only for initial display values, never authorization.
create or replace function public.bootstrap_perkjoy_workspace(
  p_first_name text default '',
  p_last_name text default '',
  p_company_name text default 'My Company',
  p_city text default null,
  p_state text default null,
  p_postal_code text default null,
  p_timezone text default 'America/New_York'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  target_organization_id uuid;
  safe_company_name text := nullif(trim(p_company_name), '');
begin
  if current_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select membership.organization_id
    into target_organization_id
  from public.organization_members as membership
  where membership.user_id = current_user_id
  order by membership.created_at
  limit 1;

  insert into public.profiles (id, first_name, last_name)
  values (current_user_id, left(trim(p_first_name), 100), left(trim(p_last_name), 100))
  on conflict (id) do update
    set first_name = excluded.first_name,
        last_name = excluded.last_name,
        updated_at = now();

  if target_organization_id is not null then
    return target_organization_id;
  end if;

  insert into public.organizations (name, city, state, postal_code, timezone)
  values (
    left(coalesce(safe_company_name, 'My Company'), 160),
    nullif(left(trim(coalesce(p_city, '')), 120), ''),
    nullif(left(trim(coalesce(p_state, '')), 80), ''),
    nullif(left(trim(coalesce(p_postal_code, '')), 20), ''),
    coalesce(nullif(trim(p_timezone), ''), 'America/New_York')
  )
  returning id into target_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (target_organization_id, current_user_id, 'OWNER');

  insert into public.organization_settings (
    organization_id,
    approval_mode,
    monthly_budget,
    notification_preferences,
    reminder_days,
    celebration_style,
    onboarding_completed
  ) values (
    target_organization_id,
    'approval_required',
    500,
    jsonb_build_object(
      'eventReminders', true,
      'budgetAlerts', true,
      'rewardFailures', true,
      'deliveryUpdates', true
    ),
    array[30,14,7,3,1]::smallint[],
    'both',
    false
  );

  insert into public.departments (organization_id, name)
  values (target_organization_id, 'General');

  insert into public.celebration_types (
    organization_id, name, slug, category, manual_only
  ) values
    (target_organization_id, 'Birthday', 'birthday', 'life', false),
    (target_organization_id, 'Work Anniversary', 'work-anniversary', 'career', false),
    (target_organization_id, 'New Hire', 'new-hire', 'career', false),
    (target_organization_id, 'Promotion', 'promotion', 'career', true),
    (target_organization_id, 'Project Completion', 'project-completion', 'career', true),
    (target_organization_id, 'Above & Beyond', 'above-and-beyond', 'career', true),
    (target_organization_id, 'Team Achievement', 'team-achievement', 'career', true),
    (target_organization_id, 'Custom Milestone', 'custom-milestone', 'life', true);

  insert into public.approval_policies (
    organization_id, name, reward_type, minimum_amount, maximum_amount,
    approval_level, active
  ) values
    (target_organization_id, 'Small recognition', 'digital', 0, 25, 'automatic', true),
    (target_organization_id, 'Manager review', 'digital', 25.01, 100, 'manager', true),
    (target_organization_id, 'Admin review', 'local', 0, null, 'admin', true);

  insert into public.notifications (
    organization_id, user_id, type, title, body, channel,
    entity_type, entity_id, action_label, action_href
  ) values (
    target_organization_id,
    current_user_id,
    'automation_run',
    'Your PerkJoy workspace is ready',
    'Add your team and choose the moments PerkJoy should remember.',
    'in_app',
    'organization',
    target_organization_id,
    'Start setup',
    '/onboarding'
  );

  return target_organization_id;
end;
$$;

revoke all on function public.bootstrap_perkjoy_workspace(text, text, text, text, text, text, text)
  from public, anon;
grant execute on function public.bootstrap_perkjoy_workspace(text, text, text, text, text, text, text)
  to authenticated;

comment on function public.bootstrap_perkjoy_workspace(text, text, text, text, text, text, text)
  is 'Creates one OWNER workspace for the authenticated user. Authorization always comes from auth.uid(), never user metadata.';

-- Cover foreign keys used by tenant filters, joins, and delete cascades.
create index if not exists idx_approval_requests_requested_by on public.approval_requests(requested_by);
create index if not exists idx_approval_requests_decided_by on public.approval_requests(decided_by);
create index if not exists idx_audit_logs_user on public.audit_logs(user_id);
create index if not exists idx_automation_rules_vendor_product on public.automation_rules(vendor_product_id);
create index if not exists idx_automation_rules_department on public.automation_rules(applicable_department_id);
create index if not exists idx_bundles_vendor on public.bundles(vendor_id);
create index if not exists idx_concierge_event on public.concierge_requests(employee_event_id);
create index if not exists idx_employee_events_type on public.employee_events(celebration_type_id);
create index if not exists idx_employees_department on public.employees(department_id);
create index if not exists idx_employees_manager on public.employees(manager_employee_id);
create index if not exists idx_gift_history_recommendation on public.gift_history(recommendation_id);
create index if not exists idx_local_orders_employee on public.local_gift_orders(employee_id);
create index if not exists idx_local_orders_product on public.local_gift_orders(product_id);
create index if not exists idx_recognition_events_employee on public.recognition_events(employee_id);
create index if not exists idx_recognition_events_rule on public.recognition_events(rule_id);
create index if not exists idx_rewards_recognition_event on public.rewards(recognition_event_id);
create index if not exists idx_rewards_employee on public.rewards(employee_id);

-- Clearly labelled demonstration catalog for the Philadelphia launch preview.
insert into public.markets (name, slug, city, state, active, launch_status)
values ('Philadelphia', 'philadelphia', 'Philadelphia', 'PA', true, 'active')
on conflict (slug) do update
  set active = excluded.active,
      launch_status = excluded.launch_status,
      updated_at = now();

insert into public.vendors (
  business_name, slug, description, city, state, postal_code,
  service_area, minimum_notice_hours, active, featured, demo
)
values
  ('Demo Philadelphia Bakery', 'demo-philadelphia-bakery', 'Demonstration bakery catalog for PerkJoy testing.', 'Philadelphia', 'PA', '19103', '{"market":"philadelphia"}'::jsonb, 48, true, true, true),
  ('Demo Philadelphia Confectioner', 'demo-philadelphia-confectioner', 'Demonstration treat-box catalog for PerkJoy testing.', 'Philadelphia', 'PA', '19107', '{"market":"philadelphia"}'::jsonb, 48, true, false, true),
  ('Demo Philadelphia Florist', 'demo-philadelphia-florist', 'Demonstration floral catalog for PerkJoy testing.', 'Philadelphia', 'PA', '19102', '{"market":"philadelphia"}'::jsonb, 48, true, false, true)
on conflict (slug) do update
  set active = excluded.active,
      demo = true,
      updated_at = now();

update public.vendors
set market_id = (select id from public.markets where slug = 'philadelphia')
where slug in (
  'demo-philadelphia-bakery',
  'demo-philadelphia-confectioner',
  'demo-philadelphia-florist'
);

insert into public.vendor_products (
  vendor_id, name, description, category, retail_price, perkjoy_cost,
  delivery_fee, minimum_notice_hours, active, options, service_area,
  serves_people, lead_time_text, customer_price, vendor_cost,
  delivery_cost, platform_fee, gross_margin, rating, delivery_available
)
select vendor.id, product.name, product.description, product.category,
  product.customer_price, product.vendor_cost, product.delivery_cost,
  48, true, product.options, '{"market":"philadelphia"}'::jsonb,
  product.serves_people, '48 hours notice', product.customer_price,
  product.vendor_cost, product.delivery_cost, product.platform_fee,
  product.customer_price - product.vendor_cost - product.delivery_cost,
  product.rating, true
from (
  values
    ('demo-philadelphia-bakery', 'Chocolate Celebration Cake', 'Six-inch chocolate cake with joyful buttercream and a handwritten card.', 'Birthday Cakes', 49.00::numeric, 29.00::numeric, 12.00::numeric, 8.00::numeric, 4.9::numeric, 10, '{"flavor":["Chocolate","Vanilla"],"icing":["Chocolate","Vanilla"]}'::jsonb),
    ('demo-philadelphia-bakery', 'Office Birthday Cupcakes', 'Twenty-four confetti cupcakes with a personalized celebration card.', 'Cupcakes', 89.00::numeric, 57.00::numeric, 12.00::numeric, 20.00::numeric, 4.8::numeric, 24, '{"flavor":["Confetti","Chocolate"]}'::jsonb),
    ('demo-philadelphia-confectioner', 'Team Treat Box', 'Cookies, brownies, and locally inspired sweets packed for sharing.', 'Treat Boxes', 56.00::numeric, 35.00::numeric, 9.00::numeric, 12.00::numeric, 4.9::numeric, 8, '{}'::jsonb),
    ('demo-philadelphia-florist', 'Bright Day Bouquet', 'Seasonal flowers arranged for a desk, home office, or celebration table.', 'Flowers', 62.00::numeric, 38.00::numeric, 14.00::numeric, 10.00::numeric, 4.8::numeric, 1, '{}'::jsonb)
) as product(vendor_slug, name, description, category, customer_price, vendor_cost, delivery_cost, platform_fee, rating, serves_people, options)
join public.vendors as vendor on vendor.slug = product.vendor_slug
where not exists (
  select 1 from public.vendor_products existing
  where existing.vendor_id = vendor.id and existing.name = product.name
);

insert into public.vendor_availability (
  vendor_id, market_id, minimum_notice_hours, available_days,
  fulfillment_method
)
select vendor.id, market.id, vendor.minimum_notice_hours,
  array[1,2,3,4,5,6]::smallint[], 'perkjoy_arranged'
from public.vendors as vendor
cross join public.markets as market
where vendor.demo and vendor.market_id = market.id and market.slug = 'philadelphia'
on conflict (vendor_id, market_id) do nothing;

insert into public.marketplace_listings (
  product_id, market_id, vendor_availability_id, rating,
  preference_tags, active
)
select product.id, availability.market_id, availability.id, product.rating,
  case product.category
    when 'Birthday Cakes' then array['cake','birthday','chocolate']::text[]
    when 'Cupcakes' then array['cupcakes','birthday','team']::text[]
    when 'Treat Boxes' then array['cookies','treats','team']::text[]
    else array['flowers','bouquet']::text[]
  end,
  true
from public.vendor_products as product
join public.vendors as vendor on vendor.id = product.vendor_id and vendor.demo
join public.vendor_availability as availability on availability.vendor_id = vendor.id
on conflict (product_id, market_id) do update
  set active = excluded.active,
      rating = excluded.rating,
      preference_tags = excluded.preference_tags,
      updated_at = now();
