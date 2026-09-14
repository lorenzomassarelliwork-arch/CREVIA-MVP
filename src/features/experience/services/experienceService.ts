import type {
  ExperienceVerificationStatus,
  Project,
  ProjectMember,
  VerifiedExperience,
} from '../../../domain/models';
import { CURRENT_USER_ID } from '../../../core/session';
import { supabase } from '../../../lib/supabase';
import { getProjectRole } from '../../projects/services/projectService';

type ExperienceRow = {
  id: string;
  project_id: string;
  user_id: string;
  role_id: string;
  role_title: string;
  skills: string[] | null;
  started_at: string;
  completed_at: string;
  verification_status: ExperienceVerificationStatus;
};

let demoExperiences: VerifiedExperience[] = [];

function isDemoProject(projectId: string): boolean {
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

function mapExperience(row: ExperienceRow, authUserId: string): VerifiedExperience {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id === authUserId ? CURRENT_USER_ID : row.user_id,
    roleTitle: row.role_title,
    skills: row.skills ?? [],
    startedAt: row.started_at,
    completedAt: row.completed_at,
    verificationStatus: row.verification_status,
  };
}

export async function createPendingExperiences(
  project: Project,
  members: ProjectMember[]
): Promise<VerifiedExperience[]> {
  if (isDemoProject(project.id)) {
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

    demoExperiences = [
      ...created.filter(
        (item) =>
          !demoExperiences.some((existing) => existing.id === item.id)
      ),
      ...demoExperiences,
    ];
    return created;
  }

  const { data, error } = await supabase.rpc('create_pending_experiences', {
    target_project_id: project.id,
  });

  if (error) {
    throw new Error('Non è stato possibile creare le Crevia Experience.');
  }

  const authUserId = await getAuthUserId();
  return ((data ?? []) as ExperienceRow[]).map((row) =>
    mapExperience(row, authUserId)
  );
}

export async function listExperiencesForUser(
  userId: string
): Promise<VerifiedExperience[]> {
  if (userId !== CURRENT_USER_ID && userId.startsWith('builder-')) {
    return demoExperiences.filter((item) => item.userId === userId);
  }

  const resolvedUserId = await resolveUserId(userId);
  const authUserId = await getAuthUserId();
  const { data, error } = await supabase
    .from('verified_experiences')
    .select('*')
    .eq('user_id', resolvedUserId)
    .order('completed_at', { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as ExperienceRow[]).map((row) =>
    mapExperience(row, authUserId)
  );
}

export async function listExperiencesForProject(
  projectId: string
): Promise<VerifiedExperience[]> {
  if (isDemoProject(projectId)) {
    return demoExperiences.filter((item) => item.projectId === projectId);
  }

  const authUserId = await getAuthUserId();
  const { data, error } = await supabase
    .from('verified_experiences')
    .select('*')
    .eq('project_id', projectId)
    .order('completed_at', { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as ExperienceRow[]).map((row) =>
    mapExperience(row, authUserId)
  );
}

export async function confirmExperience(
  experienceId: string,
  userId: string
): Promise<VerifiedExperience> {
  const demo = demoExperiences.find((item) => item.id === experienceId);
  if (demo) {
    if (demo.userId !== userId) {
      throw new Error(
        'Può confermare questa esperienza solo il partecipante interessato.'
      );
    }
    if (demo.verificationStatus !== 'pending') {
      throw new Error('Questa esperienza è già stata gestita.');
    }

    const updated: VerifiedExperience = {
      ...demo,
      verificationStatus: 'verified',
    };
    demoExperiences = demoExperiences.map((item) =>
      item.id === experienceId ? updated : item
    );
    return updated;
  }

  if (userId !== CURRENT_USER_ID) {
    throw new Error(
      'Può confermare questa esperienza solo il partecipante interessato.'
    );
  }

  const { data, error } = await supabase.rpc('confirm_experience', {
    target_experience_id: experienceId,
  });

  if (error) {
    throw new Error('Esperienza non trovata o già confermata.');
  }

  const row = (Array.isArray(data) ? data[0] : data) as ExperienceRow | null;
  if (!row) throw new Error('Esperienza non disponibile.');

  return mapExperience(row, await getAuthUserId());
}
