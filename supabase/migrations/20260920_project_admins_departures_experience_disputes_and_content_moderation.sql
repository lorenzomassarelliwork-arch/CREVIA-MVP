-- Project co-founders / admins, voluntary departures, experience disputes and content moderation.
create table if not exists public.project_admins (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  added_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index if not exists project_admins_user_id_idx on public.project_admins(user_id);

alter table public.project_admins enable row level security;
grant select, insert, delete on table public.project_admins to authenticated;

create policy "Authenticated users can read project admins"
on public.project_admins for select to authenticated using (true);

create policy "Primary owners can add project admins"
on public.project_admins for insert to authenticated
with check (
  added_by = (select auth.uid())
  and user_id <> (select auth.uid())
  and exists (
    select 1 from public.projects p
    where p.id = project_id
      and p.owner_id = (select auth.uid())
      and p.status in ('recruiting','active')
  )
  and exists (
    select 1 from public.project_members pm
    where pm.project_id = project_id
      and pm.user_id = user_id
      and pm.status = 'active'
  )
);

create policy "Primary owners can remove project admins"
on public.project_admins for delete to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
);

create policy "Project admins can update projects"
on public.projects for update to authenticated
using (
  exists (
    select 1 from public.project_admins pa
    where pa.project_id = id and pa.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.project_admins pa
    where pa.project_id = id and pa.user_id = (select auth.uid())
  )
);

create policy "Project admins can create roles"
on public.project_roles for insert to authenticated
with check (
  exists (
    select 1 from public.project_admins pa
    where pa.project_id = project_id and pa.user_id = (select auth.uid())
  )
);

create policy "Project admins can update roles"
on public.project_roles for update to authenticated
using (
  exists (
    select 1 from public.project_admins pa
    where pa.project_id = project_id and pa.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.project_admins pa
    where pa.project_id = project_id and pa.user_id = (select auth.uid())
  )
);

create policy "Project admins can delete roles"
on public.project_roles for delete to authenticated
using (
  exists (
    select 1 from public.project_admins pa
    where pa.project_id = project_id and pa.user_id = (select auth.uid())
  )
);

create policy "Project admins can read applications"
on public.applications for select to authenticated
using (
  exists (
    select 1 from public.project_admins pa
    where pa.project_id = project_id and pa.user_id = (select auth.uid())
  )
);

create policy "Project admins can update applications"
on public.applications for update to authenticated
using (
  exists (
    select 1 from public.project_admins pa
    where pa.project_id = project_id and pa.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.project_admins pa
    where pa.project_id = project_id and pa.user_id = (select auth.uid())
  )
);

create policy "Project admins can update project members"
on public.project_members for update to authenticated
using (
  exists (
    select 1 from public.project_admins pa
    where pa.project_id = project_id and pa.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.project_admins pa
    where pa.project_id = project_id and pa.user_id = (select auth.uid())
  )
);

create policy "Project admins can create valid experiences"
on public.verified_experiences for insert to authenticated
with check (
  exists (
    select 1
    from public.project_admins pa
    join public.projects p on p.id = pa.project_id
    join public.project_members m
      on m.project_id = p.id
     and m.user_id = public.verified_experiences.user_id
     and m.role_id = public.verified_experiences.role_id
    join public.project_roles r
      on r.id = public.verified_experiences.role_id
     and r.project_id = public.verified_experiences.project_id
    where pa.project_id = public.verified_experiences.project_id
      and pa.user_id = (select auth.uid())
      and p.status = 'completed'
      and m.status = 'completed'
      and m.completed_at is not null
      and public.verified_experiences.role_title = r.title
      and public.verified_experiences.skills = r.required_skills
      and public.verified_experiences.started_at = m.joined_at
      and public.verified_experiences.completed_at = m.completed_at
  )
);

create table if not exists public.project_departures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid not null unique references public.project_members(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text check (reason is null or char_length(reason) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists project_departures_project_id_idx on public.project_departures(project_id);
create index if not exists project_departures_user_id_idx on public.project_departures(user_id);

alter table public.project_departures enable row level security;
grant select, insert on table public.project_departures to authenticated;

create policy "Users can read relevant departures"
on public.project_departures for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.project_admins pa
    where pa.project_id = project_id and pa.user_id = (select auth.uid())
  )
);

