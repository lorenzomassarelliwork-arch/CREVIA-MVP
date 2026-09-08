import type {
  Application,
  ApplicationStatus,
  ProjectMember,
  UserProfile,
} from '../../../domain/models';
import { CURRENT_USER_ID } from '../../../core/session';
import {
  getProjectDetail,
  getProjectRole,
  isProjectOwner,
} from '../../projects/services/projectService';
import { getProfileSnapshot } from '../../profile/services/profileService';

export type ApplicationWithApplicant = Application & {
  applicant: UserProfile;
  roleTitle: string;
};

export type ProjectMemberWithProfile = ProjectMember & {
  profile: UserProfile;
  roleTitle: string;
};

const giulia = getProfileSnapshot('builder-1');
const currentProfile = getProfileSnapshot(CURRENT_USER_ID);
if (!giulia || !currentProfile) {
  throw new Error('Profili demo non disponibili.');
}

let applications: ApplicationWithApplicant[] = [
  {
    id: 'application-seed-1',
    projectId: 'project-1',
    roleId: 'role-2',
    applicantId: giulia.id,
    applicant: giulia,
    roleTitle: 'UI Designer',
    motivation:
      'Vorrei contribuire alla definizione del prodotto e portare esperienza nella progettazione di flussi semplici e accessibili.',
    portfolioUrl: 'https://example.com/portfolio',
    status: 'pending',
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
  },
];

let members: ProjectMember[] = [];

