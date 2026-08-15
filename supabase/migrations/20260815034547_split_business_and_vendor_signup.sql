-- Provision the correct account model at signup. The selected account type is
-- used only to create server-owned memberships; authorization is subsequently
-- based on organization_members/vendor_members, never editable user metadata.

create or replace function private.handle_perkjoy_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  vendor_id uuid;
  vendor_name text;
  vendor_slug text;
begin
  if lower(coalesce(metadata->>'account_type', 'business')) = 'vendor' then
    insert into public.profiles (id, first_name, last_name)
    values (new.id, coalesce(metadata->>'first_name', ''), coalesce(metadata->>'last_name', ''))
    on conflict (id) do update set
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      updated_at = now();

    vendor_name := coalesce(nullif(trim(metadata->>'business_name'), ''), nullif(trim(metadata->>'company_name'), ''), 'My PerkJoy Local business');
    vendor_slug := trim(both '-' from regexp_replace(lower(vendor_name), '[^a-z0-9]+', '-', 'g')) || '-' || left(replace(new.id::text, '-', ''), 8);

    insert into public.vendors (business_name, slug, email, city, state, postal_code, service_area, active, demo)
    values (
      vendor_name,
      vendor_slug,
      coalesce(new.email, metadata->>'email'),
      coalesce(metadata->>'city', ''),
      upper(coalesce(metadata->>'state', '')),
      nullif(trim(metadata->>'postal_code'), ''),
      jsonb_build_object('city', coalesce(metadata->>'city', ''), 'state', upper(coalesce(metadata->>'state', ''))),
      false,
      false
    )
    returning id into vendor_id;

    insert into public.vendor_members (vendor_id, user_id, role)
    values (vendor_id, new.id, 'OWNER')
    on conflict (vendor_id, user_id) do nothing;
  else
    perform private.provision_perkjoy_workspace(new.id, metadata);
  end if;
  return new;
end;
$$;

revoke all on function private.handle_perkjoy_auth_user() from public, anon, authenticated;