create policy "Active members can leave projects"
on public.project_departures for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.project_members pm
    join public.projects p on p.id = pm.project_id
    where pm.id = member_id
      and pm.project_id = project_id
      and pm.user_id = (select auth.uid())
      and pm.status = 'active'
      and p.status in ('recruiting','active')
  )
);

create table if not exists public.experience_exclusions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid not null unique references public.project_members(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  response_status text not null default 'pending'
    check (response_status in ('pending','acknowledged','reported')),
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create index if not exists experience_exclusions_user_id_idx on public.experience_exclusions(user_id);
create index if not exists experience_exclusions_project_id_idx on public.experience_exclusions(project_id);
create index if not exists experience_exclusions_status_idx on public.experience_exclusions(response_status, created_at desc);

alter table public.experience_exclusions enable row level security;
grant select on table public.experience_exclusions to authenticated;
grant update (response_status, notes, responded_at) on table public.experience_exclusions to authenticated;

create policy "Users can read own experience exclusions"
on public.experience_exclusions for select to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.projects p
    where p.id = project_id and p.owner_id = (select auth.uid())
  )
  or exists (
    select 1 from public.project_admins pa
    where pa.project_id = project_id and pa.user_id = (select auth.uid())
  )
);

create policy "Participants can respond to own experience exclusions"
on public.experience_exclusions for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create or replace function public.validate_experience_exclusion_response()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.response_status <> 'pending' then
    raise exception 'Experience exclusion already handled';
  end if;
  if new.response_status not in ('acknowledged','reported') then
    raise exception 'Invalid experience exclusion response';
  end if;
  new.responded_at := coalesce(new.responded_at, now());
  if new.response_status = 'acknowledged' then new.notes := null; end if;
  return new;
end;
$$;
revoke all on function public.validate_experience_exclusion_response() from public, anon, authenticated;

create trigger validate_experience_exclusion_response_update
before update on public.experience_exclusions
for each row execute procedure public.validate_experience_exclusion_response();

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'application_received','application_accepted','application_rejected','project_started',
  'project_cancelled','experience_pending','experience_verified','member_removed',
  'message_received','member_left','cofounder_added','cofounder_removed','experience_not_selected'
));
alter table public.notifications
  add column if not exists experience_exclusion_id uuid references public.experience_exclusions(id) on delete set null;
create index if not exists notifications_experience_exclusion_idx on public.notifications(experience_exclusion_id);

create or replace function public.notify_project_admin_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare project_title text;
begin
  select p.title into project_title from public.projects p
  where p.id = coalesce(new.project_id, old.project_id);
  if tg_op = 'INSERT' then
    insert into public.notifications(user_id,type,actor_id,project_id,title,body)
    values (new.user_id,'cofounder_added',new.added_by,new.project_id,'Sei stato nominato co-founder',
      'Ora puoi gestire il progetto "' || coalesce(project_title,'Progetto') || '" insieme al founder principale.');
    return new;
  end if;
  insert into public.notifications(user_id,type,actor_id,project_id,title,body)
  values (old.user_id,'cofounder_removed',auth.uid(),old.project_id,'Ruolo co-founder rimosso',
    'Non sei più co-founder del progetto "' || coalesce(project_title,'Progetto') || '".');
  return old;
end;
$$;
revoke all on function public.notify_project_admin_change() from public, anon, authenticated;
create trigger notify_project_admin_change_insert after insert on public.project_admins
for each row execute procedure public.notify_project_admin_change();
create trigger notify_project_admin_change_delete after delete on public.project_admins
for each row execute procedure public.notify_project_admin_change();

create or replace function public.validate_application_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_owner_id uuid;
  project_status text;
  role_seats integer;
  occupied_count integer;
  can_manage boolean;
