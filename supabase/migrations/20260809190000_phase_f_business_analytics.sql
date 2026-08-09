-- Phase F: internal revenue fields and server-authorized business metrics.
alter table public.subscriptions
  add column if not exists monthly_recurring_revenue numeric(12,2) not null default 0 check (monthly_recurring_revenue >= 0);

alter table public.concierge_requests
  add column if not exists service_fee numeric(12,2) not null default 0 check (service_fee >= 0);

create index if not exists idx_subscriptions_status on public.subscriptions(subscription_status);

create or replace function private.super_admin_business_metrics()
returns jsonb
language plpgsql
security definer
set search_path = public, private
as $$
declare
  result jsonb;
begin
  if not exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and is_super_admin
  ) then
    raise exception 'Super Admin access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'mrr', coalesce((select sum(monthly_recurring_revenue) from public.subscriptions where subscription_status = 'active'), 0),
    'active_organizations', (select count(*) from public.subscriptions where subscription_status = 'active'),
    'trial_organizations', (select count(*) from public.subscriptions where subscription_status = 'trial'),
    'employees_managed', (select count(*) from public.employees where status = 'active'),
    'moments_handled', (select count(*) from public.employee_events where status in ('scheduled','handled','delivered')),
    'digital_reward_volume', coalesce((select sum(amount) from public.rewards), 0),
    'local_marketplace_gmv', coalesce((select sum(customer_amount) from public.local_gift_orders), 0),
    'marketplace_revenue', coalesce((select sum(vp.platform_fee) from public.local_gift_orders o join public.vendor_products vp on vp.id = o.product_id), 0),
    'average_order_value', coalesce((select avg(customer_amount) from public.local_gift_orders), 0),
    'gross_marketplace_margin', coalesce((select round(100 * sum(customer_amount - vendor_cost - delivery_fee) / nullif(sum(customer_amount), 0), 1) from public.local_gift_orders), 0),
    'concierge_revenue', coalesce((select sum(service_fee) from public.concierge_requests where status in ('approved','ordered','delivered')), 0),
    'orders_this_week', (select count(*) from public.local_gift_orders where created_at >= now() - interval '7 days'),
    'failed_orders', (select count(*) from public.local_gift_orders where status in ('issue','cancelled','refunded'))
  ) into result;

  return result;
end;
$$;

revoke all on function private.super_admin_business_metrics() from public, anon;
grant execute on function private.super_admin_business_metrics() to authenticated;

comment on function private.super_admin_business_metrics() is 'Returns cross-organization business analytics only after a server-managed Super Admin role check.';

