
alter table public.experience_exclusions
  add column if not exists moderation_status text not null default 'open'
    check (moderation_status in ('open','reviewing','resolved','dismissed')),
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by uuid references public.profiles(id) on delete set null;

create index if not exists experience_exclusions_moderation_status_idx
  on public.experience_exclusions(moderation_status, responded_at desc)
  where response_status = 'reported';

drop trigger if exists validate_experience_exclusion_response_update
on public.experience_exclusions;

create trigger validate_experience_exclusion_response_update
before update of response_status, notes, responded_at
on public.experience_exclusions
for each row execute procedure public.validate_experience_exclusion_response();

create or replace function private.set_experience_exclusion_moderation_status_impl(
  exclusion_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.platform_staff ps
    where ps.user_id = auth.uid()
  ) then
    raise exception 'STAFF_ONLY';
  end if;

  if next_status not in ('open','reviewing','resolved','dismissed') then
    raise exception 'INVALID_REPORT_STATUS';
  end if;

  update public.experience_exclusions
  set moderation_status = next_status,
      moderated_by = auth.uid(),
      moderated_at = case
        when next_status in ('resolved','dismissed') then now()
        else moderated_at
      end
  where id = exclusion_id
    and response_status = 'reported';

  if not found then
    raise exception 'EXPERIENCE_EXCLUSION_NOT_FOUND';
  end if;
end;
$$;

revoke all on function private.set_experience_exclusion_moderation_status_impl(uuid,text)
from public, anon;
grant execute on function private.set_experience_exclusion_moderation_status_impl(uuid,text)
to authenticated;

create or replace function public.set_experience_exclusion_moderation_status(
  exclusion_id uuid,
  next_status text
)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_experience_exclusion_moderation_status_impl(
    exclusion_id,
    next_status
  );
$$;

revoke all on function public.set_experience_exclusion_moderation_status(uuid,text)
from public, anon;
grant execute on function public.set_experience_exclusion_moderation_status(uuid,text)
to authenticated;
