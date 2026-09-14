import type {
  Application,
  ApplicationStatus,
  MemberStatus,
  ProjectMember,
  UserProfile,
} from '../../../domain/models';
import { CURRENT_USER_ID } from '../../../core/session';
import { supabase } from '../../../lib/supabase';
import {
  getProjectDetail,
  getProjectRole,
  isProjectOwner,
} from '../../projects/services/projectService';
import {
  getProfile,
  getProfileSnapshot,
} from '../../profile/services/profileService';

export type ApplicationWithApplicant = Application & {
  applicant: UserProfile;
  roleTitle: string;
};

export type ProjectMemberWithProfile = ProjectMember & {
  profile: UserProfile;
  roleTitle: string;
};

type ApplicationRow = {
  id: string;
  project_id: string;
  role_id: string;
  applicant_id: string;
  motivation: string;
  portfolio_url: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  id: string;
  project_id: string;
  user_id: string;
  role_id: string;
  status: MemberStatus;
  joined_at: string;
  completed_at: string | null;
};

const currentFallback = getProfileSnapshot(CURRENT_USER_ID)!;
const giulia = getProfileSnapshot('builder-1')!;

let demoApplications: ApplicationWithApplicant[] = [
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

let demoMembers: ProjectMember[] = [];

function isDemoProject(projectId: string) {
  return projectId.startsWith('project-');
}

async function getAuthUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Sessione utente non disponibile.');
  return user.id;
}

async function resolveUserId(userId: string): Promise<string> {
  return userId === CURRENT_USER_ID ? getAuthUserId() : userId;
}

function aliasUserId(userId: string, authUserId: string): string {
  return userId === authUserId ? CURRENT_USER_ID : userId;
}

function mapApplication(row: ApplicationRow, authUserId: string): Application {
  return {
    id: row.id,
    projectId: row.project_id,
    roleId: row.role_id,
    applicantId: aliasUserId(row.applicant_id, authUserId),
    motivation: row.motivation,
    portfolioUrl: row.portfolio_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: MemberRow, authUserId: string): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: aliasUserId(row.user_id, authUserId),
    roleId: row.role_id,
    status: row.status,
    joinedAt: row.joined_at,
    completedAt: row.completed_at,
  };
}

async function buildApplicationWithApplicant(
  row: ApplicationRow,
  authUserId: string
): Promise<ApplicationWithApplicant> {
  const application = mapApplication(row, authUserId);
  const applicant =
    (await getProfile(application.applicantId)) ??
    getProfileSnapshot(application.applicantId) ??
    { ...currentFallback, id: application.applicantId };

  const detail = await getProjectDetail(application.projectId);
  const roleTitle =
    detail?.roles.find((role) => role.id === application.roleId)?.title ??
    getProjectRole(application.roleId)?.title ??
    'Ruolo';

  return { ...application, applicant, roleTitle };
}

function normalizeDbError(message: string): string {
  if (message.includes('applications_active_unique_idx')) {
    return 'Hai già una candidatura attiva per questo ruolo.';
  }
  if (message.includes('No seats available')) {
    return 'Non ci sono più posti disponibili per questo ruolo.';
  }
  if (message.includes('Application already handled')) {
    return 'Questa candidatura è già stata gestita.';
  }
  if (message.includes('Project is not recruiting')) {
    return 'Il progetto non è più in recruiting.';
  }
  if (message.includes('Member is not active')) {
    return 'Questo partecipante non è più attivo nel progetto.';
  }
  return message;
}

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
  if (isProjectOwner(detail.project)) {
    throw new Error('Non puoi candidarti al tuo progetto.');
  }

  const role = detail.roles.find((item) => item.id === input.roleId);
  if (!role) {
    throw new Error('Il ruolo selezionato non appartiene a questo progetto.');
  }

  if (isDemoProject(input.projectId)) {
    const existing = demoApplications.find(
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
      currentFallback;
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

    demoApplications = [application, ...demoApplications];
    return application;
  }

  const applicantId = await resolveUserId(input.applicantId);
  const { data, error } = await supabase
    .from('applications')
    .insert({
      project_id: input.projectId,
      role_id: input.roleId,
      applicant_id: applicantId,
      motivation: input.motivation.trim(),
      portfolio_url: input.portfolioUrl?.trim() || null,
      status: 'pending',
    })
    .select('*')
    .single();

  if (error) throw new Error(normalizeDbError(error.message));

  const authUserId = await getAuthUserId();
  return buildApplicationWithApplicant(data as ApplicationRow, authUserId);
}

export async function listApplicationsForProject(
  projectId: string
): Promise<ApplicationWithApplicant[]> {
  if (isDemoProject(projectId)) {
    return demoApplications.filter((item) => item.projectId === projectId);
  }

  const authUserId = await getAuthUserId();
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return Promise.all(
    ((data ?? []) as ApplicationRow[]).map((row) =>
      buildApplicationWithApplicant(row, authUserId)
    )
  );
}

