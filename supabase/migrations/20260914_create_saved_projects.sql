create table public.saved_projects (
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index saved_projects_project_id_idx on public.saved_projects(project_id);

alter table public.saved_projects enable row level security;

grant select, insert, delete on table public.saved_projects to authenticated;

create policy "Users can read own saved projects"
on public.saved_projects for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can save projects for themselves"
on public.saved_projects for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can remove own saved projects"
on public.saved_projects for delete to authenticated
using ((select auth.uid()) = user_id);
