-- Media used by manually managed marketplace vendors and their listings.
alter table public.vendor_products
  add column if not exists image_urls text[] not null default '{}'::text[];

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-media',
  'vendor-media',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Catalog reads already depend on the existing active-vendor/product RLS policies.
-- Uploads and removals are deliberately kept behind the server-side service client.
grant select (image_urls) on public.vendor_products to authenticated;
