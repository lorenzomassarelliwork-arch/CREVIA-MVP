
drop policy if exists "Users can read own experience exclusions" on public.experience_exclusions;
create policy "Users can read own experience exclusions"
on public.experience_exclusions for select to authenticated
using (user_id = (select auth.uid()));

create index if not exists experience_exclusions_created_by_idx
  on public.experience_exclusions(created_by);
create index if not exists project_admins_added_by_idx
  on public.project_admins(added_by);
