
alter table public.profiles
  add column if not exists deleted_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_id_fkey;

create table if not exists public.account_deletions (
  user_id uuid primary key,
  deleted_at timestamptz not null default now()
);

alter table public.account_deletions enable row level security;
revoke all on table public.account_deletions from public, anon, authenticated;

create or replace function public.validate_application_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_owner_id uuid;
  project_status text;
  role_seats integer;
  occupied_count integer;
  can_manage boolean;
  deletion_user uuid :=
    nullif(current_setting('crevia.account_deletion_user', true), '')::uuid;
begin
  if deletion_user is not null and old.applicant_id = deletion_user then
    new.project_id := old.project_id;
    new.role_id := old.role_id;
    new.applicant_id := old.applicant_id;
    new.status := case
      when old.status = 'pending' then 'withdrawn'
      else old.status
    end;
    new.motivation := 'Account eliminato';
    new.portfolio_url := null;
    return new;
  end if;

  if old.status <> 'pending' then
    raise exception 'Application already handled';
  end if;
  if new.status not in ('accepted','rejected') then
    raise exception 'Invalid application status transition';
  end if;

  select p.owner_id,p.status into project_owner_id,project_status
  from public.projects p where p.id = old.project_id;

  can_manage := project_owner_id = auth.uid()
    or exists (
      select 1 from public.project_admins pa
      where pa.project_id = old.project_id and pa.user_id = auth.uid()
    );

  if not can_manage then raise exception 'Only project admins can manage applications'; end if;
  if project_status not in ('recruiting','active') then raise exception 'Project is closed'; end if;

  if new.status = 'accepted' then
    select r.seats into role_seats
    from public.project_roles r
    where r.id = old.role_id and r.project_id = old.project_id
    for update;
    if not found then raise exception 'Role not found'; end if;

    select count(*) into occupied_count
    from public.project_members m
    where m.role_id = old.role_id and m.status = 'active';

    if occupied_count >= role_seats then raise exception 'No seats available'; end if;
  end if;

  new.project_id := old.project_id;
  new.role_id := old.role_id;
  new.applicant_id := old.applicant_id;
  new.motivation := old.motivation;
  new.portfolio_url := old.portfolio_url;
  return new;
end;
$$;
revoke all on function public.validate_application_update() from public, anon, authenticated;

create or replace function public.validate_project_member_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_owner_id uuid;
  project_status text;
  can_manage boolean;
  valid_self_leave boolean;
  deletion_user uuid :=
    nullif(current_setting('crevia.account_deletion_user', true), '')::uuid;
begin
  if deletion_user is not null
    and old.user_id = deletion_user
    and old.status = 'active'
    and new.status = 'left' then
    new.project_id := old.project_id;
    new.user_id := old.user_id;
    new.role_id := old.role_id;
    new.application_id := old.application_id;
    new.joined_at := old.joined_at;
    new.completed_at := null;
    return new;
  end if;

  if old.status <> 'active' then raise exception 'Member is not active'; end if;
  if new.status not in ('removed','completed','left') then
    raise exception 'Invalid member status transition';
  end if;

  select p.owner_id,p.status into project_owner_id,project_status
  from public.projects p where p.id = old.project_id;

  can_manage := project_owner_id = auth.uid()
    or exists (
      select 1 from public.project_admins pa
      where pa.project_id = old.project_id and pa.user_id = auth.uid()
    );

  valid_self_leave :=
    new.status = 'left'
    and old.user_id = auth.uid()
    and project_status in ('recruiting','active')
    and exists (
      select 1 from public.project_departures d
      where d.member_id = old.id and d.user_id = auth.uid()
    );

  if not can_manage and not valid_self_leave then
    raise exception 'Only project admins can manage members';
  end if;

  if new.status = 'removed' and project_status not in ('recruiting','active','cancelled') then
    raise exception 'Project is closed';
  end if;
  if new.status in ('completed','left') and can_manage and project_status <> 'completed' then
    raise exception 'Project must be completed first';
  end if;

  new.project_id := old.project_id;
  new.user_id := old.user_id;
  new.role_id := old.role_id;
  new.application_id := old.application_id;
  new.joined_at := old.joined_at;
  if new.status <> 'completed' then new.completed_at := null; end if;
  return new;
end;
$$;
revoke all on function public.validate_project_member_update() from public, anon, authenticated;

create or replace function public.validate_experience_exclusion_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  deletion_user uuid :=
    nullif(current_setting('crevia.account_deletion_user', true), '')::uuid;
begin
  if deletion_user is not null and old.user_id = deletion_user then
    new.project_id := old.project_id;
    new.member_id := old.member_id;
    new.user_id := old.user_id;
    new.created_by := old.created_by;
    new.response_status := old.response_status;
    new.notes := null;
    new.created_at := old.created_at;
    new.responded_at := old.responded_at;
    new.moderation_status := old.moderation_status;
    new.moderated_at := old.moderated_at;
    new.moderated_by := old.moderated_by;
    return new;
  end if;

  if old.response_status <> 'pending' then
    raise exception 'Experience exclusion already handled';
  end if;
  if new.response_status not in ('acknowledged','reported') then
    raise exception 'Invalid experience exclusion response';
  end if;
  new.responded_at := coalesce(new.responded_at, now());
  if new.response_status = 'acknowledged' then new.notes := null; end if;
  return new;
end;
$$;
revoke all on function public.validate_experience_exclusion_response() from public, anon, authenticated;

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
    deleted_at = now(),
    updated_at = now()
  where id = target_user_id;

  insert into public.account_deletions(user_id, deleted_at)
  values (target_user_id, now())
  on conflict (user_id) do update
  set deleted_at = excluded.deleted_at;
end;
$$;

revoke all on function private.prepare_account_deletion_impl(uuid)
from public, anon, authenticated;
grant execute on function private.prepare_account_deletion_impl(uuid)
to service_role;

create or replace function public.prepare_account_deletion(target_user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.prepare_account_deletion_impl(target_user_id);
$$;

revoke all on function public.prepare_account_deletion(uuid)
from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid)
to service_role;
