-- Phase I: complete employee records and secure employee avatar storage.

alter table public.employees
  add column if not exists avatar_path text,
  add column if not exists employee_number text,
  add column if not exists delivery_same_as_work boolean not null default true,
  add column if not exists delivery_address_line_1 text,
  add column if not exists delivery_address_line_2 text,
  add column if not exists delivery_city text,
  add column if not exists delivery_state text,
  add column if not exists delivery_postal_code text;

alter table public.employees
  alter column birthday_month drop not null,
  alter column birthday_day drop not null,
  alter column hire_date drop not null;

alter table public.employees
  drop constraint if exists employees_birthday_month_check,
  drop constraint if exists employees_birthday_day_check;

alter table public.employees
  add constraint employees_birthday_valid_check check (
    (birthday_month is null and birthday_day is null)
    or (
      birthday_month between 1 and 12
      and birthday_day between 1 and
        (array[31,29,31,30,31,30,31,31,30,31,30,31])[birthday_month]
    )
  ),
  add constraint employees_manager_not_self_check check (
    manager_employee_id is null or manager_employee_id <> id
  ),
  add constraint employees_avatar_path_check check (
    avatar_path is null
    or avatar_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/avatar-[0-9]+\.(jpg|jpeg|png|webp)$'
  );

alter table public.employees
  drop constraint if exists employees_organization_id_email_key;

create unique index if not exists employees_org_normalized_email_key
  on public.employees (organization_id, lower(trim(email)));
create unique index if not exists employees_org_employee_number_key
  on public.employees (organization_id, lower(trim(employee_number)))
  where employee_number is not null and trim(employee_number) <> '';
create unique index if not exists departments_org_normalized_name_key
  on public.departments (organization_id, lower(trim(name)));
create index if not exists idx_employees_org_name
  on public.employees (organization_id, lower(last_name), lower(first_name));
create index if not exists idx_employees_org_hire_date
  on public.employees (organization_id, hire_date)
  where hire_date is not null;
create index if not exists idx_employees_org_created
  on public.employees (organization_id, created_at desc);

create or replace function private.normalize_and_validate_employee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.first_name := left(trim(new.first_name), 100);
  new.last_name := left(trim(new.last_name), 100);
  new.email := lower(trim(new.email));
  new.phone := nullif(left(trim(coalesce(new.phone, '')), 40), '');
  new.job_title := nullif(left(trim(coalesce(new.job_title, '')), 160), '');
  new.employee_number := nullif(left(trim(coalesce(new.employee_number, '')), 80), '');
  new.avatar_path := nullif(trim(coalesce(new.avatar_path, '')), '');
  new.updated_at := now();

  if new.first_name = '' or new.last_name = '' or new.email = '' then
    raise exception 'Employee name and email are required' using errcode = '23514';
  end if;

  if (new.birthday_month is null) <> (new.birthday_day is null) then
    raise exception 'Birthday month and day must be provided together' using errcode = '23514';
  end if;

  if new.department_id is not null and not exists (
    select 1 from public.departments d
    where d.id = new.department_id and d.organization_id = new.organization_id
  ) then
    raise exception 'Department must belong to the employee organization' using errcode = '23503';
  end if;

  if new.manager_employee_id is not null and not exists (
    select 1 from public.employees manager
    where manager.id = new.manager_employee_id
      and manager.organization_id = new.organization_id
      and manager.status = 'active'
  ) then
    raise exception 'Manager must be an active employee in the same organization' using errcode = '23503';
  end if;

  if new.organization_location_id is not null and not exists (
    select 1 from public.organization_locations location
    where location.id = new.organization_location_id
      and location.organization_id = new.organization_id
  ) then
    raise exception 'Work location must belong to the employee organization' using errcode = '23503';
  end if;

  return new;
end;
$$;

revoke all on function private.normalize_and_validate_employee()
  from public, anon, authenticated;

drop trigger if exists normalize_and_validate_employee on public.employees;
create trigger normalize_and_validate_employee
  before insert or update on public.employees
  for each row execute function private.normalize_and_validate_employee();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'employee-avatars',
  'employee-avatars',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function private.can_access_employee_avatar(
  object_name text,
  require_admin boolean default false
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(object_name, '/');
  target_organization_id uuid;
  target_employee_id uuid;
begin
  if auth.uid() is null or array_length(parts, 1) <> 3 then
    return false;
  end if;

  begin
    target_organization_id := parts[1]::uuid;
    target_employee_id := parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  if not exists (
    select 1 from public.employees employee
    where employee.id = target_employee_id
      and employee.organization_id = target_organization_id
  ) then
    return false;
  end if;

  if require_admin then
    return private.has_org_role(
      target_organization_id,
      array['OWNER'::public.organization_role, 'ADMIN'::public.organization_role]
    );
  end if;

  return private.is_org_member(target_organization_id);
end;
$$;

revoke all on function private.can_access_employee_avatar(text, boolean)
  from public, anon;
grant execute on function private.can_access_employee_avatar(text, boolean)
  to authenticated;

drop policy if exists employee_avatars_member_select on storage.objects;
create policy employee_avatars_member_select
on storage.objects for select to authenticated
using (
  bucket_id = 'employee-avatars'
  and private.can_access_employee_avatar(name, false)
);

drop policy if exists employee_avatars_admin_insert on storage.objects;
create policy employee_avatars_admin_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'employee-avatars'
  and private.can_access_employee_avatar(name, true)
);

drop policy if exists employee_avatars_admin_update on storage.objects;
create policy employee_avatars_admin_update
on storage.objects for update to authenticated
using (
  bucket_id = 'employee-avatars'
  and private.can_access_employee_avatar(name, true)
)
with check (
  bucket_id = 'employee-avatars'
  and private.can_access_employee_avatar(name, true)
);

drop policy if exists employee_avatars_admin_delete on storage.objects;
create policy employee_avatars_admin_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'employee-avatars'
  and private.can_access_employee_avatar(name, true)
);

comment on column public.employees.avatar_path is
  'Private Supabase Storage object path in the employee-avatars bucket.';
comment on function private.can_access_employee_avatar(text, boolean) is
  'Enforces organization membership and OWNER/ADMIN management for private employee avatars.';
