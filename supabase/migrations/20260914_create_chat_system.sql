create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('direct','project')),
  project_id uuid references public.projects(id) on delete cascade,
  direct_user_a uuid references public.profiles(id) on delete cascade,
  direct_user_b uuid references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  constraint chat_conversations_shape_check check (
    (kind = 'project' and project_id is not null and direct_user_a is null and direct_user_b is null)
    or
    (kind = 'direct' and project_id is null and direct_user_a is not null and direct_user_b is not null and direct_user_a <> direct_user_b)
  ),
  constraint chat_conversations_direct_order_check check (
    kind <> 'direct' or direct_user_a::text < direct_user_b::text
  )
);

create unique index chat_conversations_project_unique
  on public.chat_conversations(project_id)
  where kind = 'project';
create unique index chat_conversations_direct_unique
  on public.chat_conversations(direct_user_a, direct_user_b)
  where kind = 'direct';
create index chat_conversations_last_message_idx
  on public.chat_conversations(last_message_at desc);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index chat_messages_conversation_created_idx
  on public.chat_messages(conversation_id, created_at desc);
create index chat_messages_sender_idx on public.chat_messages(sender_id);

create table public.chat_read_state (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_read_state enable row level security;

grant select on table public.chat_conversations to authenticated;
grant select, insert on table public.chat_messages to authenticated;
grant select, insert, update on table public.chat_read_state to authenticated;

create policy "Users can read accessible chats"
on public.chat_conversations for select to authenticated
using (
  (kind = 'direct' and (direct_user_a = (select auth.uid()) or direct_user_b = (select auth.uid())))
  or
  (kind = 'project' and exists (
    select 1 from public.projects p
    where p.id = project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = (select auth.uid())
            and pm.status in ('active','completed')
        )
      )
  ))
);

create policy "Users can read messages in accessible chats"
on public.chat_messages for select to authenticated
using (exists (select 1 from public.chat_conversations c where c.id = conversation_id));

create policy "Users can send messages in accessible chats"
on public.chat_messages for insert to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (select 1 from public.chat_conversations c where c.id = conversation_id)
);

create policy "Users can read own chat state"
on public.chat_read_state for select to authenticated
using (user_id = (select auth.uid()));

create policy "Users can create own chat state"
on public.chat_read_state for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.chat_conversations c where c.id = conversation_id)
);

create policy "Users can update own chat state"
on public.chat_read_state for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.get_or_create_direct_chat(other_user_id uuid, context_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  user_a uuid;
  user_b uuid;
  conversation_id uuid;
  allowed boolean := false;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if other_user_id is null or other_user_id = current_user_id then
    raise exception 'Invalid chat participant';
  end if;

  select exists (
    select 1 from public.projects p
    where p.id = context_project_id
      and (
        (p.owner_id = current_user_id and (
          exists (select 1 from public.applications a where a.project_id = p.id and a.applicant_id = other_user_id)
          or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = other_user_id and pm.status in ('active','completed'))
        ))
        or
        (p.owner_id = other_user_id and (
          exists (select 1 from public.applications a where a.project_id = p.id and a.applicant_id = current_user_id)
          or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = current_user_id and pm.status in ('active','completed'))
        ))
        or
        (
          exists (select 1 from public.project_members pm1 where pm1.project_id = p.id and pm1.user_id = current_user_id and pm1.status in ('active','completed'))
          and exists (select 1 from public.project_members pm2 where pm2.project_id = p.id and pm2.user_id = other_user_id and pm2.status in ('active','completed'))
        )
      )
  ) into allowed;

  if not allowed then raise exception 'Direct chat not allowed for these users'; end if;

  if current_user_id::text < other_user_id::text then
    user_a := current_user_id; user_b := other_user_id;
  else
    user_a := other_user_id; user_b := current_user_id;
  end if;

  insert into public.chat_conversations(kind, direct_user_a, direct_user_b)
  values ('direct', user_a, user_b)
  on conflict (direct_user_a, direct_user_b) where kind = 'direct'
  do update set direct_user_a = excluded.direct_user_a
  returning id into conversation_id;

  return conversation_id;
end;
$$;

grant execute on function public.get_or_create_direct_chat(uuid, uuid) to authenticated;
revoke all on function public.get_or_create_direct_chat(uuid, uuid) from public, anon;

create or replace function public.get_or_create_project_chat(target_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  conversation_id uuid;
  allowed boolean := false;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;

  select exists (
    select 1 from public.projects p
    where p.id = target_project_id
      and (
        p.owner_id = current_user_id
        or exists (
          select 1 from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = current_user_id
            and pm.status in ('active','completed')
        )
      )
  ) into allowed;

  if not allowed then raise exception 'Project chat not allowed'; end if;

  insert into public.chat_conversations(kind, project_id)
  values ('project', target_project_id)
  on conflict (project_id) where kind = 'project'
  do update set project_id = excluded.project_id
  returning id into conversation_id;

  return conversation_id;
end;
$$;

grant execute on function public.get_or_create_project_chat(uuid) to authenticated;
revoke all on function public.get_or_create_project_chat(uuid) from public, anon;

create or replace function public.touch_chat_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.chat_conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
revoke all on function public.touch_chat_conversation() from public, anon, authenticated;

create trigger touch_chat_conversation_after_message
after insert on public.chat_messages
for each row execute procedure public.touch_chat_conversation();

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'application_received','application_accepted','application_rejected','project_started',
  'project_cancelled','experience_pending','experience_verified','member_removed','message_received'
));
alter table public.notifications add column conversation_id uuid references public.chat_conversations(id) on delete cascade;
create index notifications_conversation_id_idx on public.notifications(conversation_id);

create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chat_conversations%rowtype;
  recipient uuid;
  recipient_row record;
  sender_name text;
  project_title text;
  preview text;
begin
  select * into c from public.chat_conversations where id = new.conversation_id;
  select trim(p.first_name || ' ' || p.last_name) into sender_name
  from public.profiles p where p.id = new.sender_id;
  preview := left(btrim(new.body), 120);

  if c.kind = 'direct' then
    recipient := case when c.direct_user_a = new.sender_id then c.direct_user_b else c.direct_user_a end;
    insert into public.notifications(user_id, type, actor_id, conversation_id, title, body)
    values (recipient, 'message_received', new.sender_id, c.id, coalesce(sender_name, 'Nuovo messaggio'), preview);
  else
    select p.title into project_title from public.projects p where p.id = c.project_id;
    for recipient_row in
      select p.owner_id as user_id from public.projects p
      where p.id = c.project_id and p.owner_id <> new.sender_id
      union
      select pm.user_id from public.project_members pm
      where pm.project_id = c.project_id
        and pm.status in ('active','completed')
        and pm.user_id <> new.sender_id
    loop
      insert into public.notifications(user_id, type, actor_id, project_id, conversation_id, title, body)
      values (
        recipient_row.user_id, 'message_received', new.sender_id, c.project_id, c.id,
        coalesce(project_title, 'Chat progetto'), coalesce(sender_name, 'Un membro') || ': ' || preview
      );
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_chat_message() from public, anon, authenticated;

create trigger notify_chat_message_insert
after insert on public.chat_messages
for each row execute procedure public.notify_chat_message();

alter publication supabase_realtime add table public.chat_messages;
