drop function if exists public.accept_application(uuid);
drop function if exists public.reject_application(uuid);
drop function if exists public.close_pending_applications(uuid);
drop function if exists public.remove_project_member(uuid);
drop function if exists public.close_active_members(uuid);
drop function if exists public.finalize_project_members(uuid, uuid[]);

grant update on table public.applications to authenticated;
grant update on table public.project_members to authenticated;

create policy "Owners can update project applications"
on public.applications for update to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

create policy "Owners can update project members"
on public.project_members for update to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

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
begin
  if old.status <> 'pending' then
    raise exception 'Application already handled';
  end if;

  if new.status not in ('accepted','rejected') then
    raise exception 'Invalid application status transition';
  end if;

  select p.owner_id, p.status into project_owner_id, project_status
  from public.projects p where p.id = old.project_id;

  if project_owner_id <> auth.uid() then
    raise exception 'Only the project owner can manage applications';
  end if;

  if new.status = 'accepted' then
    if project_status <> 'recruiting' then
      raise exception 'Project is not recruiting';
    end if;

    select r.seats into role_seats
    from public.project_roles r
    where r.id = old.role_id and r.project_id = old.project_id
    for update;

    if not found then raise exception 'Role not found'; end if;

    select count(*) into occupied_count
    from public.project_members m
    where m.role_id = old.role_id and m.status = 'active';

    if occupied_count >= role_seats then
      raise exception 'No seats available';
    end if;
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

create or replace function public.create_member_for_accepted_application()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'pending' and new.status = 'accepted' then
    insert into public.project_members(project_id,user_id,role_id,application_id,status)
    values(new.project_id,new.applicant_id,new.role_id,new.id,'active');
  end if;
  return new;
end;
$$;

revoke all on function public.create_member_for_accepted_application() from public, anon, authenticated;

create trigger validate_application_update
before update on public.applications
for each row execute procedure public.validate_application_update();

create trigger create_member_for_accepted_application
after update on public.applications
for each row execute procedure public.create_member_for_accepted_application();

create or replace function public.validate_project_member_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_owner_id uuid;
  project_status text;
begin
  if old.status <> 'active' then
    raise exception 'Member is not active';
  end if;

  if new.status not in ('removed','completed','left') then
    raise exception 'Invalid member status transition';
  end if;

  select p.owner_id, p.status into project_owner_id, project_status
  from public.projects p where p.id = old.project_id;

  if project_owner_id <> auth.uid() then
    raise exception 'Only the project owner can manage members';
  end if;

  if new.status = 'removed' and project_status not in ('recruiting','active','cancelled') then
    raise exception 'Project is closed';
  end if;

  if new.status in ('completed','left') and project_status <> 'completed' then
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

create trigger validate_project_member_update
before update on public.project_members
for each row execute procedure public.validate_project_member_update();
