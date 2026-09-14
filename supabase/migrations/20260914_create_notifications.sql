create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in (
    'application_received',
    'application_accepted',
    'application_rejected',
    'project_started',
    'project_cancelled',
    'experience_pending',
    'experience_verified',
    'member_removed'
  )),
  actor_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  experience_id uuid references public.verified_experiences(id) on delete set null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_at_idx
  on public.notifications(user_id, created_at desc);
create index notifications_user_unread_idx
  on public.notifications(user_id, created_at desc)
  where read_at is null;
create index notifications_project_id_idx
  on public.notifications(project_id);

alter table public.notifications enable row level security;

grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;

create policy "Users can read own notifications"
on public.notifications for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can mark own notifications read"
on public.notifications for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.notify_application_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_owner uuid;
  project_title text;
  applicant_name text;
begin
  if tg_op = 'INSERT' then
    select p.owner_id, p.title into project_owner, project_title
    from public.projects p where p.id = new.project_id;

    select trim(pr.first_name || ' ' || pr.last_name) into applicant_name
    from public.profiles pr where pr.id = new.applicant_id;

    insert into public.notifications(
      user_id, type, actor_id, project_id, application_id, title, body
    ) values (
      project_owner,
      'application_received',
      new.applicant_id,
      new.project_id,
      new.id,
      'Nuova candidatura',
      coalesce(applicant_name, 'Un builder') || ' si è candidato a "' || coalesce(project_title, 'un tuo progetto') || '".'
    );
    return new;
  end if;

  if old.status = 'pending' and new.status = 'accepted' then
    select p.title into project_title from public.projects p where p.id = new.project_id;
    insert into public.notifications(
      user_id, type, actor_id, project_id, application_id, title, body
    ) values (
      new.applicant_id,
      'application_accepted',
      (select p.owner_id from public.projects p where p.id = new.project_id),
      new.project_id,
      new.id,
      'Candidatura accettata',
      'Sei entrato nel team di "' || coalesce(project_title, 'un progetto') || '".'
    );
  elsif old.status = 'pending' and new.status = 'rejected' then
    select p.title into project_title from public.projects p where p.id = new.project_id;
    insert into public.notifications(
      user_id, type, actor_id, project_id, application_id, title, body
    ) values (
      new.applicant_id,
      'application_rejected',
      (select p.owner_id from public.projects p where p.id = new.project_id),
      new.project_id,
      new.id,
      'Aggiornamento candidatura',
      'La candidatura per "' || coalesce(project_title, 'un progetto') || '" non è stata selezionata.'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_application_events() from public, anon, authenticated;

create trigger notify_application_insert
after insert on public.applications
for each row execute procedure public.notify_application_events();

create trigger notify_application_update
after update of status on public.applications
for each row execute procedure public.notify_application_events();

create or replace function public.notify_project_status_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member_row record;
begin
  if new.status = old.status then return new; end if;

  if new.status = 'active' then
    for member_row in
      select distinct pm.user_id
      from public.project_members pm
      where pm.project_id = new.id and pm.status = 'active'
    loop
      insert into public.notifications(user_id, type, actor_id, project_id, title, body)
      values (
        member_row.user_id,
        'project_started',
        new.owner_id,
        new.id,
        'Il progetto è iniziato',
        '"' || new.title || '" è ora in corso.'
      );
    end loop;
  elsif new.status = 'cancelled' then
    for member_row in
      select distinct pm.user_id
      from public.project_members pm
      where pm.project_id = new.id and pm.status in ('active','completed')
    loop
      insert into public.notifications(user_id, type, actor_id, project_id, title, body)
      values (
        member_row.user_id,
        'project_cancelled',
        new.owner_id,
        new.id,
        'Progetto annullato',
        '"' || new.title || '" è stato annullato.'
      );
    end loop;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_project_status_events() from public, anon, authenticated;

create trigger notify_project_status_update
after update of status on public.projects
for each row execute procedure public.notify_project_status_events();

create or replace function public.notify_experience_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_title text;
  project_owner uuid;
  participant_name text;
begin
  select p.title, p.owner_id into project_title, project_owner
  from public.projects p where p.id = new.project_id;

  if tg_op = 'INSERT' and new.verification_status = 'pending' then
    insert into public.notifications(
      user_id, type, actor_id, project_id, experience_id, title, body
    ) values (
      new.user_id,
      'experience_pending',
      project_owner,
      new.project_id,
      new.id,
      'Conferma la tua esperienza',
      'Il progetto "' || coalesce(project_title, 'Progetto') || '" è stato completato. Conferma la partecipazione per verificare la tua Crevia Experience.'
    );
  elsif tg_op = 'UPDATE'
    and old.verification_status = 'pending'
    and new.verification_status = 'verified' then
    select trim(pr.first_name || ' ' || pr.last_name) into participant_name
    from public.profiles pr where pr.id = new.user_id;

    insert into public.notifications(
      user_id, type, actor_id, project_id, experience_id, title, body
    ) values (
      project_owner,
      'experience_verified',
      new.user_id,
      new.project_id,
      new.id,
      'Esperienza confermata',
      coalesce(participant_name, 'Un partecipante') || ' ha confermato la Crevia Experience per "' || coalesce(project_title, 'il progetto') || '".'
    );
  end if;

  return new;
end;
$$;

revoke all on function public.notify_experience_events() from public, anon, authenticated;

create trigger notify_experience_insert
after insert on public.verified_experiences
for each row execute procedure public.notify_experience_events();

create trigger notify_experience_update
after update of verification_status on public.verified_experiences
for each row execute procedure public.notify_experience_events();

create or replace function public.notify_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_title text;
  project_owner uuid;
begin
  if old.status = 'active' and new.status = 'removed' then
    select p.title, p.owner_id into project_title, project_owner
    from public.projects p where p.id = new.project_id;

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
  return new;
end;
$$;

revoke all on function public.notify_member_removed() from public, anon, authenticated;

create trigger notify_member_removed_update
after update of status on public.project_members
for each row execute procedure public.notify_member_removed();
