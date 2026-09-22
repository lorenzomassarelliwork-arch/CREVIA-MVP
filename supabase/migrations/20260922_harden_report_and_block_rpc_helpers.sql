
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create or replace function private.users_are_blocked(user_a uuid, user_b uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.user_blocks ub
    where (ub.blocker_id=user_a and ub.blocked_id=user_b)
       or (ub.blocker_id=user_b and ub.blocked_id=user_a)
  );
$$;
revoke all on function private.users_are_blocked(uuid,uuid) from public, anon;
grant execute on function private.users_are_blocked(uuid,uuid) to authenticated;

create or replace function public.get_direct_block_status(other_user_id uuid)
returns table(blocked_by_me boolean, direct_contact_blocked boolean)
language sql
security invoker
stable
set search_path = ''
as $$
  select
    exists(
      select 1 from public.user_blocks ub
      where ub.blocker_id=auth.uid() and ub.blocked_id=other_user_id
    ),
    private.users_are_blocked(auth.uid(),other_user_id);
$$;

create or replace function public.get_or_create_direct_chat(other_user_id uuid, context_project_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare current_user_id uuid:=auth.uid(); user_a uuid; user_b uuid; conversation_id uuid;
begin
  if current_user_id is null then raise exception 'Not authenticated'; end if;
  if other_user_id is null or other_user_id=current_user_id then raise exception 'Invalid chat participant'; end if;
  if private.users_are_blocked(current_user_id,other_user_id) then raise exception 'DIRECT_CONTACT_BLOCKED'; end if;

  if current_user_id::text < other_user_id::text then user_a:=current_user_id; user_b:=other_user_id;
  else user_a:=other_user_id; user_b:=current_user_id; end if;

  select id into conversation_id from public.chat_conversations
  where kind='direct' and direct_user_a=user_a and direct_user_b=user_b;
  if conversation_id is not null then return conversation_id; end if;

  insert into public.chat_conversations(kind,direct_user_a,direct_user_b,direct_context_project_id)
  values('direct',user_a,user_b,context_project_id)
  on conflict(direct_user_a,direct_user_b) where kind='direct' do nothing;

  select id into conversation_id from public.chat_conversations
  where kind='direct' and direct_user_a=user_a and direct_user_b=user_b;
  if conversation_id is null then raise exception 'Direct chat not allowed for these users'; end if;
  return conversation_id;
end;
$$;

create or replace function public.enforce_direct_message_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare conversation_kind text; user_a uuid; user_b uuid; other_user_id uuid;
begin
  select c.kind,c.direct_user_a,c.direct_user_b into conversation_kind,user_a,user_b
  from public.chat_conversations c where c.id=new.conversation_id;
  if conversation_kind='direct' then
    other_user_id:=case when user_a=new.sender_id then user_b else user_a end;
    if private.users_are_blocked(new.sender_id,other_user_id) then raise exception 'DIRECT_CONTACT_BLOCKED'; end if;
  end if;
  return new;
end;
$$;

create or replace function public.enforce_direct_chat_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind='direct' and private.users_are_blocked(new.direct_user_a,new.direct_user_b) then
    raise exception 'DIRECT_CONTACT_BLOCKED';
  end if;
  return new;
end;
$$;

create or replace function private.create_content_report_impl(
  report_target_type text,
  report_target_id uuid,
  report_reason text,
  report_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid:=auth.uid(); report_id uuid; target_user_id uuid; target_project_id uuid; target_message_id uuid;
  snapshot text; conversation_kind text; conversation_project_id uuid; conversation_user_a uuid; conversation_user_b uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if report_target_type not in('user','project','message') then raise exception 'INVALID_REPORT_TARGET'; end if;
  if report_reason not in('spam','harassment','hate_abusive','inappropriate','scam','privacy','other') then raise exception 'INVALID_REPORT_REASON'; end if;
  if report_notes is not null and char_length(report_notes)>2000 then raise exception 'REPORT_NOTES_TOO_LONG'; end if;
  if public.contains_disallowed_content(report_notes) then raise exception 'CONTENT_NOT_ALLOWED'; end if;

  if report_target_type='user' then
    select p.id,trim(coalesce(p.first_name,'')||' '||coalesce(p.last_name,''))||
      case when nullif(btrim(coalesce(p.headline,'')),'') is not null then ' — '||btrim(p.headline) else '' end
    into target_user_id,snapshot from public.profiles p where p.id=report_target_id;
    if target_user_id is null then raise exception 'REPORT_TARGET_NOT_FOUND'; end if;
    if target_user_id=current_user_id then raise exception 'CANNOT_REPORT_SELF'; end if;
  elsif report_target_type='project' then
    select p.id,p.owner_id,p.title||E'\n'||p.description into target_project_id,target_user_id,snapshot
    from public.projects p where p.id=report_target_id;
    if target_project_id is null then raise exception 'REPORT_TARGET_NOT_FOUND'; end if;
    if target_user_id=current_user_id then raise exception 'CANNOT_REPORT_OWN_PROJECT'; end if;
  else
    select m.id,m.sender_id,m.body,c.kind,c.project_id,c.direct_user_a,c.direct_user_b
    into target_message_id,target_user_id,snapshot,conversation_kind,conversation_project_id,conversation_user_a,conversation_user_b
    from public.chat_messages m join public.chat_conversations c on c.id=m.conversation_id where m.id=report_target_id;
    if target_message_id is null then raise exception 'REPORT_TARGET_NOT_FOUND'; end if;
    if target_user_id=current_user_id then raise exception 'CANNOT_REPORT_OWN_MESSAGE'; end if;

    if conversation_kind='direct' then
      if current_user_id<>conversation_user_a and current_user_id<>conversation_user_b then raise exception 'REPORT_TARGET_NOT_ACCESSIBLE'; end if;
    else
      target_project_id:=conversation_project_id;
      if not exists(
        select 1 from public.projects p where p.id=conversation_project_id and(
          p.owner_id=current_user_id
          or exists(select 1 from public.project_admins pa where pa.project_id=p.id and pa.user_id=current_user_id)
          or exists(select 1 from public.project_members pm where pm.project_id=p.id and pm.user_id=current_user_id and pm.status in('active','completed'))
        )
      ) then raise exception 'REPORT_TARGET_NOT_ACCESSIBLE'; end if;
    end if;
  end if;

  insert into public.content_reports(reporter_id,target_type,reported_user_id,project_id,message_id,reason,notes,content_snapshot)
  values(current_user_id,report_target_type,target_user_id,target_project_id,target_message_id,report_reason,nullif(btrim(report_notes),''),snapshot)
  returning id into report_id;
  return report_id;
end;
$$;
revoke all on function private.create_content_report_impl(text,uuid,text,text) from public, anon;
grant execute on function private.create_content_report_impl(text,uuid,text,text) to authenticated;

create or replace function public.create_content_report(
  report_target_type text,
  report_target_id uuid,
  report_reason text,
  report_notes text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_content_report_impl(
    report_target_type,report_target_id,report_reason,report_notes
  );
$$;

drop function if exists public.users_are_blocked(uuid,uuid);
