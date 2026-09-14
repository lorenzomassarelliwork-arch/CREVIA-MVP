create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 3),
  description text not null check (char_length(trim(description)) >= 10),
  goal text not null check (char_length(trim(goal)) >= 5),
  deliverable text,
  category text not null check (char_length(trim(category)) >= 2),
  cover_url text,
  type text not null check (type in ('community','startup','university','non_profit')),
  location_mode text not null check (location_mode in ('remote','onsite','hybrid')),
  city text,
  expected_duration text,
  weekly_commitment_hours integer check (weekly_commitment_hours is null or weekly_commitment_hours between 1 and 168),
  compensation_type text not null check (compensation_type in ('unpaid','expense_reimbursement','prize','paid_to_agree')),
  compensation_notes text,
  status text not null default 'recruiting' check (status in ('recruiting','active','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_city_location_check check (location_mode <> 'remote' or city is null)
);

create table public.project_roles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) >= 2),
  description text not null check (char_length(trim(description)) >= 5),
  required_skills text[] not null default '{}',
  seats integer not null default 1 check (seats between 1 and 50),
  created_at timestamptz not null default now()
);

create index project_roles_project_id_idx on public.project_roles(project_id);
create index projects_owner_id_idx on public.projects(owner_id);
create index projects_status_created_at_idx on public.projects(status, created_at desc);

alter table public.projects enable row level security;
alter table public.project_roles enable row level security;

grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.project_roles to authenticated;

create policy "Authenticated users can read projects"
on public.projects for select to authenticated using (true);

create policy "Users can create own projects"
on public.projects for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Owners can update own projects"
on public.projects for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Owners can delete own projects"
on public.projects for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy "Authenticated users can read project roles"
on public.project_roles for select to authenticated using (true);

create policy "Owners can create roles for own projects"
on public.project_roles for insert to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

create policy "Owners can update roles for own projects"
on public.project_roles for update to authenticated
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

create policy "Owners can delete roles for own projects"
on public.project_roles for delete to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

create or replace function public.set_projects_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_projects_updated_at
before update on public.projects
for each row execute procedure public.set_projects_updated_at();

revoke execute on function public.set_projects_updated_at() from public, anon, authenticated;

create or replace function public.create_project_with_roles(payload jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_id uuid;
  role jsonb;
  role_count integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  role_count := jsonb_array_length(coalesce(payload->'roles', '[]'::jsonb));
  if role_count < 1 then
    raise exception 'At least one role is required';
  end if;

  insert into public.projects (
    owner_id, title, description, goal, deliverable, category, cover_url,
    type, location_mode, city, expected_duration, weekly_commitment_hours,
    compensation_type, compensation_notes, status
  ) values (
    auth.uid(), trim(payload->>'title'), trim(payload->>'description'),
    trim(payload->>'goal'), nullif(trim(payload->>'deliverable'), ''),
    trim(payload->>'category'), null, payload->>'type', payload->>'location_mode',
    case when payload->>'location_mode' = 'remote' then null else nullif(trim(payload->>'city'), '') end,
    nullif(trim(payload->>'expected_duration'), ''),
    nullif(payload->>'weekly_commitment_hours', '')::integer,
    payload->>'compensation_type', nullif(trim(payload->>'compensation_notes'), ''),
    'recruiting'
  ) returning id into project_id;

  for role in select value from jsonb_array_elements(payload->'roles')
  loop
    insert into public.project_roles (project_id, title, description, required_skills, seats)
    values (
      project_id, trim(role->>'title'), trim(role->>'description'),
      coalesce(array(select jsonb_array_elements_text(coalesce(role->'required_skills', '[]'::jsonb))), '{}'::text[]),
      greatest(1, coalesce((role->>'seats')::integer, 1))
    );
  end loop;

  return project_id;
end;
$$;

revoke all on function public.create_project_with_roles(jsonb) from public, anon;
grant execute on function public.create_project_with_roles(jsonb) to authenticated;
