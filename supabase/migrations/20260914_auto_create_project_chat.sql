create or replace function public.ensure_project_chat_for_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('active','completed') then
    insert into public.chat_conversations(kind, project_id)
    values ('project', new.project_id)
    on conflict (project_id) where kind = 'project' do nothing;
  end if;
  return new;
end;
$$;

revoke all on function public.ensure_project_chat_for_member() from public, anon, authenticated;

create trigger ensure_project_chat_after_member_insert
after insert on public.project_members
for each row execute procedure public.ensure_project_chat_for_member();
