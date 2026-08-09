-- Normalize display-name metadata from social identity providers before the
-- existing workspace-provisioning trigger runs. Authorization never depends
-- on these user-editable display fields.
create or replace function private.normalize_perkjoy_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  metadata jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  full_name text := nullif(trim(coalesce(metadata->>'full_name', metadata->>'name', '')), '');
  first_name text := nullif(trim(coalesce(
    metadata->>'first_name',
    metadata->>'given_name',
    split_part(coalesce(full_name, ''), ' ', 1)
  )), '');
  last_name text := nullif(trim(coalesce(
    metadata->>'last_name',
    metadata->>'family_name',
    case
      when position(' ' in coalesce(full_name, '')) > 0
        then substring(full_name from position(' ' in full_name) + 1)
      else ''
    end
  )), '');
begin
  if first_name is not null then
    metadata := jsonb_set(metadata, '{first_name}', to_jsonb(left(first_name, 100)), true);
  end if;
  if last_name is not null then
    metadata := jsonb_set(metadata, '{last_name}', to_jsonb(left(last_name, 100)), true);
  end if;

  new.raw_user_meta_data := metadata;
  return new;
end;
$$;

revoke all on function private.normalize_perkjoy_auth_metadata()
  from public, anon, authenticated;

drop trigger if exists normalize_perkjoy_auth_metadata on auth.users;
create trigger normalize_perkjoy_auth_metadata
  before insert on auth.users
  for each row execute function private.normalize_perkjoy_auth_metadata();

comment on function private.normalize_perkjoy_auth_metadata()
  is 'Normalizes provider display metadata only; never used for authorization.';
