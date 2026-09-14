import type {
  CompensationType,
  Project,
  ProjectLocationMode,
  ProjectRole,
  ProjectStatus,
  ProjectType,
} from '../../../domain/models';
import { CURRENT_USER_ID } from '../../../core/session';
import { supabase } from '../../../lib/supabase';
import { MVP_PROJECTS, MVP_PROJECT_ROLES } from '../data/mvpProjectData';
import {
  getProfileDisplayName,
  getProfileSnapshot,
} from '../../profile/services/profileService';

export type ProjectDetailData = { project: Project; roles: ProjectRole[] };
export type NewProjectInput = {
  title: string;
  description: string;
  goal: string;
  deliverable: string;
  category: string;
  type: ProjectType;
  locationMode: ProjectLocationMode;
  city?: string | null;
  expectedDuration?: string | null;
  weeklyCommitmentHours?: number | null;
  compensationType: CompensationType;
  compensationNotes?: string | null;
  roles: Array<{
    title: string;
    description: string;
    requiredSkills: string[];
    seats: number;
  }>;
};

type ProjectRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  goal: string;
  deliverable: string | null;
  category: string;
  cover_url: string | null;
  type: ProjectType;
  location_mode: ProjectLocationMode;
  city: string | null;
  expected_duration: string | null;
  weekly_commitment_hours: number | null;
  compensation_type: CompensationType;
  compensation_notes: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

type ProjectRoleRow = {
  id: string;
  project_id: string;
  title: string;
  description: string;
  required_skills: string[] | null;
  seats: number;
  created_at: string;
};

const demoProjects: Project[] = MVP_PROJECTS.map((project) => ({
  ...project,
  ownerId:
    project.ownerId === CURRENT_USER_ID ? 'demo-founder-1' : project.ownerId,
}));

let projectCache: Project[] = [...demoProjects];
let roleCache: ProjectRole[] = [...MVP_PROJECT_ROLES];

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Sessione utente non disponibile.');
  return user.id;
}

function mapProjectRow(row: ProjectRow, authUserId: string): Project {
  return {
    id: row.id,
    ownerId: row.owner_id === authUserId ? CURRENT_USER_ID : row.owner_id,
    title: row.title,
    description: row.description,
    goal: row.goal,
    deliverable: row.deliverable,
    category: row.category,
    coverUrl: row.cover_url,
    type: row.type,
    locationMode: row.location_mode,
    city: row.city,
    expectedDuration: row.expected_duration,
    weeklyCommitmentHours: row.weekly_commitment_hours,
    compensationType: row.compensation_type,
    compensationNotes: row.compensation_notes,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRoleRow(row: ProjectRoleRow): ProjectRole {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    requiredSkills: row.required_skills ?? [],
    seats: row.seats,
    createdAt: row.created_at,
  };
}

function mergeProjects(remote: Project[]): Project[] {
  const remoteIds = new Set(remote.map((project) => project.id));
  projectCache = [
    ...remote,
    ...demoProjects.filter((project) => !remoteIds.has(project.id)),
  ];
  return [...projectCache];
}

function cacheRoles(remote: ProjectRole[], projectId: string) {
  roleCache = [
    ...roleCache.filter((role) => role.projectId !== projectId),
    ...remote,
  ];
}

export async function listProjects(): Promise<Project[]> {
  const authUserId = await getAuthenticatedUserId();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  const remote = ((data ?? []) as ProjectRow[]).map((row) =>
    mapProjectRow(row, authUserId)
  );

  return mergeProjects(remote);
}

export async function getProjectDetail(
  projectId: string
): Promise<ProjectDetailData | null> {
  const demo = demoProjects.find((item) => item.id === projectId);
  if (demo) {
    return {
      project: demo,
      roles: roleCache.filter((role) => role.projectId === projectId),
    };
  }

  const authUserId = await getAuthenticatedUserId();
  const [{ data: projectData, error: projectError }, { data: roleData, error: roleError }] =
    await Promise.all([
      supabase.from('projects').select('*').eq('id', projectId).maybeSingle(),
      supabase
        .from('project_roles')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true }),
    ]);

  if (projectError) throw new Error(projectError.message);
  if (roleError) throw new Error(roleError.message);
  if (!projectData) return null;

  const project = mapProjectRow(projectData as ProjectRow, authUserId);
  const roles = ((roleData ?? []) as ProjectRoleRow[]).map(mapRoleRow);

  projectCache = [
    project,
    ...projectCache.filter((item) => item.id !== project.id),
  ];
  cacheRoles(roles, project.id);

  return { project, roles };
}

