import { CURRENT_USER_ID } from '../../../core/session';
import { supabase } from '../../../lib/supabase';
import { getProfile } from '../../profile/services/profileService';
import type { UserProfile } from '../../../domain/models';

export type ProjectAdmin = {
  projectId: string;
  userId: string;
  profile: UserProfile | null;
  createdAt: string;
};

type ProfileSearchRow = {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  headline: string | null;
  skills: string[] | null;
  availability: string | null;
  created_at: string;
  updated_at: string;
};

type AdminRow = {
  project_id: string;
  user_id: string;
  created_at: string;
};

async function getAuthUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sessione utente non disponibile.');
  return user.id;
}

function aliasUserId(userId: string, authUserId: string): string {
  return userId === authUserId ? CURRENT_USER_ID : userId;
}

export async function listProjectAdmins(projectId: string): Promise<ProjectAdmin[]> {
  const authUserId = await getAuthUserId();
  const { data, error } = await supabase
    .from('project_admins')
    .select('project_id,user_id,created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  return Promise.all(
    ((data ?? []) as AdminRow[]).map(async (row) => {
      const aliased = aliasUserId(row.user_id, authUserId);
      return {
        projectId: row.project_id,
        userId: aliased,
        profile: await getProfile(aliased),
        createdAt: row.created_at,
      };
    })
  );
}

export async function isCurrentUserProjectAdmin(projectId: string): Promise<boolean> {
  const authUserId = await getAuthUserId();
  const { count, error } = await supabase
    .from('project_admins')
    .select('project_id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .eq('user_id', authUserId);

  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export async function addProjectAdmin(projectId: string, userId: string): Promise<void> {
  const authUserId = await getAuthUserId();
  const resolvedUserId = userId === CURRENT_USER_ID ? authUserId : userId;

  const { error } = await supabase.from('project_admins').insert({
    project_id: projectId,
    user_id: resolvedUserId,
    added_by: authUserId,
  });

  if (error) {
    if (error.message.includes('duplicate')) throw new Error('Questo utente è già co-founder.');
    throw new Error(error.message);
  }
}

export async function removeProjectAdmin(projectId: string, userId: string): Promise<void> {
  const authUserId = await getAuthUserId();
  const resolvedUserId = userId === CURRENT_USER_ID ? authUserId : userId;

  const { error } = await supabase
    .from('project_admins')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', resolvedUserId);

  if (error) throw new Error(error.message);
}


function mapProfileSearchRow(row: ProfileSearchRow): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    city: row.city,
    bio: row.bio,
    headline: row.headline,
    skills: row.skills ?? [],
    availability: row.availability,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function searchProjectAdminCandidates(
  projectId: string,
  query: string
): Promise<UserProfile[]> {
  const authUserId = await getAuthUserId();
  const term = query.trim();
  if (term.length < 2) return [];

  const [{ data: project, error: projectError }, { data: admins, error: adminError }] =
    await Promise.all([
      supabase.from('projects').select('owner_id').eq('id', projectId).single(),
      supabase.from('project_admins').select('user_id').eq('project_id', projectId),
    ]);

  if (projectError) throw new Error(projectError.message);
  if (adminError) throw new Error(adminError.message);
  if (project.owner_id !== authUserId) {
    throw new Error('Solo il founder principale può nominare co-founder.');
  }

  const escaped = term.replace(/[%_,()]/g, '');
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%`)
    .limit(20);

  if (error) throw new Error(error.message);

  const excluded = new Set<string>([
    project.owner_id,
    ...((admins ?? []) as Array<{ user_id: string }>).map((item) => item.user_id),
  ]);

  return ((data ?? []) as ProfileSearchRow[])
    .filter((row) => !excluded.has(row.id))
    .map(mapProfileSearchRow);
}
