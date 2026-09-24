
grant select on table public.platform_staff to authenticated;

create policy "Users can read own platform role"
on public.platform_staff for select to authenticated
using (user_id = (select auth.uid()));

create or replace function public.is_platform_staff()
returns boolean
language sql
security invoker
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.platform_staff ps
    where ps.user_id = auth.uid()
  );
$$;

create or replace function public.get_platform_role()
returns text
language sql
security invoker
stable
set search_path = ''
as $$
  select ps.role
  from public.platform_staff ps
  where ps.user_id = auth.uid()
  limit 1;
$$;
