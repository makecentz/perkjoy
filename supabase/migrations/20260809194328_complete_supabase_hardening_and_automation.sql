-- Complete PerkJoy's Supabase hardening and server-side automation.

-- ---------------------------------------------------------------------------
-- Auth-time workspace provisioning
-- ---------------------------------------------------------------------------

create or replace function private.provision_perkjoy_workspace(
  p_user_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  safe_company_name text := nullif(trim(coalesce(p_metadata->>'company_name', '')), '');
  safe_timezone text := coalesce(nullif(trim(p_metadata->>'timezone'), ''), 'America/New_York');
begin
  if p_user_id is null or not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'A valid auth user is required' using errcode = '23503';
  end if;

  perform pg_advisory_xact_lock(hashtext('perkjoy-workspace:' || p_user_id::text));

  select membership.organization_id
    into target_organization_id
  from public.organization_members as membership
  where membership.user_id = p_user_id
  order by membership.created_at
  limit 1;

  insert into public.profiles (id, first_name, last_name)
  values (
    p_user_id,
    left(trim(coalesce(p_metadata->>'first_name', '')), 100),
    left(trim(coalesce(p_metadata->>'last_name', '')), 100)
  )
  on conflict (id) do nothing;

  if target_organization_id is not null then
    return target_organization_id;
  end if;

  if not exists (select 1 from pg_catalog.pg_timezone_names where name = safe_timezone) then
    safe_timezone := 'America/New_York';
  end if;

  insert into public.organizations (name, city, state, postal_code, timezone)
  values (
    left(coalesce(safe_company_name, 'My Company'), 160),
    nullif(left(trim(coalesce(p_metadata->>'city', '')), 120), ''),
    nullif(left(trim(coalesce(p_metadata->>'state', '')), 80), ''),
    nullif(left(trim(coalesce(p_metadata->>'postal_code', '')), 20), ''),
    safe_timezone
  )
  returning id into target_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (target_organization_id, p_user_id, 'OWNER');

  insert into public.organization_settings (
    organization_id, approval_mode, monthly_budget, notification_preferences,
    reminder_days, celebration_style, onboarding_completed
  ) values (
    target_organization_id, 'approval_required', 500,
    jsonb_build_object(
      'eventReminders', true,
      'budgetAlerts', true,
      'rewardFailures', true,
      'deliveryUpdates', true
    ),
    array[30,14,7,3,1]::smallint[], 'both', false
  );

  insert into public.departments (organization_id, name)
  values (target_organization_id, 'General');

  insert into public.celebration_types (organization_id, name, slug, category, manual_only)
  values
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
    target_organization_id, p_user_id, 'automation_run',
    'Your PerkJoy workspace is ready',
    'Add your team and choose the moments PerkJoy should remember.',
    'in_app', 'organization', target_organization_id, 'Start setup', '/onboarding'
  );

  return target_organization_id;
end;
$$;

revoke all on function private.provision_perkjoy_workspace(uuid, jsonb)
  from public, anon, authenticated;

create or replace function private.handle_perkjoy_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.provision_perkjoy_workspace(new.id, coalesce(new.raw_user_meta_data, '{}'::jsonb));
  return new;
end;
$$;

revoke all on function private.handle_perkjoy_auth_user()
  from public, anon, authenticated;

drop trigger if exists on_perkjoy_auth_user_created on auth.users;
create trigger on_perkjoy_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_perkjoy_auth_user();

-- Backfill any pre-existing account that has not yet received a workspace.
do $$
declare
  auth_user record;
begin
  for auth_user in
    select users.id, users.raw_user_meta_data
    from auth.users as users
    where not exists (
      select 1 from public.organization_members as membership
      where membership.user_id = users.id
    )
  loop
    perform private.provision_perkjoy_workspace(
      auth_user.id,
      coalesce(auth_user.raw_user_meta_data, '{}'::jsonb)
    );
  end loop;
end;
$$;

