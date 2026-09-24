
create table if not exists public.platform_staff (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null check (role in ('moderator','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.platform_staff_invites (
  email text primary key,
  role text not null check (role in ('moderator','admin')),
  created_at timestamptz not null default now()
);

alter table public.platform_staff enable row level security;
alter table public.platform_staff_invites enable row level security;

revoke all on table public.platform_staff from anon, authenticated;
revoke all on table public.platform_staff_invites from anon, authenticated;

create or replace function public.is_platform_staff()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.platform_staff ps
    where ps.user_id = auth.uid()
  );
$$;
revoke all on function public.is_platform_staff() from public, anon;
grant execute on function public.is_platform_staff() to authenticated;

create or replace function public.get_platform_role()
returns text
language sql
security definer
stable
set search_path = ''
as $$
  select ps.role
  from public.platform_staff ps
  where ps.user_id = auth.uid()
  limit 1;
$$;
revoke all on function public.get_platform_role() from public, anon;
grant execute on function public.get_platform_role() to authenticated;

drop policy if exists "Platform staff can read all reports" on public.content_reports;
create policy "Platform staff can read all reports"
on public.content_reports for select to authenticated
using (public.is_platform_staff());

grant update(status, reviewed_at) on table public.content_reports to authenticated;

drop policy if exists "Platform staff can update report status" on public.content_reports;
create policy "Platform staff can update report status"
on public.content_reports for update to authenticated
using (public.is_platform_staff())
with check (public.is_platform_staff());

drop policy if exists "Users can read own experience exclusions" on public.experience_exclusions;
create policy "Users and staff can read experience exclusions"
on public.experience_exclusions for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_platform_staff()
);

create or replace function public.set_content_report_status(
  report_id uuid,
  next_status text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_platform_staff() then
    raise exception 'STAFF_ONLY';
  end if;

  if next_status not in ('open','reviewing','resolved','dismissed') then
    raise exception 'INVALID_REPORT_STATUS';
  end if;

  update public.content_reports
  set status = next_status,
      reviewed_at = case
        when next_status in ('resolved','dismissed') then now()
        else reviewed_at
      end
  where id = report_id;

  if not found then
    raise exception 'REPORT_NOT_FOUND';
  end if;
end;
$$;
revoke all on function public.set_content_report_status(uuid,text) from public, anon;
grant execute on function public.set_content_report_status(uuid,text) to authenticated;

create or replace function public.claim_staff_invite_for_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  account_email text;
  invited_role text;
begin
  select lower(u.email) into account_email
  from auth.users u
  where u.id = new.id;

  if account_email is null then
    return new;
  end if;

  select psi.role into invited_role
  from public.platform_staff_invites psi
  where lower(psi.email) = account_email;

  if invited_role is not null then
    insert into public.platform_staff(user_id, role)
    values (new.id, invited_role)
    on conflict (user_id) do update set role = excluded.role;

    delete from public.platform_staff_invites
    where lower(email) = account_email;
  end if;

  return new;
end;
$$;
revoke all on function public.claim_staff_invite_for_profile() from public, anon, authenticated;

drop trigger if exists claim_staff_invite_profile_insert on public.profiles;
create trigger claim_staff_invite_profile_insert
after insert on public.profiles
for each row execute procedure public.claim_staff_invite_for_profile();

insert into public.platform_staff_invites(email, role)
values ('lorenzo.massarelli.work@gmail.com','admin')
on conflict (email) do update set role = excluded.role;
