alter table public.chat_conversations
  add column direct_context_project_id uuid references public.projects(id) on delete set null;

alter table public.chat_conversations
  drop constraint chat_conversations_shape_check;

alter table public.chat_conversations
  add constraint chat_conversations_shape_check check (
    (kind = 'project' and project_id is not null and direct_user_a is null and direct_user_b is null and direct_context_project_id is null)
    or
    (kind = 'direct' and project_id is null and direct_user_a is not null and direct_user_b is not null and direct_user_a <> direct_user_b and direct_context_project_id is not null)
  );

grant insert on table public.chat_conversations to authenticated;

create policy "Users can create authorized chats"
on public.chat_conversations for insert to authenticated
with check (
  (
    kind = 'project'
    and project_id is not null
    and exists (
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
    )
  )
  or
  (
    kind = 'direct'
    and direct_context_project_id is not null
    and (direct_user_a = (select auth.uid()) or direct_user_b = (select auth.uid()))
    and exists (
      select 1 from public.projects p
      where p.id = direct_context_project_id
        and (
          (p.owner_id = (select auth.uid()) and (
            exists (select 1 from public.applications a where a.project_id = p.id and a.applicant_id in (direct_user_a,direct_user_b) and a.applicant_id <> (select auth.uid()))
            or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id in (direct_user_a,direct_user_b) and pm.user_id <> (select auth.uid()) and pm.status in ('active','completed'))
          ))
          or
          (p.owner_id in (direct_user_a,direct_user_b) and p.owner_id <> (select auth.uid()) and (
            exists (select 1 from public.applications a where a.project_id = p.id and a.applicant_id = (select auth.uid()))
            or exists (select 1 from public.project_members pm where pm.project_id = p.id and pm.user_id = (select auth.uid()) and pm.status in ('active','completed'))
          ))
          or
          (
            exists (select 1 from public.project_members pm1 where pm1.project_id = p.id and pm1.user_id = (select auth.uid()) and pm1.status in ('active','completed'))
            and exists (select 1 from public.project_members pm2 where pm2.project_id = p.id and pm2.user_id in (direct_user_a,direct_user_b) and pm2.user_id <> (select auth.uid()) and pm2.status in ('active','completed'))
          )
        )
    )
  )
);

create or replace function public.get_or_create_direct_chat(other_user_id uuid, context_project_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  user_a uuid;
  user_b uuid;
  conversation_id uuid;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if other_user_id is null or other_user_id = current_user_id then raise exception 'Invalid chat participant'; end if;

  if current_user_id::text < other_user_id::text then
    user_a := current_user_id; user_b := other_user_id;
  else
    user_a := other_user_id; user_b := current_user_id;
  end if;

  select id into conversation_id
  from public.chat_conversations
  where kind = 'direct' and direct_user_a = user_a and direct_user_b = user_b;

  if conversation_id is not null then return conversation_id; end if;

  insert into public.chat_conversations(kind, direct_user_a, direct_user_b, direct_context_project_id)
  values ('direct', user_a, user_b, context_project_id)
  on conflict (direct_user_a, direct_user_b) where kind = 'direct' do nothing;

  select id into conversation_id
  from public.chat_conversations
  where kind = 'direct' and direct_user_a = user_a and direct_user_b = user_b;

  if conversation_id is null then raise exception 'Direct chat not allowed for these users'; end if;
  return conversation_id;
end;
$$;

grant execute on function public.get_or_create_direct_chat(uuid, uuid) to authenticated;
revoke all on function public.get_or_create_direct_chat(uuid, uuid) from public, anon;

create or replace function public.get_or_create_project_chat(target_project_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  conversation_id uuid;
begin
  select id into conversation_id
  from public.chat_conversations
  where kind = 'project' and project_id = target_project_id;

  if conversation_id is not null then return conversation_id; end if;

  insert into public.chat_conversations(kind, project_id)
  values ('project', target_project_id)
  on conflict (project_id) where kind = 'project' do nothing;

  select id into conversation_id
  from public.chat_conversations
  where kind = 'project' and project_id = target_project_id;

  if conversation_id is null then raise exception 'Project chat not allowed'; end if;
  return conversation_id;
end;
$$;

grant execute on function public.get_or_create_project_chat(uuid) to authenticated;
revoke all on function public.get_or_create_project_chat(uuid) from public, anon;

create index chat_conversations_direct_context_project_idx
  on public.chat_conversations(direct_context_project_id);
