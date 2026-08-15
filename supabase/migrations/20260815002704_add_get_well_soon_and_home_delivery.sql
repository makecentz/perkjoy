-- Add employee-care moments and route physical gifts to the employee's saved
-- home-delivery address when that is their selected delivery preference.

insert into public.celebration_types (organization_id, name, slug, category, manual_only)
select organization.id, 'Get well soon', 'get-well-soon', 'life', true
from public.organizations as organization
on conflict (organization_id, slug) do update
set name = excluded.name, active = true, manual_only = true, updated_at = now();

create or replace function private.prepare_perkjoy_local_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target_employee public.employees%rowtype;
  target_product public.vendor_products%rowtype;
  target_organization public.organizations%rowtype;
  target_availability public.vendor_availability%rowtype;
  use_home_delivery boolean;
begin
  select * into target_employee from public.employees where id = new.employee_id;
  if target_employee.id is null or new.organization_id is distinct from target_employee.organization_id
    or not private.has_org_role(target_employee.organization_id, array['OWNER','ADMIN']::public.organization_role[])
  then raise exception 'Employee not found or access denied' using errcode = '42501'; end if;

  select product.* into target_product from public.vendor_products as product where product.id = new.product_id and product.active;
  select availability.* into target_availability
  from public.marketplace_listings as listing
  join public.markets as market on market.id = listing.market_id and market.active
  join public.vendor_availability as availability on availability.id = listing.vendor_availability_id
  where listing.product_id = new.product_id and listing.active order by listing.created_at limit 1;
  if target_product.id is null or target_availability.id is null then raise exception 'Product is not available in an active market' using errcode = '22023'; end if;
  if new.delivery_date::timestamp < now() + make_interval(hours => target_availability.minimum_notice_hours) then raise exception 'The selected delivery date does not meet the minimum notice window' using errcode = '22023'; end if;
  if not extract(dow from new.delivery_date)::smallint = any(target_availability.available_days) or new.delivery_date = any(target_availability.blackout_dates) then raise exception 'The vendor is unavailable on the selected date' using errcode = '22023'; end if;

  select * into target_organization from public.organizations where id = target_employee.organization_id;
  use_home_delivery := target_employee.preferred_celebration_delivery = 'home' or not target_employee.delivery_same_as_work;
  new.organization_id := target_employee.organization_id;
  new.delivery_address := jsonb_build_object(
    'city', case when use_home_delivery then coalesce(target_employee.delivery_city, target_employee.city, target_organization.city) else coalesce(target_employee.city, target_organization.city) end,
    'state', case when use_home_delivery then coalesce(target_employee.delivery_state, target_employee.state, target_organization.state) else coalesce(target_employee.state, target_organization.state) end,
    'postalCode', case when use_home_delivery then coalesce(target_employee.delivery_postal_code, target_employee.postal_code, target_organization.postal_code) else coalesce(target_employee.postal_code, target_organization.postal_code) end,
    'addressLine1', case when use_home_delivery then coalesce(target_employee.delivery_address_line_1, target_employee.address_line_1) else target_employee.address_line_1 end,
    'addressLine2', case when use_home_delivery then coalesce(target_employee.delivery_address_line_2, target_employee.address_line_2) else target_employee.address_line_2 end,
    'destination', case when use_home_delivery then 'home' else 'workplace' end
  );
  new.options := coalesce(new.options, '{}'::jsonb) || jsonb_build_object('deliveryDestination', case when use_home_delivery then 'home' else 'workplace' end);
  new.gift_message := left(coalesce(new.gift_message, ''), 500);
  new.customer_amount := target_product.customer_price; new.vendor_cost := target_product.vendor_cost; new.delivery_fee := target_product.delivery_cost;
  new.status := 'pending_payment'; new.internal_notes := null;
  return new;
end;
$$;

revoke all on function private.prepare_perkjoy_local_order() from public, anon, authenticated;
