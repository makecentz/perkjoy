-- Authenticated admins can create opaque profile invitations without reading them back.
create policy profile_invitations_admin_insert on public.celebration_profile_invitations
  for insert to authenticated
  with check (
    private.has_org_role(
      organization_id,
      array['OWNER','ADMIN']::public.organization_role[]
    )
  );

grant insert on public.celebration_profile_invitations to authenticated;

create or replace function public.read_celebration_profile_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if p_token is null
    or length(p_token) < 40
    or length(p_token) > 128
    or p_token !~ '^[A-Za-z0-9_-]+$'
  then
    return null;
  end if;

  select jsonb_build_object(
    'firstName', employee.first_name,
    'organizationName', organization.name,
    'completeness', profile.completeness,
    'privacyMode', profile.privacy_mode,
    'preferredDelivery', profile.preferred_delivery,
    'preferences', case when preference.id is null then null else jsonb_build_object(
      'food', preference.food,
      'rewards', preference.rewards,
      'interests', to_jsonb(preference.interests),
      'shirtSize', coalesce(preference.shirt_size, ''),
      'dietary', to_jsonb(preference.dietary_preferences)
    ) end
  )
  into result
  from public.celebration_profile_invitations as invitation
  join public.employees as employee on employee.id = invitation.employee_id
  join public.organizations as organization on organization.id = invitation.organization_id
  join public.celebration_profiles as profile on profile.employee_id = employee.id
  left join public.celebration_preferences as preference on preference.employee_id = employee.id
  where invitation.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and invitation.expires_at > now()
    and invitation.used_at is null
  limit 1;

  return result;
end;
$$;

revoke all on function public.read_celebration_profile_invite(text) from public;
grant execute on function public.read_celebration_profile_invite(text) to anon, authenticated;

comment on function public.read_celebration_profile_invite(text)
  is 'Uses a high-entropy, expiring bearer token as custom authentication for one employee profile.';

