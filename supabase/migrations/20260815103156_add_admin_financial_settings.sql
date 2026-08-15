-- Add a server-managed global marketplace fee and freeze the applied rate on
-- every order so financial history does not change when an admin edits it.

create table public.platform_financial_settings (
  id boolean primary key default true check (id),
  local_transaction_fee_bps integer not null default 2000
    check (local_transaction_fee_bps between 0 and 5000),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.platform_financial_settings is
  'Server-only PerkJoy financial configuration. The singleton row controls the Local transaction fee.';
comment on column public.platform_financial_settings.local_transaction_fee_bps is
  'PerkJoy fee in basis points, applied to the merchandise subtotal and frozen on each order.';

alter table public.platform_financial_settings enable row level security;
revoke all on public.platform_financial_settings from public, anon, authenticated;
grant select, insert, update on public.platform_financial_settings to service_role;

insert into public.platform_financial_settings (id, local_transaction_fee_bps)
values (true, 2000)
on conflict (id) do nothing;

alter table public.local_gift_orders
  add column platform_fee_rate_bps integer not null default 0
    check (platform_fee_rate_bps between 0 and 5000),
  add column platform_fee_amount numeric(12,2) not null default 0
    check (platform_fee_amount >= 0);

update public.local_gift_orders as gift_order
set platform_fee_amount = coalesce(product.platform_fee, 0),
    platform_fee_rate_bps = case
      when gift_order.customer_amount > 0 then least(
        5000,
        round(product.platform_fee * 10000 / gift_order.customer_amount)::integer
      )
      else 0
    end
from public.vendor_products as product
where product.id = gift_order.product_id;

create or replace function private.freeze_local_order_platform_fee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  configured_rate integer;
begin
  select settings.local_transaction_fee_bps
    into configured_rate
  from public.platform_financial_settings as settings
  where settings.id = true;

  new.platform_fee_rate_bps := coalesce(configured_rate, 2000);
  new.platform_fee_amount := round(
    coalesce(new.customer_amount, 0) * new.platform_fee_rate_bps / 10000,
    2
  );
  return new;
end;
$$;

revoke all on function private.freeze_local_order_platform_fee()
  from public, anon, authenticated;

drop trigger if exists zz_freeze_local_order_platform_fee on public.local_gift_orders;
create trigger zz_freeze_local_order_platform_fee
  before insert on public.local_gift_orders
  for each row execute function private.freeze_local_order_platform_fee();
