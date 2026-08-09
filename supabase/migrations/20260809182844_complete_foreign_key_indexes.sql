create index if not exists idx_reward_provider_events_reward_id
  on public.reward_provider_events (reward_id);

create index if not exists idx_team_celebration_participants_organization_id
  on public.team_celebration_participants (organization_id);

create index if not exists idx_vendor_products_vendor_id
  on public.vendor_products (vendor_id);
