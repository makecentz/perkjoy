-- Phase D: market-specific product listings and private preference matching metadata.
create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.vendor_products(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  vendor_availability_id uuid not null references public.vendor_availability(id) on delete cascade,
  rating numeric(2,1) check (rating between 0 and 5),
  preference_tags text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, market_id)
);

create index if not exists idx_marketplace_listings_market_active on public.marketplace_listings(market_id, active);
create index if not exists idx_marketplace_listings_availability on public.marketplace_listings(vendor_availability_id);

alter table public.marketplace_listings enable row level security;

create policy marketplace_listings_authenticated_select on public.marketplace_listings
  for select to authenticated
  using (active and exists (select 1 from public.markets m where m.id = market_id and m.active));

grant select on public.marketplace_listings to authenticated;

create trigger set_updated_at before update on public.marketplace_listings
  for each row execute function private.set_updated_at();

comment on column public.marketplace_listings.preference_tags is 'Server-side matching hints. Never expose the employee preference values used to match them.';