-- Keep the old RPC as a read-only compatibility shim while clients roll forward.
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
language sql
stable
security invoker
set search_path = ''
as $$
  select membership.organization_id
  from public.organization_members as membership
  where membership.user_id = (select auth.uid())
  order by membership.created_at
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- Profile invite data is reachable only through a custom-auth Edge Function.
-- ---------------------------------------------------------------------------

alter function public.read_celebration_profile_invite(text)
  rename to read_celebration_profile_invite_internal;
alter function public.complete_celebration_profile_invite(text, jsonb)
  rename to complete_celebration_profile_invite_internal;

revoke all on function public.read_celebration_profile_invite_internal(text)
  from public, anon, authenticated;
revoke all on function public.complete_celebration_profile_invite_internal(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.read_celebration_profile_invite_internal(text)
  to service_role;
grant execute on function public.complete_celebration_profile_invite_internal(text, jsonb)
  to service_role;

comment on function public.read_celebration_profile_invite_internal(text)
  is 'Service-role-only implementation used by the perkjoy-profile Edge Function.';
comment on function public.complete_celebration_profile_invite_internal(text, jsonb)
  is 'Service-role-only atomic invitation consumer used by the perkjoy-profile Edge Function.';

-- Explicit deny policies document that these backend-only tables are never
-- accessed directly from browser roles.
create policy celebration_preferences_no_direct_access
  on public.celebration_preferences
  for all to anon, authenticated
  using (false)
  with check (false);

create policy reward_provider_events_no_direct_access
  on public.reward_provider_events
  for all to anon, authenticated
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- Local-order integrity: clients supply intent; the database supplies secrets.
-- ---------------------------------------------------------------------------

create or replace function private.prepare_perkjoy_local_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_employee public.employees%rowtype;
  target_product public.vendor_products%rowtype;
  target_organization public.organizations%rowtype;
  target_availability public.vendor_availability%rowtype;
begin
  select * into target_employee
  from public.employees
  where id = new.employee_id;

  if target_employee.id is null
    or new.organization_id is distinct from target_employee.organization_id
    or not private.has_org_role(
      target_employee.organization_id,
      array['OWNER','ADMIN']::public.organization_role[]
    )
  then
    raise exception 'Employee not found or access denied' using errcode = '42501';
  end if;

  select product.* into target_product
  from public.vendor_products as product
  where product.id = new.product_id and product.active;

  select availability.* into target_availability
  from public.marketplace_listings as listing
  join public.markets as market
    on market.id = listing.market_id and market.active
  join public.vendor_availability as availability
    on availability.id = listing.vendor_availability_id
  where listing.product_id = new.product_id and listing.active
  order by listing.created_at
  limit 1;

  if target_product.id is null or target_availability.id is null then
    raise exception 'Product is not available in an active market' using errcode = '22023';
  end if;

  if new.delivery_date::timestamp < now() + make_interval(hours => target_availability.minimum_notice_hours) then
    raise exception 'The selected delivery date does not meet the minimum notice window' using errcode = '22023';
  end if;

  if not extract(dow from new.delivery_date)::smallint = any(target_availability.available_days)
    or new.delivery_date = any(target_availability.blackout_dates)
  then
    raise exception 'The vendor is unavailable on the selected date' using errcode = '22023';
  end if;

  select * into target_organization
  from public.organizations
  where id = target_employee.organization_id;

  new.organization_id := target_employee.organization_id;
  new.delivery_address := jsonb_build_object(
    'city', coalesce(target_employee.city, target_organization.city),
    'state', coalesce(target_employee.state, target_organization.state),
    'postalCode', coalesce(target_employee.postal_code, target_organization.postal_code),
    'addressLine1', target_employee.address_line_1,
    'addressLine2', target_employee.address_line_2
  );
  new.options := coalesce(new.options, '{}'::jsonb);
  new.gift_message := left(coalesce(new.gift_message, ''), 500);
  new.customer_amount := target_product.customer_price;
  new.vendor_cost := target_product.vendor_cost;
  new.delivery_fee := target_product.delivery_cost;
  new.status := 'pending_payment';
  new.internal_notes := null;
  return new;
end;
$$;

revoke all on function private.prepare_perkjoy_local_order()
  from public, anon, authenticated;

drop trigger if exists prepare_perkjoy_local_order on public.local_gift_orders;
create trigger prepare_perkjoy_local_order
  before insert on public.local_gift_orders
  for each row execute function private.prepare_perkjoy_local_order();

create or replace function public.create_perkjoy_local_order(
  p_employee_id uuid,
  p_product_id uuid,
  p_delivery_date date,
  p_gift_message text default ''
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_organization_id uuid;
  target_order_id uuid;
begin
  select employee.organization_id into target_organization_id
  from public.employees as employee
  where employee.id = p_employee_id;

  if target_organization_id is null then
    raise exception 'Employee not found or access denied' using errcode = '42501';
  end if;

  insert into public.local_gift_orders (
    organization_id, employee_id, product_id, delivery_date, gift_message
  ) values (
    target_organization_id, p_employee_id, p_product_id, p_delivery_date, p_gift_message
  )
  returning id into target_order_id;

  return target_order_id;
end;
$$;

drop policy if exists local_gift_orders_admin_update on public.local_gift_orders;
drop policy if exists local_gift_orders_admin_delete on public.local_gift_orders;
drop policy if exists audit_logs_admin_update on public.audit_logs;
drop policy if exists audit_logs_admin_delete on public.audit_logs;

-- ---------------------------------------------------------------------------
-- Hourly, idempotent server-side automation.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;

create or replace function private.run_due_automations(
  p_reference_time timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  organization_row record;
  candidate record;
  owner_user_id uuid;
  local_date date;
  run_identifier text;
  reward_identifier uuid;
  run_identifier_uuid uuid;
  scheduled_total integer := 0;
  approval_total integer := 0;
  duplicate_total integer := 0;
  evaluated_total integer := 0;
  organization_scheduled integer;
  organization_approvals integer;
  organization_duplicates integer;
  organization_evaluated integer;
  organization_rules integer;
begin
  if not pg_try_advisory_xact_lock(hashtext('perkjoy-hourly-automation')) then
    return jsonb_build_object('status', 'already_running');
  end if;

  for organization_row in
    select organization.id, organization.timezone
    from public.organizations as organization
    where exists (
      select 1 from pg_catalog.pg_timezone_names as zone
      where zone.name = organization.timezone
    )
      and extract(hour from timezone(organization.timezone, p_reference_time)) = 9
  loop
    local_date := timezone(organization_row.timezone, p_reference_time)::date;
    run_identifier := 'scheduled:' || local_date::text;

    if exists (
      select 1 from public.automation_runs as existing_run
      where existing_run.organization_id = organization_row.id
        and existing_run.run_key = run_identifier
    ) then
      continue;
    end if;

    select membership.user_id into owner_user_id
    from public.organization_members as membership
    where membership.organization_id = organization_row.id
      and membership.role = 'OWNER'
    order by membership.created_at
    limit 1;

    organization_scheduled := 0;
    organization_approvals := 0;
    organization_duplicates := 0;
    organization_evaluated := 0;

    select count(*) into organization_rules
    from public.automation_rules as rule
    where rule.organization_id = organization_row.id and rule.active;

    for candidate in
      select
        rule.id as rule_id,
        rule.reward_type,
        rule.reward_amount,
        rule.approval_required,
        event.id as event_id,
        event.event_date,
        employee.id as employee_id,
        employee.first_name,
        employee.last_name,
        employee.email
      from public.automation_rules as rule
      join public.employee_events as event
        on event.organization_id = rule.organization_id
      join public.employees as employee
        on employee.id = event.employee_id
       and employee.organization_id = rule.organization_id
       and employee.status = 'active'
      left join public.celebration_types as celebration_type
        on celebration_type.id = event.celebration_type_id
      where rule.organization_id = organization_row.id
        and rule.active
        and event.status not in ('delivered', 'skipped')
        and event.event_date between local_date and local_date + rule.send_offset_days
        and (
          (lower(rule.event_type) like '%birthday%'
            and lower(event.title || ' ' || coalesce(celebration_type.name, '')) like '%birthday%')
          or (lower(rule.event_type) like '%anniversary%'
            and lower(event.title || ' ' || coalesce(celebration_type.name, '')) like '%anniversary%')
          or ((lower(rule.event_type) like '%new hire%' or lower(rule.event_type) like '%welcome%')
            and (lower(event.title || ' ' || coalesce(celebration_type.name, '')) like '%new hire%'
              or lower(event.title || ' ' || coalesce(celebration_type.name, '')) like '%welcome%'))
          or (
            lower(rule.event_type) not like '%birthday%'
            and lower(rule.event_type) not like '%anniversary%'
            and lower(rule.event_type) not like '%new hire%'
            and lower(rule.event_type) not like '%welcome%'
            and lower(event.title || ' ' || coalesce(celebration_type.name, '')) like '%' || lower(rule.event_type) || '%'
          )
        )
      order by event.event_date, rule.created_at
    loop
      organization_evaluated := organization_evaluated + 1;
      reward_identifier := null;

      insert into public.rewards (
        organization_id, employee_id, provider, amount,
        recipient_name, recipient_email, status, idempotency_key, test_mode
      ) values (
        organization_row.id,
        candidate.employee_id,
        case
          when lower(candidate.reward_type) like '%local%' then 'local_operations'
          when candidate.reward_amount > 0 then 'tremendous_sandbox'
          else 'recognition_only'
        end,
        candidate.reward_amount,
        trim(candidate.first_name || ' ' || candidate.last_name),
        candidate.email,
        case when candidate.approval_required then 'pending_approval' else 'scheduled' end,
        'automation:' || organization_row.id::text || ':' || candidate.employee_id::text || ':' || candidate.event_date::text || ':' || candidate.rule_id::text,
        true
      )
      on conflict (organization_id, idempotency_key) do nothing
      returning id into reward_identifier;

      if reward_identifier is null then
        organization_duplicates := organization_duplicates + 1;
        continue;
      end if;

      if candidate.approval_required then
        organization_approvals := organization_approvals + 1;
        insert into public.approval_requests (
          organization_id, requested_by, entity_type, entity_id,
          approval_level, amount
        ) values (
          organization_row.id, owner_user_id, 'reward', reward_identifier,
          'admin', candidate.reward_amount
        );
      else
        organization_scheduled := organization_scheduled + 1;
      end if;

      update public.employee_events
      set status = case when candidate.approval_required then 'approval_required' else 'scheduled' end,
          reward_summary = candidate.reward_type || ' - $' || trim(to_char(candidate.reward_amount, 'FM999999990.00')) ||
            case when candidate.approval_required then ' awaiting approval' else ' scheduled' end,
          handled_steps = case
            when candidate.approval_required then '["Rule matched","Approval requested"]'::jsonb
            else '["Rule matched","Reward scheduled","Duplicate protection active"]'::jsonb
          end,
          updated_at = now()
      where id = candidate.event_id;
    end loop;

    insert into public.automation_runs (
      organization_id, run_key, status, rules_evaluated, moments_evaluated,
      scheduled_count, approval_count, duplicate_count
    ) values (
      organization_row.id,
      run_identifier,
      case when organization_approvals > 0 then 'completed_with_attention' else 'completed' end,
      organization_rules,
      organization_evaluated,
      organization_scheduled,
      organization_approvals,
      organization_duplicates
    )
    returning id into run_identifier_uuid;

    if owner_user_id is not null then
      insert into public.notifications (
        organization_id, user_id, type, title, body, channel,
        entity_type, entity_id, action_label, action_href
      ) values (
        organization_row.id,
        owner_user_id,
        'automation_run',
        case
          when organization_scheduled + organization_approvals > 0
            then (organization_scheduled + organization_approvals)::text || ' moments moved forward'
          else 'Automation check complete'
        end,
        organization_rules::text || ' active rules checked. ' ||
          organization_scheduled::text || ' scheduled, ' ||
          organization_approvals::text || ' awaiting approval, ' ||
          organization_duplicates::text || ' duplicates safely skipped.',
        'in_app', 'automation_run', run_identifier_uuid, 'Review rules', '/rules'
      );
    end if;

    scheduled_total := scheduled_total + organization_scheduled;
    approval_total := approval_total + organization_approvals;
    duplicate_total := duplicate_total + organization_duplicates;
    evaluated_total := evaluated_total + organization_evaluated;
  end loop;

  return jsonb_build_object(
    'status', 'completed',
    'scheduled', scheduled_total,
    'approvals', approval_total,
    'duplicates', duplicate_total,
    'evaluated', evaluated_total
  );
end;
$$;

revoke all on function private.run_due_automations(timestamptz)
  from public, anon, authenticated;

do $$
declare
  existing_job bigint;
begin
  for existing_job in
    select jobid from cron.job where jobname = 'perkjoy-hourly-automation'
  loop
    perform cron.unschedule(existing_job);
  end loop;

  perform cron.schedule(
    'perkjoy-hourly-automation',
    '5 * * * *',
    'select private.run_due_automations();'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Least-privilege Data API grants.
-- ---------------------------------------------------------------------------

revoke all privileges on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid, public.organization_role[]) to authenticated;

-- Regrant only operations that have a matching authenticated RLS policy.
do $$
declare
  policy_operation record;
  privilege_name text;
begin
  for policy_operation in
    select distinct policy.tablename, policy.cmd
    from pg_catalog.pg_policies as policy
    where policy.schemaname = 'public'
      and 'authenticated' = any(policy.roles)
      and policy.tablename not in ('celebration_preferences', 'reward_provider_events')
  loop
    if policy_operation.cmd = 'ALL' then
      execute format(
        'grant select, insert, update, delete on table public.%I to authenticated',
        policy_operation.tablename
      );
    else
      privilege_name := lower(policy_operation.cmd);
      execute format(
        'grant %s on table public.%I to authenticated',
        privilege_name,
        policy_operation.tablename
      );
    end if;
  end loop;
end;
$$;

-- Browser roles never access backend-only or secret-bearing tables directly.
revoke all on public.celebration_preferences, public.reward_provider_events
  from anon, authenticated;

-- Contact and delivery-address fields remain available to trusted database
-- workflows but are not returned by ordinary browser queries.
revoke select on public.employees from authenticated;
grant select (
  id, organization_id, first_name, last_name, email,
  birthday_month, birthday_day, hire_date, department_id, job_title,
  manager_employee_id, work_location, recognition_preferences, status,
  work_mode, preferred_celebration_delivery, organization_location_id,
  created_at, updated_at
) on public.employees to authenticated;

revoke select on public.vendors from authenticated;
grant select (id, business_name, slug, demo, active, market_id)
  on public.vendors to authenticated;

revoke select on public.vendor_products from authenticated;
grant select (
  id, vendor_id, name, description, category, image_url, retail_price,
  delivery_fee, minimum_notice_hours, active, options, service_area,
  serves_people, lead_time_text, created_at, updated_at, customer_price,
  rating, delivery_available
) on public.vendor_products to authenticated;

revoke all on public.local_gift_orders from authenticated;
grant select (
  id, organization_id, employee_id, product_id, delivery_date, options,
  gift_message, customer_amount, delivery_fee, status, created_at, updated_at
) on public.local_gift_orders to authenticated;
grant insert (organization_id, employee_id, product_id, delivery_date, options, gift_message)
  on public.local_gift_orders to authenticated;

revoke update, delete on public.audit_logs from authenticated;

grant execute on function public.bootstrap_perkjoy_workspace(text, text, text, text, text, text, text)
  to authenticated;
grant execute on function public.create_perkjoy_local_order(uuid, uuid, date, text)
  to authenticated;

comment on function public.bootstrap_perkjoy_workspace(text, text, text, text, text, text, text)
  is 'Read-only compatibility lookup; workspace provisioning now occurs atomically from the auth.users trigger.';
comment on function public.create_perkjoy_local_order(uuid, uuid, date, text)
  is 'Security-invoker compatibility RPC. A protected trigger validates the order and fills all private pricing and delivery fields.';
