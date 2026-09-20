
drop policy if exists "Primary owners can add project admins" on public.project_admins;
create policy "Primary owners can add project admins"
on public.project_admins for insert to authenticated
with check (
  added_by = (select auth.uid())
  and user_id <> (select auth.uid())
  and exists (
    select 1
    from public.projects p
    where p.id = project_id
      and p.owner_id = (select auth.uid())
      and p.status in ('recruiting','active')
  )
);

create or replace function public.keep_project_owner_immutable()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.owner_id is distinct from old.owner_id then
    raise exception 'PROJECT_OWNER_IMMUTABLE';
  end if;
  return new;
end;
$$;
revoke all on function public.keep_project_owner_immutable() from public, anon, authenticated;

drop trigger if exists keep_project_owner_immutable_update on public.projects;
create trigger keep_project_owner_immutable_update
before update on public.projects
for each row execute procedure public.keep_project_owner_immutable();
