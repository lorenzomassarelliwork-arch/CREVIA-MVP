
create or replace function public.remove_admin_when_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'active' and new.status = 'removed' then
    delete from public.project_admins
    where project_id = new.project_id and user_id = new.user_id;
  end if;
  return new;
end;
$$;
revoke all on function public.remove_admin_when_member_removed() from public, anon, authenticated;

drop trigger if exists remove_admin_when_member_removed_update on public.project_members;
create trigger remove_admin_when_member_removed_update
after update of status on public.project_members
for each row execute procedure public.remove_admin_when_member_removed();
