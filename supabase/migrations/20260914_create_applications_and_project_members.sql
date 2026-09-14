alter table public.project_roles
  add constraint project_roles_id_project_id_key unique (id, project_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  role_id uuid not null,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  motivation text not null check (char_length(trim(motivation)) >= 5),
  portfolio_url text,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applications_role_project_fk
    foreign key (role_id, project_id)
    references public.project_roles(id, project_id)
    on delete cascade
);

create unique index applications_active_unique_idx
  on public.applications(project_id, role_id, applicant_id)
  where status in ('pending','accepted');
create index applications_project_id_idx on public.applications(project_id);
create index applications_applicant_id_idx on public.applications(applicant_id);
create index applications_role_id_idx on public.applications(role_id);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null,
  application_id uuid unique references public.applications(id) on delete set null,
  status text not null default 'active' check (status in ('active','completed','left','removed')),
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint project_members_role_project_fk
    foreign key (role_id, project_id)
    references public.project_roles(id, project_id)
    on delete cascade
);

create unique index project_members_active_unique_idx
  on public.project_members(project_id, role_id, user_id)
  where status in ('active','completed');
create index project_members_project_id_idx on public.project_members(project_id);
create index project_members_user_id_idx on public.project_members(user_id);
create index project_members_role_id_idx on public.project_members(role_id);

alter table public.applications enable row level security;
alter table public.project_members enable row level security;

grant select, insert on table public.applications to authenticated;
grant select on table public.project_members to authenticated;

create policy "Applicants and owners can read applications"
on public.applications for select to authenticated
using (
  applicant_id = (select auth.uid())
  or exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

create policy "Users can apply to recruiting projects"
on public.applications for insert to authenticated
with check (
  applicant_id = (select auth.uid())
  and status = 'pending'
  and exists (
    select 1
    from public.projects p
    join public.project_roles r on r.project_id = p.id
    where p.id = project_id
      and r.id = role_id
      and p.status = 'recruiting'
      and p.owner_id <> (select auth.uid())
  )
);

create policy "Authenticated users can read project members"
on public.project_members for select to authenticated
using (true);

create or replace function public.set_applications_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_applications_updated_at
before update on public.applications
for each row execute procedure public.set_applications_updated_at();

revoke execute on function public.set_applications_updated_at() from public, anon, authenticated;

create or replace function public.accept_application(target_application_id uuid)
returns public.project_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  application_row public.applications%rowtype;
  project_row public.projects%rowtype;
  role_row public.project_roles%rowtype;
  occupied_count integer;
  member_row public.project_members%rowtype;
begin
  select * into application_row
  from public.applications
  where id = target_application_id
  for update;

  if not found then raise exception 'Application not found'; end if;

  select * into project_row
  from public.projects
  where id = application_row.project_id
  for update;

  if project_row.owner_id <> auth.uid() then
    raise exception 'Only the project owner can manage applications';
  end if;
  if project_row.status <> 'recruiting' then raise exception 'Project is not recruiting'; end if;
  if application_row.status <> 'pending' then raise exception 'Application already handled'; end if;

  select * into role_row
  from public.project_roles
  where id = application_row.role_id and project_id = application_row.project_id
  for update;

  if not found then raise exception 'Role not found'; end if;

  select count(*) into occupied_count
  from public.project_members
  where role_id = role_row.id and status = 'active';

  if occupied_count >= role_row.seats then raise exception 'No seats available'; end if;

  update public.applications set status = 'accepted' where id = application_row.id;

  insert into public.project_members (project_id, user_id, role_id, application_id, status)
  values (application_row.project_id, application_row.applicant_id, application_row.role_id, application_row.id, 'active')
  returning * into member_row;

  return member_row;
end;
$$;

revoke all on function public.accept_application(uuid) from public, anon;
grant execute on function public.accept_application(uuid) to authenticated;

create or replace function public.reject_application(target_application_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare application_row public.applications%rowtype;
begin
  select * into application_row from public.applications where id = target_application_id for update;
  if not found then raise exception 'Application not found'; end if;
  if not exists (
    select 1 from public.projects p
    where p.id = application_row.project_id and p.owner_id = auth.uid() and p.status = 'recruiting'
  ) then raise exception 'Not allowed'; end if;
  if application_row.status <> 'pending' then raise exception 'Application already handled'; end if;
  update public.applications set status = 'rejected' where id = application_row.id;
end;
$$;

revoke all on function public.reject_application(uuid) from public, anon;
grant execute on function public.reject_application(uuid) to authenticated;

create or replace function public.close_pending_applications(target_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.projects p where p.id = target_project_id and p.owner_id = auth.uid()) then
    raise exception 'Only the project owner can close applications';
  end if;
  update public.applications set status = 'rejected' where project_id = target_project_id and status = 'pending';
end;
$$;

revoke all on function public.close_pending_applications(uuid) from public, anon;
grant execute on function public.close_pending_applications(uuid) to authenticated;

create or replace function public.remove_project_member(target_member_id uuid)
returns public.project_members
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row public.project_members%rowtype;
  project_status text;
begin
  select * into member_row from public.project_members where id = target_member_id for update;
  if not found then raise exception 'Member not found'; end if;
  select p.status into project_status from public.projects p where p.id = member_row.project_id and p.owner_id = auth.uid();
  if project_status is null then raise exception 'Only the project owner can remove members'; end if;
  if project_status not in ('recruiting','active') then raise exception 'Project is closed'; end if;
  if member_row.status <> 'active' then raise exception 'Member is not active'; end if;
  update public.project_members set status = 'removed' where id = member_row.id returning * into member_row;
  return member_row;
end;
$$;

revoke all on function public.remove_project_member(uuid) from public, anon;
grant execute on function public.remove_project_member(uuid) to authenticated;

create or replace function public.close_active_members(target_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.projects p where p.id = target_project_id and p.owner_id = auth.uid()) then
    raise exception 'Only the project owner can close members';
  end if;
  update public.project_members set status = 'removed' where project_id = target_project_id and status = 'active';
end;
$$;

revoke all on function public.close_active_members(uuid) from public, anon;
grant execute on function public.close_active_members(uuid) to authenticated;

create or replace function public.finalize_project_members(target_project_id uuid, completed_user_ids uuid[])
returns setof public.project_members
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.projects p
    where p.id = target_project_id and p.owner_id = auth.uid() and p.status = 'completed'
  ) then raise exception 'Project must be completed by its owner'; end if;

  update public.project_members
  set status = case when user_id = any(completed_user_ids) then 'completed' else 'left' end,
      completed_at = case when user_id = any(completed_user_ids) then now() else null end
  where project_id = target_project_id and status = 'active';

  return query select * from public.project_members where project_id = target_project_id and status = 'completed';
end;
$$;

revoke all on function public.finalize_project_members(uuid, uuid[]) from public, anon;
grant execute on function public.finalize_project_members(uuid, uuid[]) to authenticated;
