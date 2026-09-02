import type { Application, ApplicationStatus, ProjectMember, UserProfile } from '../../../domain/models';
import { getProjectRole } from '../../projects/services/projectService';

export type ApplicationWithApplicant = Application & { applicant: UserProfile; roleTitle: string };
export type ProjectMemberWithProfile = ProjectMember & { profile: UserProfile; roleTitle: string };

const applicantProfiles: Record<string, UserProfile> = {
  'builder-1': { id: 'builder-1', firstName: 'Giulia', lastName: 'Bianchi', city: 'Milano', bio: 'UI/UX designer interessata a prodotti digitali ad impatto.', headline: 'UI/UX Designer', skills: ['Figma', 'UI Design', 'UX Research'], availability: '5 ore/settimana', createdAt: '2026-08-15T09:00:00.000Z', updatedAt: '2026-08-15T09:00:00.000Z' },
  'current-user': { id: 'current-user', firstName: 'Lorenzo', lastName: 'Massarelli', city: 'Milano', bio: null, headline: 'Builder', skills: ['TypeScript', 'React Native'], availability: 'Da definire', createdAt: '2026-09-01T09:00:00.000Z', updatedAt: '2026-09-01T09:00:00.000Z' },
};

let applications: ApplicationWithApplicant[] = [{
  id: 'application-seed-1', projectId: 'project-1', roleId: 'role-2', applicantId: 'builder-1', applicant: applicantProfiles['builder-1'], roleTitle: 'UI Designer',
  motivation: 'Vorrei contribuire alla definizione del prodotto e portare esperienza nella progettazione di flussi semplici e accessibili.',
  portfolioUrl: 'https://example.com/portfolio', status: 'pending', createdAt: '2026-09-02T10:00:00.000Z', updatedAt: '2026-09-02T10:00:00.000Z',
}];
let members: ProjectMember[] = [];

export async function createApplication(input: { projectId: string; roleId: string; roleTitle: string; applicantId: string; motivation: string; portfolioUrl?: string | null }): Promise<ApplicationWithApplicant> {
  const existing = applications.find((item) => item.projectId === input.projectId && item.roleId === input.roleId && item.applicantId === input.applicantId && (item.status === 'pending' || item.status === 'accepted'));
  if (existing) throw new Error('Hai già una candidatura attiva per questo ruolo.');
  const now = new Date().toISOString();
  const applicant = applicantProfiles[input.applicantId] ?? applicantProfiles['current-user'];
  const application: ApplicationWithApplicant = { id: `application-${Date.now()}`, projectId: input.projectId, roleId: input.roleId, applicantId: input.applicantId, applicant, roleTitle: input.roleTitle, motivation: input.motivation.trim(), portfolioUrl: input.portfolioUrl?.trim() || null, status: 'pending', createdAt: now, updatedAt: now };
  applications = [application, ...applications];
  return application;
}
export async function listApplicationsForProject(projectId: string): Promise<ApplicationWithApplicant[]> { return applications.filter((item) => item.projectId === projectId); }
async function setApplicationStatus(applicationId: string, status: ApplicationStatus) {
  const current = applications.find((item) => item.id === applicationId);
  if (!current) throw new Error('Candidatura non trovata.');
  if (current.status !== 'pending') throw new Error('Questa candidatura è già stata gestita.');
  const updated = { ...current, status, updatedAt: new Date().toISOString() };
  applications = applications.map((item) => item.id === applicationId ? updated : item);
  return updated;
}
export async function acceptApplication(applicationId: string): Promise<ProjectMember> {
  const current = applications.find((item) => item.id === applicationId);
  if (!current) throw new Error('Candidatura non trovata.');
  const role = getProjectRole(current.roleId);
  if (!role) throw new Error('Ruolo non disponibile.');
  const occupied = members.filter((item) => item.roleId === role.id && item.status === 'active').length;
  if (occupied >= role.seats) throw new Error('Non ci sono più posti disponibili per questo ruolo.');
  const application = await setApplicationStatus(applicationId, 'accepted');
  const member: ProjectMember = { id: `member-${application.id}`, projectId: application.projectId, userId: application.applicantId, roleId: application.roleId, status: 'active', joinedAt: new Date().toISOString() };
  members = [member, ...members.filter((item) => item.id !== member.id)];
  return member;
}
export async function rejectApplication(applicationId: string): Promise<void> { await setApplicationStatus(applicationId, 'rejected'); }
export async function listProjectMembers(projectId: string): Promise<ProjectMember[]> { return members.filter((item) => item.projectId === projectId); }
export async function listProjectMembersWithProfiles(projectId: string): Promise<ProjectMemberWithProfile[]> {
  return members.filter((item) => item.projectId === projectId).map((member) => {
    const role = getProjectRole(member.roleId);
    const profile = applicantProfiles[member.userId] ?? { ...applicantProfiles['current-user'], id: member.userId, firstName: 'Builder', lastName: 'Crevia' };
    return { ...member, profile, roleTitle: role?.title ?? 'Membro' };
  });
}
export async function completeActiveProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const now = new Date().toISOString();
  members = members.map((item) => item.projectId === projectId && item.status === 'active' ? { ...item, status: 'completed', completedAt: now } : item);
  return members.filter((item) => item.projectId === projectId && item.status === 'completed');
}
export async function getOccupiedSeats(roleId: string): Promise<number> { return members.filter((item) => item.roleId === roleId && item.status === 'active').length; }