begin
  if old.status <> 'pending' then raise exception 'Application already handled'; end if;
  if new.status not in ('accepted','rejected') then raise exception 'Invalid application status transition'; end if;

  select p.owner_id,p.status into project_owner_id,project_status
  from public.projects p where p.id = old.project_id;

  can_manage := project_owner_id = auth.uid()
    or exists (select 1 from public.project_admins pa where pa.project_id = old.project_id and pa.user_id = auth.uid());
  if not can_manage then raise exception 'Only project admins can manage applications'; end if;
  if project_status not in ('recruiting','active') then raise exception 'Project is closed'; end if;

  if new.status = 'accepted' then
    select r.seats into role_seats from public.project_roles r
    where r.id = old.role_id and r.project_id = old.project_id for update;
    if not found then raise exception 'Role not found'; end if;
    select count(*) into occupied_count from public.project_members m
    where m.role_id = old.role_id and m.status = 'active';
    if occupied_count >= role_seats then raise exception 'No seats available'; end if;
  end if;

  new.project_id := old.project_id;
  new.role_id := old.role_id;
  new.applicant_id := old.applicant_id;
  new.motivation := old.motivation;
  new.portfolio_url := old.portfolio_url;
  return new;
end;
$$;
revoke all on function public.validate_application_update() from public, anon, authenticated;

create or replace function public.validate_project_member_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_owner_id uuid;
  project_status text;
  can_manage boolean;
  valid_self_leave boolean;
begin
  if old.status <> 'active' then raise exception 'Member is not active'; end if;
  if new.status not in ('removed','completed','left') then raise exception 'Invalid member status transition'; end if;

  select p.owner_id,p.status into project_owner_id,project_status
  from public.projects p where p.id = old.project_id;

  can_manage := project_owner_id = auth.uid()
    or exists (select 1 from public.project_admins pa where pa.project_id = old.project_id and pa.user_id = auth.uid());

  valid_self_leave := new.status = 'left'
    and old.user_id = auth.uid()
    and project_status in ('recruiting','active')
    and exists (select 1 from public.project_departures d where d.member_id = old.id and d.user_id = auth.uid());

  if not can_manage and not valid_self_leave then raise exception 'Only project admins can manage members'; end if;
  if new.status = 'removed' and project_status not in ('recruiting','active','cancelled') then raise exception 'Project is closed'; end if;
  if new.status in ('completed','left') and can_manage and project_status <> 'completed' then raise exception 'Project must be completed first'; end if;

  new.project_id := old.project_id;
  new.user_id := old.user_id;
  new.role_id := old.role_id;
  new.application_id := old.application_id;
  new.joined_at := old.joined_at;
  if new.status <> 'completed' then new.completed_at := null; end if;
  return new;
end;
$$;
revoke all on function public.validate_project_member_update() from public, anon, authenticated;

create or replace function public.process_project_departure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  project_title text;
  recipient_row record;
  participant_name text;
begin
  update public.project_members
  set status = 'left',completed_at = null
  where id = new.member_id and project_id = new.project_id and user_id = new.user_id and status = 'active';
  if not found then raise exception 'Member is not active'; end if;

  delete from public.project_admins where project_id = new.project_id and user_id = new.user_id;

  select p.title into project_title from public.projects p where p.id = new.project_id;
  select trim(p.first_name || ' ' || p.last_name) into participant_name from public.profiles p where p.id = new.user_id;

  for recipient_row in
    select p.owner_id as user_id from public.projects p where p.id = new.project_id
    union
    select pa.user_id from public.project_admins pa where pa.project_id = new.project_id
  loop
    if recipient_row.user_id <> new.user_id then
      insert into public.notifications(user_id,type,actor_id,project_id,title,body)
      values (recipient_row.user_id,'member_left',new.user_id,new.project_id,
        'Un partecipante ha abbandonato il progetto',
        coalesce(participant_name,'Un partecipante') || ' ha lasciato "' ||
        coalesce(project_title,'il progetto') || '".' ||
        case when nullif(btrim(new.reason),'') is not null then ' Motivazione: ' || btrim(new.reason)
             else ' Nessuna motivazione indicata.' end);
    end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.process_project_departure() from public, anon, authenticated;
