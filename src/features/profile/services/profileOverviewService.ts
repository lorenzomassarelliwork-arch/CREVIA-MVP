import type {
  Project,
  ProjectMember,
  UserProfile,
  VerifiedExperience,
} from '../../../domain/models';
import { listProjectMembers } from '../../applications/services/applicationService';
import { listExperiencesForUser } from '../../experience/services/experienceService';
import {
  getProjectRole,
  listProjects,
} from '../../projects/services/projectService';
import { getProfile } from './profileService';

export type ParticipatedProject = {
  project: Project;
  member: ProjectMember;
  roleTitle: string;
};

export type ProfileExperience = {
  experience: VerifiedExperience;
  project: Project | null;
};

export type ProfileOverview = {
  profile: UserProfile;
  createdProjects: Project[];
  participatedProjects: ParticipatedProject[];
  experiences: ProfileExperience[];
};

export async function getProfileOverview(
  userId: string
): Promise<ProfileOverview | null> {
  const [profile, projects, experiences] = await Promise.all([
    getProfile(userId),
    listProjects(),
    listExperiencesForUser(userId),
  ]);

  if (!profile) return null;

  const memberships = await Promise.all(
    projects.map(async (project) => ({
      project,
      members: await listProjectMembers(project.id),
    }))
  );

  const createdProjects = projects.filter(
    (project) =>
      project.ownerId === userId && project.status !== 'cancelled'
  );

  const participatedProjects: ParticipatedProject[] = memberships
    .flatMap(({ project, members }) =>
      members
        .filter(
          (member) =>
            member.userId === userId &&
            (member.status === 'active' || member.status === 'completed')
        )
        .map((member) => ({
          project,
          member,
          roleTitle: getProjectRole(member.roleId)?.title ?? 'Membro',
        }))
    );

  const profileExperiences: ProfileExperience[] = experiences.map(
    (experience) => ({
      experience,
      project:
        projects.find((project) => project.id === experience.projectId) ?? null,
    })
  );

  return {
    profile,
    createdProjects,
    participatedProjects,
    experiences: profileExperiences,
  };
}
