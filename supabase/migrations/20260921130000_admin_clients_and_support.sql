create table public.support_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  opened_by uuid references auth.users(id) on delete set null,
  assigned_to uuid references auth.users(id) on delete set null,
  subject text not null check (char_length(subject) between 1 and 180),
  status text not null default 'open' check (status in ('open', 'pending', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  last_message_at timestamptz not null default now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.support_conversations(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_role text not null check (sender_role in ('client', 'admin', 'system')),
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index support_conversations_org_idx on public.support_conversations(organization_id);
create index support_conversations_queue_idx on public.support_conversations(status, last_message_at desc);
create index support_messages_conversation_idx on public.support_messages(conversation_id, created_at);

alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;

create policy support_conversations_org_select on public.support_conversations
  for select to authenticated using (private.is_org_member(organization_id));
create policy support_conversations_org_insert on public.support_conversations
  for insert to authenticated with check ((select auth.uid()) = opened_by and private.is_org_member(organization_id));
create policy support_messages_org_select on public.support_messages
  for select to authenticated using (exists (
    select 1 from public.support_conversations conversation
    where conversation.id = conversation_id and private.is_org_member(conversation.organization_id)
  ));
create policy support_messages_org_insert on public.support_messages
  for insert to authenticated with check (
    (select auth.uid()) = sender_id and sender_role = 'client' and exists (
      select 1 from public.support_conversations conversation
      where conversation.id = conversation_id and private.is_org_member(conversation.organization_id)
    )
  );

create trigger set_updated_at before update on public.support_conversations
  for each row execute function private.set_updated_at();

grant select, insert on public.support_conversations to authenticated;
grant select, insert on public.support_messages to authenticated;