create trigger process_project_departure_insert after insert on public.project_departures
for each row execute procedure public.process_project_departure();

create or replace function public.create_experience_exclusion_for_unselected_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare project_status text;
begin
  if old.status = 'active' and new.status = 'left' then
    select p.status into project_status from public.projects p where p.id = new.project_id;
    if project_status = 'completed'
      and not exists (select 1 from public.project_departures d where d.member_id = new.id) then
      insert into public.experience_exclusions(project_id,member_id,user_id,created_by)
      values (new.project_id,new.id,new.user_id,auth.uid())
      on conflict (member_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.create_experience_exclusion_for_unselected_member() from public, anon, authenticated;
create trigger create_experience_exclusion_member_update after update of status on public.project_members
for each row execute procedure public.create_experience_exclusion_for_unselected_member();

create or replace function public.notify_experience_exclusion()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare project_title text;
begin
  select p.title into project_title from public.projects p where p.id = new.project_id;
  insert into public.notifications(user_id,type,actor_id,project_id,experience_exclusion_id,title,body)
  values (new.user_id,'experience_not_selected',new.created_by,new.project_id,new.id,
    'Crevia Experience non assegnata',
    'Non sei stato selezionato per la verifica della Crevia Experience di "' ||
    coalesce(project_title,'questo progetto') ||
    '". Puoi prenderne atto oppure inviare una segnalazione a Crevia.');
  return new;
end;
$$;
revoke all on function public.notify_experience_exclusion() from public, anon, authenticated;
create trigger notify_experience_exclusion_insert after insert on public.experience_exclusions
for each row execute procedure public.notify_experience_exclusion();

create or replace function public.create_pending_experiences(target_project_id uuid)
returns setof public.verified_experiences
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.projects p
    where p.id = target_project_id and p.status = 'completed'
      and (p.owner_id = auth.uid()
        or exists (select 1 from public.project_admins pa where pa.project_id = p.id and pa.user_id = auth.uid()))
  ) then raise exception 'Only a project admin of a completed project can create experiences'; end if;

  return query
  insert into public.verified_experiences(project_id,user_id,role_id,role_title,skills,started_at,completed_at)
  select m.project_id,m.user_id,m.role_id,r.title,r.required_skills,m.joined_at,m.completed_at
  from public.project_members m
  join public.project_roles r on r.id = m.role_id and r.project_id = m.project_id
  where m.project_id = target_project_id and m.status = 'completed' and m.completed_at is not null
  on conflict (project_id,user_id) do nothing
  returning *;
end;
$$;
revoke all on function public.create_pending_experiences(uuid) from public, anon;
grant execute on function public.create_pending_experiences(uuid) to authenticated;

create policy "Project admins can read accessible chats"
on public.chat_conversations for select to authenticated
using (
  kind = 'project'
  and exists (select 1 from public.project_admins pa where pa.project_id = project_id and pa.user_id = (select auth.uid()))
);

create policy "Project admins can create project chats"
on public.chat_conversations for insert to authenticated
with check (
  kind = 'project' and project_id is not null
  and exists (select 1 from public.project_admins pa where pa.project_id = project_id and pa.user_id = (select auth.uid()))
);

create policy "Project admins can create direct chats"
on public.chat_conversations for insert to authenticated
with check (
  kind = 'direct'
  and direct_context_project_id is not null
  and (direct_user_a = (select auth.uid()) or direct_user_b = (select auth.uid()))
  and (
    (
      exists (select 1 from public.project_admins pa
        where pa.project_id = direct_context_project_id and pa.user_id = (select auth.uid()))
      and (
        exists (select 1 from public.applications a
          where a.project_id = direct_context_project_id and a.applicant_id in (direct_user_a,direct_user_b)
            and a.applicant_id <> (select auth.uid()))
        or exists (select 1 from public.project_members pm
          where pm.project_id = direct_context_project_id and pm.user_id in (direct_user_a,direct_user_b)
            and pm.user_id <> (select auth.uid()) and pm.status in ('active','completed'))
      )
    )
    or
    (
      exists (select 1 from public.project_admins pa
        where pa.project_id = direct_context_project_id and pa.user_id in (direct_user_a,direct_user_b)
          and pa.user_id <> (select auth.uid()))
      and (
        exists (select 1 from public.applications a
          where a.project_id = direct_context_project_id and a.applicant_id = (select auth.uid()))
        or exists (select 1 from public.project_members pm
          where pm.project_id = direct_context_project_id and pm.user_id = (select auth.uid())
            and pm.status in ('active','completed'))
      )
    )
  )
);

