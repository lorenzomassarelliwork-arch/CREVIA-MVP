create table public.verified_experiences (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.project_roles(id) on delete restrict,
  role_title text not null,
  skills text[] not null default '{}',
  started_at timestamptz not null,
  completed_at timestamptz not null,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'disputed')),
  created_at timestamptz not null default now(),
  verified_at timestamptz,
  constraint verified_experiences_project_user_unique unique (project_id, user_id),
  constraint verified_experiences_role_project_fk foreign key (role_id, project_id)
    references public.project_roles(id, project_id)
);

create index verified_experiences_user_id_idx
  on public.verified_experiences(user_id);
create index verified_experiences_project_id_idx
  on public.verified_experiences(project_id);
create index verified_experiences_role_project_idx
  on public.verified_experiences(role_id, project_id);

alter table public.verified_experiences enable row level security;

grant select, insert on table public.verified_experiences to authenticated;
grant update (verification_status, verified_at)
  on table public.verified_experiences to authenticated;

create policy "Authenticated users can read experiences"
on public.verified_experiences for select to authenticated
using (true);

create policy "Project owners can create valid experiences"
on public.verified_experiences for insert to authenticated
with check (
  exists (
    select 1
    from public.projects p
    join public.project_members m
      on m.project_id = p.id
     and m.user_id = public.verified_experiences.user_id
     and m.role_id = public.verified_experiences.role_id
    join public.project_roles r
      on r.id = public.verified_experiences.role_id
     and r.project_id = public.verified_experiences.project_id
    where p.id = public.verified_experiences.project_id
      and p.owner_id = (select auth.uid())
      and p.status = 'completed'
      and m.status = 'completed'
      and m.completed_at is not null
      and public.verified_experiences.role_title = r.title
      and public.verified_experiences.skills = r.required_skills
      and public.verified_experiences.started_at = m.joined_at
      and public.verified_experiences.completed_at = m.completed_at
  )
);

create policy "Participants can update own experiences"
on public.verified_experiences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.create_pending_experiences(target_project_id uuid)
returns setof public.verified_experiences
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from public.projects p
    where p.id = target_project_id
      and p.owner_id = auth.uid()
      and p.status = 'completed'
  ) then
    raise exception 'Only the owner of a completed project can create experiences';
  end if;

  return query
  insert into public.verified_experiences (
    project_id,
    user_id,
    role_id,
    role_title,
    skills,
    started_at,
    completed_at
  )
  select
    m.project_id,
    m.user_id,
    m.role_id,
    r.title,
    r.required_skills,
    m.joined_at,
    m.completed_at
  from public.project_members m
  join public.project_roles r
    on r.id = m.role_id
   and r.project_id = m.project_id
  where m.project_id = target_project_id
    and m.status = 'completed'
    and m.completed_at is not null
  on conflict (project_id, user_id) do nothing
  returning *;
end;
$$;

revoke all on function public.create_pending_experiences(uuid) from public, anon;
grant execute on function public.create_pending_experiences(uuid) to authenticated;

create or replace function public.confirm_experience(target_experience_id uuid)
returns public.verified_experiences
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.verified_experiences%rowtype;
begin
  update public.verified_experiences e
  set verification_status = 'verified', verified_at = now()
  where e.id = target_experience_id
    and e.user_id = auth.uid()
    and e.verification_status = 'pending'
  returning e.* into result;

  if not found then
    raise exception 'Experience not found or not confirmable';
  end if;

  return result;
end;
$$;

revoke all on function public.confirm_experience(uuid) from public, anon;
grant execute on function public.confirm_experience(uuid) to authenticated;