create or replace function public.complete_celebration_profile_invite(
  p_token text,
  p_payload jsonb
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_row public.celebration_profile_invitations%rowtype;
  target_profile public.celebration_profiles%rowtype;
  safe_completeness integer;
  safe_privacy text;
  safe_delivery text;
begin
  if p_token is null
    or length(p_token) < 40
    or length(p_token) > 128
    or p_token !~ '^[A-Za-z0-9_-]+$'
  then
    raise exception 'Invalid or expired invitation' using errcode = '22023';
  end if;

  select * into invitation_row
  from public.celebration_profile_invitations
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and expires_at > now()
    and used_at is null
  for update;

  if invitation_row.id is null then
    raise exception 'Invalid or expired invitation' using errcode = '22023';
  end if;

  select * into target_profile
  from public.celebration_profiles
  where employee_id = invitation_row.employee_id
    and organization_id = invitation_row.organization_id;

  safe_completeness := greatest(0, least(100, coalesce((p_payload->>'completeness')::integer, 0)));
  safe_privacy := case when p_payload->>'privacyMode' = 'share_with_hr' then 'share_with_hr' else 'recommendations_only' end;
  safe_delivery := case when p_payload->>'preferredDelivery' in ('workplace','home','digital_only') then p_payload->>'preferredDelivery' else 'workplace' end;

  insert into public.celebration_preferences (
    organization_id,
    employee_id,
    food,
    rewards,
    interests,
    shirt_size,
    dietary_preferences,
    share_with_hr
  ) values (
    invitation_row.organization_id,
    invitation_row.employee_id,
    coalesce(p_payload->'food', '{}'::jsonb),
    coalesce(p_payload->'rewards', '{}'::jsonb),
    coalesce(array(select jsonb_array_elements_text(p_payload->'interests')), '{}'::text[]),
    nullif(left(coalesce(p_payload->>'shirtSize', ''), 12), ''),
    coalesce(array(select jsonb_array_elements_text(p_payload->'dietary')), '{}'::text[]),
    safe_privacy = 'share_with_hr'
  )
  on conflict (employee_id) do update
    set food = excluded.food,
        rewards = excluded.rewards,
        interests = excluded.interests,
        shirt_size = excluded.shirt_size,
        dietary_preferences = excluded.dietary_preferences,
        share_with_hr = excluded.share_with_hr,
        updated_at = now();

  update public.celebration_profiles
  set completeness = safe_completeness,
      privacy_mode = safe_privacy,
      preferred_delivery = safe_delivery,
      updated_at = now()
  where id = target_profile.id;

  update public.celebration_profile_invitations
  set used_at = now()
  where id = invitation_row.id;

  insert into public.audit_logs (
    organization_id, action, entity_type, entity_id, metadata
  ) values (
    invitation_row.organization_id,
    'celebration_profile.updated',
    'celebration_profile',
    target_profile.id,
    jsonb_build_object('completeness', safe_completeness, 'privacyMode', safe_privacy)
  );

  return safe_completeness;
end;
$$;

revoke all on function public.complete_celebration_profile_invite(text, jsonb) from public;
grant execute on function public.complete_celebration_profile_invite(text, jsonb) to anon, authenticated;

comment on function public.complete_celebration_profile_invite(text, jsonb)
  is 'Consumes a high-entropy invitation once and writes only the matching employee profile.';

-- Hidden marketplace costs are resolved inside this authenticated function.
create or replace function public.create_perkjoy_local_order(
  p_employee_id uuid,
  p_product_id uuid,
  p_delivery_date date,
  p_gift_message text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  target_order_id uuid;
  target_employee public.employees%rowtype;
  target_product public.vendor_products%rowtype;
  target_organization public.organizations%rowtype;
  target_availability public.vendor_availability%rowtype;
  target_listing public.marketplace_listings%rowtype;
begin
  select * into target_employee
  from public.employees
  where id = p_employee_id;

  target_organization_id := target_employee.organization_id;
  if target_organization_id is null or not private.has_org_role(
    target_organization_id,
    array['OWNER','ADMIN']::public.organization_role[]
  ) then
    raise exception 'Employee not found or access denied' using errcode = '42501';
  end if;

  select * into target_product
  from public.vendor_products
  where id = p_product_id and active;

  select listing.* into target_listing
  from public.marketplace_listings as listing
  join public.markets as market on market.id = listing.market_id and market.active
  where listing.product_id = p_product_id and listing.active
  limit 1;

  select * into target_availability
  from public.vendor_availability
  where id = target_listing.vendor_availability_id;

  if target_product.id is null or target_availability.id is null then
    raise exception 'Product is not available in an active market' using errcode = '22023';
  end if;

  if p_delivery_date::timestamp < now() + make_interval(hours => target_availability.minimum_notice_hours) then
    raise exception 'The selected delivery date does not meet the minimum notice window' using errcode = '22023';
  end if;

  if not extract(dow from p_delivery_date)::smallint = any(target_availability.available_days)
    or p_delivery_date = any(target_availability.blackout_dates)
  then
    raise exception 'The vendor is unavailable on the selected date' using errcode = '22023';
  end if;

  select * into target_organization
  from public.organizations
  where id = target_organization_id;

  insert into public.local_gift_orders (
    organization_id,
    employee_id,
    product_id,
    delivery_address,
    delivery_date,
    gift_message,
    customer_amount,
    vendor_cost,
    delivery_fee,
    status
  ) values (
    target_organization_id,
    p_employee_id,
    p_product_id,
    jsonb_build_object(
      'city', coalesce(target_employee.city, target_organization.city),
      'state', coalesce(target_employee.state, target_organization.state),
      'postalCode', coalesce(target_employee.postal_code, target_organization.postal_code),
      'addressLine1', target_employee.address_line_1,
      'addressLine2', target_employee.address_line_2
    ),
    p_delivery_date,
    left(coalesce(p_gift_message, ''), 500),
    target_product.customer_price,
    target_product.vendor_cost,
    target_product.delivery_cost,
    'pending_payment'
  ) returning id into target_order_id;

  return target_order_id;
end;
$$;

revoke all on function public.create_perkjoy_local_order(uuid, uuid, date, text) from public, anon;
grant execute on function public.create_perkjoy_local_order(uuid, uuid, date, text) to authenticated;

comment on function public.create_perkjoy_local_order(uuid, uuid, date, text)
  is 'Creates a tenant-scoped local order while keeping vendor cost fields server-side.';
