create or replace function public.notify_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_title text;
  project_owner uuid;
  project_status text;
begin
  if old.status = 'active' and new.status = 'removed' then
    select p.title, p.owner_id, p.status into project_title, project_owner, project_status
    from public.projects p where p.id = new.project_id;

    if project_status <> 'cancelled' then
      insert into public.notifications(
        user_id, type, actor_id, project_id, title, body
      ) values (
        new.user_id,
        'member_removed',
        project_owner,
        new.project_id,
        'Partecipazione terminata',
        'Non fai più parte del team di "' || coalesce(project_title, 'questo progetto') || '".'
      );
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.notify_member_removed() from public, anon, authenticated;
