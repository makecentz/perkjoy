alter table public.vendors
  add column if not exists stripe_account_id text,
  add column if not exists stripe_details_submitted boolean not null default false,
  add column if not exists stripe_charges_enabled boolean not null default false,
  add column if not exists stripe_payouts_enabled boolean not null default false,
  add column if not exists stripe_connected_at timestamptz;

create unique index if not exists vendors_stripe_account_id_unique
  on public.vendors (stripe_account_id)
  where stripe_account_id is not null;

alter table public.local_gift_orders
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_transfer_id text,
  add column if not exists paid_at timestamptz;

create unique index if not exists local_gift_orders_checkout_session_unique
  on public.local_gift_orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists local_gift_orders_payment_intent_idx
  on public.local_gift_orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create table if not exists public.vendor_members (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'STAFF' check (role in ('OWNER','STAFF')),
  created_at timestamptz not null default now(),
  unique (vendor_id, user_id)
);

create index if not exists vendor_members_user_vendor_idx
  on public.vendor_members (user_id, vendor_id);

alter table public.vendor_members enable row level security;

drop policy if exists vendor_members_select_own on public.vendor_members;
create policy vendor_members_select_own
  on public.vendor_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.is_super_admin
    )
  );

revoke all on public.vendor_members from anon, authenticated;
grant select on public.vendor_members to authenticated;

create table if not exists public.payment_provider_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

alter table public.payment_provider_events enable row level security;
revoke all on public.payment_provider_events from anon, authenticated;
grant select, insert, update, delete on public.payment_provider_events to service_role;

create index if not exists payment_provider_events_created_idx
  on public.payment_provider_events (created_at desc);

comment on column public.vendors.stripe_account_id is
  'Server-only Stripe Connect account identifier. Never expose through customer catalog queries.';
comment on table public.payment_provider_events is
  'Verified, idempotent payment webhook event ledger. Server access only.';