create or replace function public.notify_application_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare project_title text; applicant_name text; recipient_row record;
begin
  select p.title into project_title from public.projects p where p.id = new.project_id;
  if tg_op = 'INSERT' then
    select trim(pr.first_name || ' ' || pr.last_name) into applicant_name from public.profiles pr where pr.id = new.applicant_id;
    for recipient_row in
      select p.owner_id as user_id from public.projects p where p.id = new.project_id
      union select pa.user_id from public.project_admins pa where pa.project_id = new.project_id
    loop
      insert into public.notifications(user_id,type,actor_id,project_id,application_id,title,body)
      values (recipient_row.user_id,'application_received',new.applicant_id,new.project_id,new.id,'Nuova candidatura',
        coalesce(applicant_name,'Un builder') || ' si è candidato a "' || coalesce(project_title,'un tuo progetto') || '".');
    end loop;
    return new;
  end if;
  if old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications(user_id,type,actor_id,project_id,application_id,title,body)
    values (new.applicant_id,'application_accepted',auth.uid(),new.project_id,new.id,'Candidatura accettata',
      'Sei entrato nel team di "' || coalesce(project_title,'un progetto') || '".');
  elsif old.status = 'pending' and new.status = 'rejected' then
    insert into public.notifications(user_id,type,actor_id,project_id,application_id,title,body)
    values (new.applicant_id,'application_rejected',auth.uid(),new.project_id,new.id,'Aggiornamento candidatura',
      'La candidatura per "' || coalesce(project_title,'un progetto') || '" non è stata selezionata.');
  end if;
  return new;
end;
$$;
revoke all on function public.notify_application_events() from public, anon, authenticated;

create or replace function public.notify_experience_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare project_title text; project_owner uuid; participant_name text; recipient_row record;
begin
  select p.title,p.owner_id into project_title,project_owner from public.projects p where p.id = new.project_id;
  if tg_op = 'INSERT' and new.verification_status = 'pending' then
    insert into public.notifications(user_id,type,actor_id,project_id,experience_id,title,body)
    values (new.user_id,'experience_pending',auth.uid(),new.project_id,new.id,'Conferma la tua esperienza',
      'Il progetto "' || coalesce(project_title,'Progetto') || '" è stato completato. Conferma la partecipazione per verificare la tua Crevia Experience.');
  elsif tg_op = 'UPDATE' and old.verification_status = 'pending' and new.verification_status = 'verified' then
    select trim(pr.first_name || ' ' || pr.last_name) into participant_name from public.profiles pr where pr.id = new.user_id;
    for recipient_row in
      select project_owner as user_id
      union select pa.user_id from public.project_admins pa where pa.project_id = new.project_id
    loop
      insert into public.notifications(user_id,type,actor_id,project_id,experience_id,title,body)
      values (recipient_row.user_id,'experience_verified',new.user_id,new.project_id,new.id,'Esperienza confermata',
        coalesce(participant_name,'Un partecipante') || ' ha confermato la Crevia Experience per "' || coalesce(project_title,'il progetto') || '".');
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_experience_events() from public, anon, authenticated;

