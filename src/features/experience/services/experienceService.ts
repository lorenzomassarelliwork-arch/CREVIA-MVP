import type { Project, ProjectMember, VerifiedExperience } from '../../../domain/models';
import { getProjectRole } from '../../projects/services/projectService';

let experiences: VerifiedExperience[] = [];

export async function createPendingExperiences(project: Project, members: ProjectMember[]): Promise<VerifiedExperience[]> {
  const created = members.map((member) => {
    const role = getProjectRole(member.roleId);
    const experience: VerifiedExperience = {
      id: `experience-${project.id}-${member.userId}`,
      projectId: project.id,
      userId: member.userId,
      roleTitle: role?.title ?? 'Membro del progetto',
      skills: role?.requiredSkills ?? [],
      startedAt: member.joinedAt,
      completedAt: member.completedAt ?? new Date().toISOString(),
      verificationStatus: 'pending',
    };
    return experience;
  });
  experiences = [...created.filter((item) => !experiences.some((existing) => existing.id === item.id)), ...experiences];
  return created;
}

export async function listExperiencesForUser(userId: string): Promise<VerifiedExperience[]> {
  return experiences.filter((item) => item.userId === userId);
}

export async function listExperiencesForProject(projectId: string): Promise<VerifiedExperience[]> {
  return experiences.filter((item) => item.projectId === projectId);
}

export async function confirmExperience(experienceId: string, userId: string): Promise<VerifiedExperience> {
  const current = experiences.find((item) => item.id === experienceId);
  if (!current) throw new Error('Esperienza non trovata.');
  if (current.userId !== userId) throw new Error('Può confermare questa esperienza solo il partecipante interessato.');
  const updated: VerifiedExperience = { ...current, verificationStatus: 'verified' };
  experiences = experiences.map((item) => item.id === experienceId ? updated : item);
  return updated;
}
