import type { CompensationType, Project, ProjectLocationMode, ProjectRole, ProjectStatus, ProjectType } from '../../../domain/models';
import { CURRENT_USER_ID } from '../../../core/session';
import { MVP_PROJECTS, MVP_PROJECT_ROLES } from '../data/mvpProjectData';

export type ProjectDetailData = { project: Project; roles: ProjectRole[] };
export type NewProjectInput = {
  title: string; description: string; goal: string; deliverable: string; category: string; type: ProjectType;
  locationMode: ProjectLocationMode; city?: string | null; expectedDuration?: string | null;
  weeklyCommitmentHours?: number | null; compensationType: CompensationType; compensationNotes?: string | null;
  roles: Array<{ title: string; description: string; requiredSkills: string[]; seats: number }>;
};

let projects: Project[] = [...MVP_PROJECTS];
let roles: ProjectRole[] = [...MVP_PROJECT_ROLES];

export async function listProjects(): Promise<Project[]> { return [...projects]; }
export async function getProjectDetail(projectId: string): Promise<ProjectDetailData | null> {
  const project = projects.find((item) => item.id === projectId) ?? null;
  return project ? { project, roles: roles.filter((role) => role.projectId === projectId) } : null;
}
export function getProjectRole(roleId: string): ProjectRole | null { return roles.find((item) => item.id === roleId) ?? null; }
export function isProjectOwner(project: Project): boolean { return project.ownerId === CURRENT_USER_ID; }
export function getOwnerLabel(project: Project): string {
  if (project.ownerId === CURRENT_USER_ID) return 'Lorenzo Massarelli';
  if (project.ownerId === 'user-founder-2') return 'Team UniConnect';
  if (project.ownerId === 'user-founder-3') return 'Team LocalUp';
  return 'Creator Crevia';
}
export async function createProject(input: NewProjectInput): Promise<Project> {
  const now = new Date().toISOString();
  const projectId = `project-${Date.now()}`;
  const project: Project = {
    id: projectId, ownerId: CURRENT_USER_ID, title: input.title.trim(), description: input.description.trim(), goal: input.goal.trim(),
    deliverable: input.deliverable.trim(), category: input.category.trim(), coverUrl: null, type: input.type,
    locationMode: input.locationMode, city: input.locationMode === 'remote' ? null : input.city?.trim() || null,
    expectedDuration: input.expectedDuration?.trim() || null, weeklyCommitmentHours: input.weeklyCommitmentHours ?? null,
    compensationType: input.compensationType, compensationNotes: input.compensationNotes?.trim() || null,
    status: 'recruiting', createdAt: now, updatedAt: now,
  };
  const newRoles: ProjectRole[] = input.roles.map((role, index) => ({
    id: `${projectId}-role-${index + 1}`, projectId, title: role.title.trim(), description: role.description.trim(),
    requiredSkills: role.requiredSkills.map((skill) => skill.trim()).filter(Boolean), seats: Math.max(1, role.seats), createdAt: now,
  }));
  projects = [project, ...projects];
  roles = [...newRoles, ...roles];
  return project;
}
export async function setProjectStatus(projectId: string, status: ProjectStatus): Promise<Project> {
  const project = projects.find((item) => item.id === projectId);
  if (!project) throw new Error('Progetto non trovato.');
  if (!isProjectOwner(project)) throw new Error('Solo il creator può modificare lo stato del progetto.');
  const allowed = (project.status === 'recruiting' && (status === 'active' || status === 'cancelled')) ||
    (project.status === 'active' && (status === 'completed' || status === 'cancelled'));
  if (!allowed) throw new Error('Transizione di stato non consentita.');
  const updated = { ...project, status, updatedAt: new Date().toISOString() };
  projects = projects.map((item) => item.id === projectId ? updated : item);
  return updated;
}
export function getCompensationLabel(project: Project): string {
  return project.compensationType === 'unpaid' ? 'Non retribuito' : project.compensationType === 'expense_reimbursement' ? 'Rimborso spese' : project.compensationType === 'prize' ? 'Premio previsto' : 'Compenso da concordare';
}
export function getLocationLabel(project: Project): string {
  return project.locationMode === 'remote' ? 'Da remoto' : project.locationMode === 'onsite' ? (project.city ?? 'In presenza') : (project.city ? `Ibrido · ${project.city}` : 'Ibrido');
}
export function getProjectStatusLabel(status: ProjectStatus): string {
  return status === 'recruiting' ? 'In recruiting' : status === 'active' ? 'In corso' : status === 'completed' ? 'Completato' : 'Annullato';
}
