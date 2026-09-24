
create or replace function public.create_experience_exclusion_for_unselected_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_status text;
  deletion_user uuid :=
    nullif(current_setting('crevia.account_deletion_user', true), '')::uuid;
begin
  if deletion_user is not null and new.user_id = deletion_user then
    return new;
  end if;

  if old.status = 'active' and new.status = 'left' then
    select p.status into project_status
    from public.projects p
    where p.id = new.project_id;

    if project_status = 'completed'
      and not exists (
        select 1
        from public.project_departures d
        where d.member_id = new.id
      ) then
      insert into public.experience_exclusions(
        project_id,member_id,user_id,created_by
      ) values (
        new.project_id,new.id,new.user_id,auth.uid()
      )
      on conflict (member_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;
revoke all on function public.create_experience_exclusion_for_unselected_member()
from public, anon, authenticated;

create or replace function public.prevent_deleted_profile_restore()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is not null
    and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'ACCOUNT_DELETED';
  end if;
  return new;
end;
$$;
revoke all on function public.prevent_deleted_profile_restore()
from public, anon, authenticated;

drop trigger if exists prevent_deleted_profile_restore_update
on public.profiles;
create trigger prevent_deleted_profile_restore_update
before update on public.profiles
for each row execute procedure public.prevent_deleted_profile_restore();

create table if not exists private.account_deletions (
  user_id uuid primary key,
  deleted_at timestamptz not null default now()
);

insert into private.account_deletions(user_id, deleted_at)
select user_id, deleted_at
from public.account_deletions
on conflict (user_id) do update
set deleted_at = excluded.deleted_at;

drop table if exists public.account_deletions;

create or replace function private.prepare_account_deletion_impl(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    raise exception 'INVALID_USER';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = target_user_id
  ) then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  perform set_config(
    'crevia.account_deletion_user',
    target_user_id::text,
    true
  );

  update public.projects
  set status = 'cancelled'
  where owner_id = target_user_id
    and status in ('recruiting','active');

  update public.applications
  set
    status = case when status = 'pending' then 'withdrawn' else status end,
    motivation = 'Account eliminato',
    portfolio_url = null
  where applicant_id = target_user_id;

  update public.project_members
  set status = 'left', completed_at = null
  where user_id = target_user_id
    and status = 'active';

  update public.chat_messages
  set body = 'Messaggio eliminato'
  where sender_id = target_user_id;

  update public.project_departures
  set reason = null
  where user_id = target_user_id;

  update public.experience_exclusions
  set notes = null
  where user_id = target_user_id;

  update public.content_reports
  set notes = null
  where reporter_id = target_user_id;

  delete from public.saved_projects
  where user_id = target_user_id;

  delete from public.user_blocks
  where blocker_id = target_user_id
     or blocked_id = target_user_id;

  delete from public.chat_read_state
  where user_id = target_user_id;

  delete from public.project_admins
  where user_id = target_user_id;

  delete from public.platform_staff
  where user_id = target_user_id;

  delete from public.notifications
  where user_id = target_user_id;

  update public.profiles
  set
    first_name = 'Utente',
    last_name = 'eliminato',
    avatar_url = null,
    city = null,
    bio = null,
    headline = null,
    skills = '{}'::text[],
    availability = null,
    deleted_at = coalesce(deleted_at, now()),
    updated_at = now()
  where id = target_user_id;

  insert into private.account_deletions(user_id, deleted_at)
  values (target_user_id, now())
  on conflict (user_id) do update
  set deleted_at = excluded.deleted_at;
end;
$$;

revoke all on function private.prepare_account_deletion_impl(uuid)
from public, anon, authenticated;
grant execute on function private.prepare_account_deletion_impl(uuid)
to service_role;
