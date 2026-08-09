revoke execute on function public.read_celebration_profile_invite(text)
  from authenticated;

revoke execute on function public.complete_celebration_profile_invite(text, jsonb)
  from authenticated;