export async function createApplication(input: {
  projectId: string;
  roleId: string;
  roleTitle: string;
  applicantId: string;
  motivation: string;
  portfolioUrl?: string | null;
}): Promise<ApplicationWithApplicant> {
  const detail = await getProjectDetail(input.projectId);
  if (!detail || detail.project.status !== 'recruiting') {
    throw new Error('Le candidature per questo progetto sono chiuse.');
  }
  if (detail.project.ownerId === input.applicantId) {
    throw new Error('Non puoi candidarti al tuo progetto.');
  }

  const role = detail.roles.find((item) => item.id === input.roleId);
  if (!role) throw new Error('Il ruolo selezionato non appartiene a questo progetto.');

  const existing = applications.find(
    (item) =>
      item.projectId === input.projectId &&
      item.roleId === input.roleId &&
      item.applicantId === input.applicantId &&
      (item.status === 'pending' || item.status === 'accepted')
  );
  if (existing) {
    throw new Error('Hai già una candidatura attiva per questo ruolo.');
  }

  const now = new Date().toISOString();
  const applicant =
    getProfileSnapshot(input.applicantId) ??
    getProfileSnapshot(CURRENT_USER_ID) ??
    currentProfile;
  const application: ApplicationWithApplicant = {
    id: `application-${Date.now()}`,
    projectId: input.projectId,
    roleId: input.roleId,
    applicantId: input.applicantId,
    applicant,
    roleTitle: role.title,
    motivation: input.motivation.trim(),
    portfolioUrl: input.portfolioUrl?.trim() || null,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  applications = [application, ...applications];
  return application;
}

export async function listApplicationsForProject(
  projectId: string
): Promise<ApplicationWithApplicant[]> {
  return applications
    .filter((item) => item.projectId === projectId)
    .map((item) => ({
      ...item,
      applicant: getProfileSnapshot(item.applicantId) ?? item.applicant,
    }));
}

export async function listApplicationsForUser(
  userId: string
): Promise<ApplicationWithApplicant[]> {
  return applications
    .filter((item) => item.applicantId === userId)
    .map((item) => ({
      ...item,
      applicant: getProfileSnapshot(item.applicantId) ?? item.applicant,
    }));
}

export async function getApplicationForUserRole(
  userId: string,
  projectId: string,
  roleId: string
): Promise<ApplicationWithApplicant | null> {
  return (
    applications.find(
      (item) =>
        item.applicantId === userId &&
        item.projectId === projectId &&
        item.roleId === roleId
    ) ?? null
  );
}

async function setApplicationStatus(
  applicationId: string,
  status: ApplicationStatus
) {
  const current = applications.find((item) => item.id === applicationId);
  if (!current) throw new Error('Candidatura non trovata.');
  if (current.status !== 'pending') {
    throw new Error('Questa candidatura è già stata gestita.');
  }

  const updated = {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  };
  applications = applications.map((item) =>
    item.id === applicationId ? updated : item
  );
  return updated;
}

async function assertOwnerAndRecruiting(projectId: string) {
  const detail = await getProjectDetail(projectId);
  if (!detail) throw new Error('Progetto non trovato.');
  if (!isProjectOwner(detail.project)) {
    throw new Error('Solo il creator può gestire le candidature.');
  }
  if (detail.project.status !== 'recruiting') {
    throw new Error('Il progetto non è più in recruiting.');
  }
  return detail;
}

export async function acceptApplication(
  applicationId: string
): Promise<ProjectMember> {
  const current = applications.find((item) => item.id === applicationId);
  if (!current) throw new Error('Candidatura non trovata.');

  const detail = await assertOwnerAndRecruiting(current.projectId);
  const role = detail.roles.find((item) => item.id === current.roleId);
  if (!role) throw new Error('Ruolo non disponibile.');

  const occupied = members.filter(
    (item) => item.roleId === role.id && item.status === 'active'
  ).length;
  if (occupied >= role.seats) {
    throw new Error('Non ci sono più posti disponibili per questo ruolo.');
  }

  const application = await setApplicationStatus(applicationId, 'accepted');
  const member: ProjectMember = {
    id: `member-${application.id}`,
    projectId: application.projectId,
    userId: application.applicantId,
    roleId: application.roleId,
    status: 'active',
    joinedAt: new Date().toISOString(),
  };

  members = [member, ...members.filter((item) => item.id !== member.id)];
  return member;
}

export async function rejectApplication(applicationId: string): Promise<void> {
  const current = applications.find((item) => item.id === applicationId);
  if (!current) throw new Error('Candidatura non trovata.');
  await assertOwnerAndRecruiting(current.projectId);
  await setApplicationStatus(applicationId, 'rejected');
}

export async function closePendingApplicationsForProject(
  projectId: string
): Promise<void> {
  const now = new Date().toISOString();
  applications = applications.map((item) =>
    item.projectId === projectId && item.status === 'pending'
      ? { ...item, status: 'rejected', updatedAt: now }
      : item
  );
}

export async function listProjectMembers(
  projectId: string
): Promise<ProjectMember[]> {
  return members.filter((item) => item.projectId === projectId);
}

export async function listProjectMembersWithProfiles(
  projectId: string
): Promise<ProjectMemberWithProfile[]> {
  return members
    .filter((item) => item.projectId === projectId)
    .map((member) => {
      const role = getProjectRole(member.roleId);
      const profile =
        getProfileSnapshot(member.userId) ?? {
          ...currentProfile,
          id: member.userId,
          firstName: 'Builder',
          lastName: 'Crevia',
        };
      return {
        ...member,
        profile,
        roleTitle: role?.title ?? 'Membro',
      };
    });
}

export async function isUserProjectMember(
  projectId: string,
  userId: string
): Promise<boolean> {
  return members.some(
    (item) =>
      item.projectId === projectId &&
      item.userId === userId &&
      (item.status === 'active' || item.status === 'completed')
  );
}

export async function finalizeProjectMembers(
  projectId: string,
  completedUserIds: string[]
): Promise<ProjectMember[]> {
  const now = new Date().toISOString();
  members = members.map((item) =>
    item.projectId === projectId && item.status === 'active'
      ? completedUserIds.includes(item.userId)
        ? { ...item, status: 'completed', completedAt: now }
        : { ...item, status: 'left' }
      : item
  );
  return members.filter(
    (item) => item.projectId === projectId && item.status === 'completed'
  );
}

export async function removeProjectMember(memberId: string): Promise<ProjectMember> {
  const member = members.find((item) => item.id === memberId);
  if (!member) throw new Error('Partecipante non trovato.');

  const detail = await getProjectDetail(member.projectId);
  if (!detail) throw new Error('Progetto non trovato.');
  if (!isProjectOwner(detail.project)) {
    throw new Error('Solo il creator può rimuovere un partecipante.');
  }
  if (detail.project.status !== 'recruiting' && detail.project.status !== 'active') {
    throw new Error('Non puoi modificare il team di un progetto chiuso.');
  }
  if (member.status !== 'active') {
    throw new Error('Questo partecipante non è più attivo nel progetto.');
  }

  const updated: ProjectMember = {
    ...member,
    status: 'removed',
  };

  members = members.map((item) => (item.id === memberId ? updated : item));
  return updated;
}

export async function closeActiveMembersForProject(
  projectId: string
): Promise<void> {
  members = members.map((item) =>
    item.projectId === projectId && item.status === 'active'
      ? { ...item, status: 'removed' }
      : item
  );
}

export async function getOccupiedSeats(roleId: string): Promise<number> {
  return members.filter(
    (item) => item.roleId === roleId && item.status === 'active'
  ).length;
}
