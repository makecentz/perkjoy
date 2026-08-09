-- PostgreSQL does not implicitly cast a CASE expression from text to an enum.
-- Patch the deployed function definition while keeping the full implementation
-- in the preceding migration as the single source of truth.
do $$
declare
  current_definition text;
  fixed_definition text;
begin
  current_definition := pg_get_functiondef(
    'private.run_due_automations(timestamp with time zone)'::regprocedure
  );

  fixed_definition := replace(
    current_definition,
    'case when candidate.approval_required then ''pending_approval'' else ''scheduled'' end,',
    '(case when candidate.approval_required then ''pending_approval'' else ''scheduled'' end)::public.reward_status,'
  );

  if fixed_definition = current_definition then
    raise exception 'Could not locate the automation reward status expression';
  end if;

  execute fixed_definition;
end;
$$;

revoke all on function private.run_due_automations(timestamptz)
  from public, anon, authenticated;
