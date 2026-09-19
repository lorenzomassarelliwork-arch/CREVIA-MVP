drop policy if exists "Users can apply to recruiting projects" on public.applications;

create policy "Users can apply to open project roles"
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
      and p.status in ('recruiting','active')
      and p.owner_id <> (select auth.uid())
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

  if project_status not in ('recruiting','active') then
    raise exception 'Project is closed';
  end if;

  if new.status = 'accepted' then
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
