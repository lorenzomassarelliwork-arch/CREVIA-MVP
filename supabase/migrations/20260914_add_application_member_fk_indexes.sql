create index applications_role_project_idx
  on public.applications(role_id, project_id);

create index project_members_role_project_idx
  on public.project_members(role_id, project_id);
