import type { Project, ProjectRole } from '../../../domain/models';
import { MVP_PROJECTS, MVP_PROJECT_ROLES } from '../data/mvpProjectData';

export type ProjectDetailData = {
  project: Project;
  roles: ProjectRole[];
};

export async function getProjectDetail(projectId: string): Promise<ProjectDetailData | null> {
  const project = MVP_PROJECTS.find((item) => item.id === projectId) ?? null;
  if (!project) return null;

  return {
    project,
    roles: MVP_PROJECT_ROLES.filter((role) => role.projectId === projectId),
  };
}

export function getCompensationLabel(project: Project): string {
  switch (project.compensationType) {
    case 'unpaid':
      return 'Non retribuito';
    case 'expense_reimbursement':
      return 'Rimborso spese';
    case 'prize':
      return 'Premio previsto';
    case 'paid_to_agree':
      return 'Compenso da concordare';
  }
}

export function getLocationLabel(project: Project): string {
  switch (project.locationMode) {
    case 'remote':
      return 'Da remoto';
    case 'onsite':
      return project.city ?? 'In presenza';
    case 'hybrid':
      return project.city ? `Ibrido · ${project.city}` : 'Ibrido';
  }
}