export function getProjectRole(roleId: string): ProjectRole | null {
  return roleCache.find((item) => item.id === roleId) ?? null;
}

export function isProjectOwner(project: Project): boolean {
  return project.ownerId === CURRENT_USER_ID;
}

export function getOwnerLabel(project: Project): string {
  if (project.ownerId === CURRENT_USER_ID) {
    const profile = getProfileSnapshot(CURRENT_USER_ID);
    return profile ? getProfileDisplayName(profile) : 'Creator Crevia';
  }
  if (project.ownerId === 'user-founder-2') return 'Team UniConnect';
  if (project.ownerId === 'user-founder-3') return 'Team LocalUp';
  if (project.ownerId === 'demo-founder-1') return 'Team GreenTrack';
  return 'Creator Crevia';
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  await getAuthenticatedUserId();

  const payload = {
    title: input.title.trim(),
    description: input.description.trim(),
    goal: input.goal.trim(),
    deliverable: input.deliverable.trim(),
    category: input.category.trim(),
    type: input.type,
    location_mode: input.locationMode,
    city: input.locationMode === 'remote' ? null : input.city?.trim() || null,
    expected_duration: input.expectedDuration?.trim() || null,
    weekly_commitment_hours: input.weeklyCommitmentHours ?? null,
    compensation_type: input.compensationType,
    compensation_notes: input.compensationNotes?.trim() || null,
    roles: input.roles.map((role) => ({
      title: role.title.trim(),
      description: role.description.trim(),
      required_skills: role.requiredSkills
        .map((skill) => skill.trim())
        .filter(Boolean),
      seats: Math.max(1, role.seats),
    })),
  };

  const { data, error } = await supabase.rpc('create_project_with_roles', {
    payload,
  });

  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'string') {
    throw new Error('Creazione progetto non riuscita.');
  }

  const detail = await getProjectDetail(data);
  if (!detail) throw new Error('Progetto creato ma non recuperabile.');

  return detail.project;
}

export async function setProjectStatus(
  projectId: string,
  status: ProjectStatus
): Promise<Project> {
  const detail = await getProjectDetail(projectId);
  if (!detail) throw new Error('Progetto non trovato.');

  const project = detail.project;
  if (!isProjectOwner(project)) {
    throw new Error('Solo il creator può modificare lo stato del progetto.');
  }

  const allowed =
    (project.status === 'recruiting' &&
      (status === 'active' || status === 'cancelled')) ||
    (project.status === 'active' &&
      (status === 'completed' || status === 'cancelled'));

  if (!allowed) throw new Error('Transizione di stato non consentita.');

  const { data, error } = await supabase
    .from('projects')
    .update({ status })
    .eq('id', projectId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);

  const authUserId = await getAuthenticatedUserId();
  const updated = mapProjectRow(data as ProjectRow, authUserId);
  projectCache = projectCache.map((item) =>
    item.id === projectId ? updated : item
  );

  return updated;
}

export function getCompensationLabel(project: Project): string {
  return project.compensationType === 'unpaid'
    ? 'Non retribuito'
    : project.compensationType === 'expense_reimbursement'
      ? 'Rimborso spese'
      : project.compensationType === 'prize'
        ? 'Premio previsto'
        : 'Compenso da concordare';
}

export function getLocationLabel(project: Project): string {
  return project.locationMode === 'remote'
    ? 'Da remoto'
    : project.locationMode === 'onsite'
      ? (project.city ?? 'In presenza')
      : project.city
        ? `Ibrido · ${project.city}`
        : 'Ibrido';
}

export function getProjectStatusLabel(status: ProjectStatus): string {
  return status === 'recruiting'
    ? 'In recruiting'
    : status === 'active'
      ? 'In corso'
      : status === 'completed'
        ? 'Completato'
        : 'Annullato';
}
