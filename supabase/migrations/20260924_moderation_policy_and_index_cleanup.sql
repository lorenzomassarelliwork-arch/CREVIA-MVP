
create index if not exists experience_exclusions_moderated_by_idx
  on public.experience_exclusions(moderated_by);

drop policy if exists "Users can read own reports" on public.content_reports;
drop policy if exists "Platform staff can read all reports" on public.content_reports;

create policy "Users and staff can read reports"
on public.content_reports for select to authenticated
using (
  reporter_id = (select auth.uid())
  or public.is_platform_staff()
);