create or replace function public.notify_chat_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare c public.chat_conversations%rowtype; recipient uuid; recipient_row record; sender_name text; project_title text; preview text;
begin
  select * into c from public.chat_conversations where id = new.conversation_id;
  select trim(p.first_name || ' ' || p.last_name) into sender_name from public.profiles p where p.id = new.sender_id;
  preview := left(btrim(new.body),120);
  if c.kind = 'direct' then
    recipient := case when c.direct_user_a = new.sender_id then c.direct_user_b else c.direct_user_a end;
    insert into public.notifications(user_id,type,actor_id,conversation_id,title,body)
    values (recipient,'message_received',new.sender_id,c.id,coalesce(sender_name,'Nuovo messaggio'),preview);
  else
    select p.title into project_title from public.projects p where p.id = c.project_id;
    for recipient_row in
      select p.owner_id as user_id from public.projects p where p.id = c.project_id and p.owner_id <> new.sender_id
      union select pa.user_id from public.project_admins pa where pa.project_id = c.project_id and pa.user_id <> new.sender_id
      union select pm.user_id from public.project_members pm
        where pm.project_id = c.project_id and pm.status in ('active','completed') and pm.user_id <> new.sender_id
    loop
      insert into public.notifications(user_id,type,actor_id,project_id,conversation_id,title,body)
      values (recipient_row.user_id,'message_received',new.sender_id,c.project_id,c.id,
        coalesce(project_title,'Chat progetto'),coalesce(sender_name,'Un membro') || ': ' || preview);
    end loop;
  end if;
  return new;
end;
$$;
revoke all on function public.notify_chat_message() from public, anon, authenticated;

create or replace function public.contains_disallowed_content(input_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(lower(input_text),'') ~
    '(^|[^[:alnum:]])(cazzo|cazzi|cazzone|cazzata|merda|merde|stronzo|stronza|stronzi|stronze|vaffanculo|fanculo|coglione|cogliona|coglioni|puttana|puttane|troia|troie|bastardo|bastarda|bastardi|bastarde|figlio[[:space:]]+di[[:space:]]+puttana|porco[[:space:]]+dio|dio[[:space:]]+porco|dio[[:space:]]+cane|dio[[:space:]]+boia|madonna[[:space:]]+puttana)([^[:alnum:]]|$)';
$$;
revoke all on function public.contains_disallowed_content(text) from public, anon;
grant execute on function public.contains_disallowed_content(text) to authenticated;

create or replace function public.reject_disallowed_user_content()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare candidate text := '';
begin
  if tg_table_name = 'projects' then
    candidate := concat_ws(' ',new.title,new.description,new.goal,new.deliverable,new.category,new.compensation_notes);
  elsif tg_table_name = 'project_roles' then
    candidate := concat_ws(' ',new.title,new.description,array_to_string(new.required_skills,' '));
  elsif tg_table_name = 'applications' then
    candidate := coalesce(new.motivation,'');
  elsif tg_table_name = 'chat_messages' then
    candidate := coalesce(new.body,'');
  elsif tg_table_name = 'profiles' then
    candidate := concat_ws(' ',new.first_name,new.last_name,new.bio,new.headline,new.availability,array_to_string(new.skills,' '));
  elsif tg_table_name = 'project_departures' then
    candidate := coalesce(new.reason,'');
  elsif tg_table_name = 'experience_exclusions' then
    candidate := coalesce(new.notes,'');
  end if;
  if public.contains_disallowed_content(candidate) then raise exception 'CONTENT_NOT_ALLOWED'; end if;
  return new;
end;
$$;
revoke all on function public.reject_disallowed_user_content() from public, anon, authenticated;

create trigger moderate_projects_content before insert or update on public.projects
for each row execute procedure public.reject_disallowed_user_content();
create trigger moderate_project_roles_content before insert or update on public.project_roles
for each row execute procedure public.reject_disallowed_user_content();
create trigger moderate_applications_content before insert or update on public.applications
for each row execute procedure public.reject_disallowed_user_content();
create trigger moderate_chat_messages_content before insert or update on public.chat_messages
for each row execute procedure public.reject_disallowed_user_content();
create trigger moderate_profiles_content before insert or update on public.profiles
for each row execute procedure public.reject_disallowed_user_content();
create trigger moderate_project_departures_content before insert or update on public.project_departures
for each row execute procedure public.reject_disallowed_user_content();
create trigger moderate_experience_exclusions_content before insert or update on public.experience_exclusions
for each row execute procedure public.reject_disallowed_user_content();