export async function listApplicationsForUser(
  userId: string
): Promise<ApplicationWithApplicant[]> {
  const resolvedUserId = await resolveUserId(userId);
  const authUserId = await getAuthUserId();
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('applicant_id', resolvedUserId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return Promise.all(
    ((data ?? []) as ApplicationRow[]).map((row) =>
      buildApplicationWithApplicant(row, authUserId)
    )
  );
}

export async function getApplicationForUserRole(
  userId: string,
  projectId: string,
  roleId: string
): Promise<ApplicationWithApplicant | null> {
  if (isDemoProject(projectId)) {
    return (
      demoApplications.find(
        (item) =>
          item.applicantId === userId &&
          item.projectId === projectId &&
          item.roleId === roleId
      ) ?? null
    );
  }

  const resolvedUserId = await resolveUserId(userId);
  const authUserId = await getAuthUserId();
  const { data, error } = await supabase
    .from('applications')
    .select('*')
    .eq('applicant_id', resolvedUserId)
    .eq('project_id', projectId)
    .eq('role_id', roleId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data
    ? buildApplicationWithApplicant(data as ApplicationRow, authUserId)
    : null;
}

export async function acceptApplication(
  applicationId: string
): Promise<ProjectMember> {
  const demo = demoApplications.find((item) => item.id === applicationId);
  if (demo) {
    const detail = await getProjectDetail(demo.projectId);
    if (!detail || !isProjectOwner(detail.project)) {
      throw new Error('Solo il creator può gestire le candidature.');
    }
    if (detail.project.status !== 'recruiting') {
      throw new Error('Il progetto non è più in recruiting.');
    }

    const role = detail.roles.find((item) => item.id === demo.roleId);
    if (!role) throw new Error('Ruolo non disponibile.');

    const occupied = demoMembers.filter(
      (item) => item.roleId === role.id && item.status === 'active'
    ).length;
    if (occupied >= role.seats) {
      throw new Error('Non ci sono più posti disponibili per questo ruolo.');
    }
    if (demo.status !== 'pending') {
      throw new Error('Questa candidatura è già stata gestita.');
    }

    const now = new Date().toISOString();
    demoApplications = demoApplications.map((item) =>
      item.id === applicationId
        ? { ...item, status: 'accepted', updatedAt: now }
        : item
    );
    const member: ProjectMember = {
      id: `member-${applicationId}`,
      projectId: demo.projectId,
      userId: demo.applicantId,
      roleId: demo.roleId,
      status: 'active',
      joinedAt: now,
    };

    demoMembers = [
      member,
      ...demoMembers.filter((item) => item.id !== member.id),
    ];
    return member;
  }

  const { error: updateError } = await supabase
    .from('applications')
    .update({ status: 'accepted' })
    .eq('id', applicationId)
    .eq('status', 'pending');

  if (updateError) {
    throw new Error(normalizeDbError(updateError.message));
  }

  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('application_id', applicationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    throw new Error('La candidatura non è più disponibile o è già stata gestita.');
  }

  return mapMember(data as MemberRow, await getAuthUserId());
}

export async function rejectApplication(applicationId: string): Promise<void> {
  const demo = demoApplications.find((item) => item.id === applicationId);
  if (demo) {
    if (demo.status !== 'pending') {
      throw new Error('Questa candidatura è già stata gestita.');
    }

    const detail = await getProjectDetail(demo.projectId);
    if (!detail || !isProjectOwner(detail.project)) {
      throw new Error('Solo il creator può gestire le candidature.');
    }

    const now = new Date().toISOString();
    demoApplications = demoApplications.map((item) =>
      item.id === applicationId
        ? { ...item, status: 'rejected', updatedAt: now }
        : item
    );
    return;
  }

  const { error } = await supabase
    .from('applications')
    .update({ status: 'rejected' })
    .eq('id', applicationId)
    .eq('status', 'pending');

  if (error) throw new Error(normalizeDbError(error.message));
}

export async function closePendingApplicationsForProject(
  projectId: string
): Promise<void> {
  if (isDemoProject(projectId)) {
    const now = new Date().toISOString();
    demoApplications = demoApplications.map((item) =>
      item.projectId === projectId && item.status === 'pending'
        ? { ...item, status: 'rejected', updatedAt: now }
        : item
    );
    return;
  }

  const { error } = await supabase
    .from('applications')
    .update({ status: 'rejected' })
    .eq('project_id', projectId)
    .eq('status', 'pending');

  if (error) throw new Error(normalizeDbError(error.message));
}

export async function listProjectMembers(
  projectId: string
): Promise<ProjectMember[]> {
  if (isDemoProject(projectId)) {
    return demoMembers.filter((item) => item.projectId === projectId);
  }

  const authUserId = await getAuthUserId();
  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as MemberRow[]).map((row) =>
    mapMember(row, authUserId)
  );
}

export async function listProjectMembersWithProfiles(
  projectId: string
): Promise<ProjectMemberWithProfile[]> {
  const members = await listProjectMembers(projectId);
  const detail = await getProjectDetail(projectId);

  return Promise.all(
    members.map(async (member) => {
      const profile =
        (await getProfile(member.userId)) ??
        getProfileSnapshot(member.userId) ??
        {
          ...currentFallback,
          id: member.userId,
          firstName: 'Builder',
          lastName: 'Crevia',
        };

      return {
        ...member,
        profile,
        roleTitle:
          detail?.roles.find((role) => role.id === member.roleId)?.title ??
          getProjectRole(member.roleId)?.title ??
          'Membro',
      };
    })
  );
}

export async function isUserProjectMember(
  projectId: string,
  userId: string
): Promise<boolean> {
  if (isDemoProject(projectId)) {
    return demoMembers.some(
      (item) =>
        item.projectId === projectId &&
        item.userId === userId &&
        (item.status === 'active' || item.status === 'completed')
    );
  }

  const resolvedUserId = await resolveUserId(userId);
  const { count, error } = await supabase
    .from('project_members')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('user_id', resolvedUserId)
    .in('status', ['active', 'completed']);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function finalizeProjectMembers(
  projectId: string,
  completedUserIds: string[]
): Promise<ProjectMember[]> {
  if (isDemoProject(projectId)) {
    const now = new Date().toISOString();
    demoMembers = demoMembers.map((item) =>
      item.projectId === projectId && item.status === 'active'
        ? completedUserIds.includes(item.userId)
          ? { ...item, status: 'completed', completedAt: now }
          : { ...item, status: 'left' }
        : item
    );

    return demoMembers.filter(
      (item) => item.projectId === projectId && item.status === 'completed'
    );
  }

  const authUserId = await getAuthUserId();
  const resolvedCompletedIds = await Promise.all(
    completedUserIds.map((userId) => resolveUserId(userId))
  );

  const { data: activeRows, error: activeError } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active');

  if (activeError) throw new Error(activeError.message);

  const active = (activeRows ?? []) as MemberRow[];
  const completedSet = new Set(resolvedCompletedIds);
  const completedIds = active
    .filter((row) => completedSet.has(row.user_id))
    .map((row) => row.id);
  const leftIds = active
    .filter((row) => !completedSet.has(row.user_id))
    .map((row) => row.id);

  let completedRows: MemberRow[] = [];
  const completedAt = new Date().toISOString();

  if (completedIds.length > 0) {
    const { data, error } = await supabase
      .from('project_members')
      .update({ status: 'completed', completed_at: completedAt })
      .in('id', completedIds)
      .select('*');

    if (error) throw new Error(normalizeDbError(error.message));
    completedRows = (data ?? []) as MemberRow[];
  }

  if (leftIds.length > 0) {
    const { error } = await supabase
      .from('project_members')
      .update({ status: 'left', completed_at: null })
      .in('id', leftIds);

    if (error) throw new Error(normalizeDbError(error.message));
  }

  return completedRows.map((row) => mapMember(row, authUserId));
}

export async function removeProjectMember(
  memberId: string
): Promise<ProjectMember> {
  const demo = demoMembers.find((item) => item.id === memberId);
  if (demo) {
    if (demo.status !== 'active') {
      throw new Error('Questo partecipante non è più attivo nel progetto.');
    }

    const detail = await getProjectDetail(demo.projectId);
    if (!detail || !isProjectOwner(detail.project)) {
      throw new Error('Solo il creator può rimuovere un partecipante.');
    }

    const updated: ProjectMember = { ...demo, status: 'removed' };
    demoMembers = demoMembers.map((item) =>
      item.id === memberId ? updated : item
    );
    return updated;
  }

  const { data, error } = await supabase
    .from('project_members')
    .update({ status: 'removed', completed_at: null })
    .eq('id', memberId)
    .eq('status', 'active')
    .select('*')
    .maybeSingle();

  if (error) throw new Error(normalizeDbError(error.message));
  if (!data) throw new Error('Partecipante non trovato o non più attivo.');

  return mapMember(data as MemberRow, await getAuthUserId());
}

export async function closeActiveMembersForProject(
  projectId: string
): Promise<void> {
  if (isDemoProject(projectId)) {
    demoMembers = demoMembers.map((item) =>
      item.projectId === projectId && item.status === 'active'
        ? { ...item, status: 'removed' }
        : item
    );
    return;
  }

  const { error } = await supabase
    .from('project_members')
    .update({ status: 'removed', completed_at: null })
    .eq('project_id', projectId)
    .eq('status', 'active');

  if (error) throw new Error(normalizeDbError(error.message));
}

export async function getOccupiedSeats(roleId: string): Promise<number> {
  if (roleId.startsWith('role-')) {
    return demoMembers.filter(
      (item) => item.roleId === roleId && item.status === 'active'
    ).length;
  }

  const { count, error } = await supabase
    .from('project_members')
    .select('id', { count: 'exact', head: true })
    .eq('role_id', roleId)
    .eq('status', 'active');

  if (error) throw new Error(error.message);
  return count ?? 0;
}
