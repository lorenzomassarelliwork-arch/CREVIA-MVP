
drop policy if exists "Owners can update own projects" on public.projects;
drop policy if exists "Project admins can update projects" on public.projects;
create policy "Project managers can update projects"
on public.projects for update to authenticated
using (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.project_admins pa
    where pa.project_id = id and pa.user_id = (select auth.uid())
  )
)
with check (
  owner_id = (select auth.uid())
  or exists (
    select 1 from public.project_admins pa
    where pa.project_id = id and pa.user_id = (select auth.uid())
  )
);

drop policy if exists "Owners can create roles for own projects" on public.project_roles;
drop policy if exists "Project admins can create roles" on public.project_roles;
create policy "Project managers can create roles"
on public.project_roles for insert to authenticated
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_admins pa
          where pa.project_id = p.id and pa.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Owners can update roles for own projects" on public.project_roles;
drop policy if exists "Project admins can update roles" on public.project_roles;
create policy "Project managers can update roles"
on public.project_roles for update to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_admins pa
          where pa.project_id = p.id and pa.user_id = (select auth.uid())
        )
      )
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_admins pa
          where pa.project_id = p.id and pa.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Owners can delete roles for own projects" on public.project_roles;
drop policy if exists "Project admins can delete roles" on public.project_roles;
create policy "Project managers can delete roles"
on public.project_roles for delete to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_admins pa
          where pa.project_id = p.id and pa.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Applicants and owners can read applications" on public.applications;
drop policy if exists "Project admins can read applications" on public.applications;
create policy "Applicants and project managers can read applications"
on public.applications for select to authenticated
using (
  applicant_id = (select auth.uid())
  or exists (
    select 1 from public.projects p
    where p.id = project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_admins pa
          where pa.project_id = p.id and pa.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Owners can update project applications" on public.applications;
drop policy if exists "Project admins can update applications" on public.applications;
create policy "Project managers can update applications"
on public.applications for update to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_admins pa
          where pa.project_id = p.id and pa.user_id = (select auth.uid())
        )
      )
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_admins pa
          where pa.project_id = p.id and pa.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Owners can update project members" on public.project_members;
drop policy if exists "Project admins can update project members" on public.project_members;
create policy "Project managers can update project members"
on public.project_members for update to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_admins pa
          where pa.project_id = p.id and pa.user_id = (select auth.uid())
        )
      )
  )
)
with check (
  exists (
    select 1 from public.projects p
    where p.id = project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_admins pa
          where pa.project_id = p.id and pa.user_id = (select auth.uid())
        )
      )
  )
);

drop policy if exists "Project owners can create valid experiences" on public.verified_experiences;
drop policy if exists "Project admins can create valid experiences" on public.verified_experiences;
create policy "Project managers can create valid experiences"
on public.verified_experiences for insert to authenticated
with check (
  exists (
    select 1
    from public.projects p
    join public.project_members m
      on m.project_id = p.id
     and m.user_id = public.verified_experiences.user_id
     and m.role_id = public.verified_experiences.role_id
    join public.project_roles r
      on r.id = public.verified_experiences.role_id
     and r.project_id = public.verified_experiences.project_id
    where p.id = public.verified_experiences.project_id
      and (
        p.owner_id = (select auth.uid())
        or exists (
          select 1 from public.project_admins pa
          where pa.project_id = p.id and pa.user_id = (select auth.uid())
        )
      )
      and p.status = 'completed'
      and m.status = 'completed'
      and m.completed_at is not null
      and public.verified_experiences.role_title = r.title
      and public.verified_experiences.skills = r.required_skills
      and public.verified_experiences.started_at = m.joined_at
      and public.verified_experiences.completed_at = m.completed_at
  )
);

drop policy if exists "Users can read accessible chats" on public.chat_conversations;
drop policy if exists "Project admins can read accessible chats" on public.chat_conversations;
create policy "Users can read accessible chats"
on public.chat_conversations for select to authenticated
using (
  (kind = 'direct'
    and (direct_user_a = (select auth.uid()) or direct_user_b = (select auth.uid())))
  or
  (kind = 'project'
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and (
          p.owner_id = (select auth.uid())
          or exists (
            select 1 from public.project_admins pa
            where pa.project_id = p.id and pa.user_id = (select auth.uid())
          )
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.status in ('active','completed')
          )
        )
    ))
);

drop policy if exists "Users can create authorized chats" on public.chat_conversations;
drop policy if exists "Project admins can create project chats" on public.chat_conversations;
drop policy if exists "Project admins can create direct chats" on public.chat_conversations;
create policy "Users can create authorized chats"
on public.chat_conversations for insert to authenticated
with check (
  (
    kind = 'project'
    and project_id is not null
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and (
          p.owner_id = (select auth.uid())
          or exists (
            select 1 from public.project_admins pa
            where pa.project_id = p.id and pa.user_id = (select auth.uid())
          )
          or exists (
            select 1 from public.project_members pm
            where pm.project_id = p.id
              and pm.user_id = (select auth.uid())
              and pm.status in ('active','completed')
          )
        )
    )
  )
  or
  (
    kind = 'direct'
    and direct_context_project_id is not null
    and (direct_user_a = (select auth.uid()) or direct_user_b = (select auth.uid()))
    and exists (
      select 1 from public.projects p
      where p.id = direct_context_project_id
        and (
          (
            (
              p.owner_id = (select auth.uid())
              or exists (
                select 1 from public.project_admins pa
                where pa.project_id = p.id and pa.user_id = (select auth.uid())
              )
            )
            and (
              exists (
                select 1 from public.applications a
                where a.project_id = p.id
                  and a.applicant_id in (direct_user_a,direct_user_b)
                  and a.applicant_id <> (select auth.uid())
              )
              or exists (
                select 1 from public.project_members pm
                where pm.project_id = p.id
                  and pm.user_id in (direct_user_a,direct_user_b)
                  and pm.user_id <> (select auth.uid())
                  and pm.status in ('active','completed')
              )
            )
          )
          or
          (
            (
              p.owner_id in (direct_user_a,direct_user_b)
              or exists (
                select 1 from public.project_admins pa
                where pa.project_id = p.id
                  and pa.user_id in (direct_user_a,direct_user_b)
                  and pa.user_id <> (select auth.uid())
              )
            )
            and (
              exists (
                select 1 from public.applications a
                where a.project_id = p.id and a.applicant_id = (select auth.uid())
              )
              or exists (
                select 1 from public.project_members pm
                where pm.project_id = p.id
                  and pm.user_id = (select auth.uid())
                  and pm.status in ('active','completed')
              )
            )
          )
          or
          (
            exists (
              select 1 from public.project_members pm1
              where pm1.project_id = p.id
                and pm1.user_id = (select auth.uid())
                and pm1.status in ('active','completed')
            )
            and exists (
              select 1 from public.project_members pm2
              where pm2.project_id = p.id
                and pm2.user_id in (direct_user_a,direct_user_b)
                and pm2.user_id <> (select auth.uid())
                and pm2.status in ('active','completed')
            )
          )
        )
    )
  )
);
