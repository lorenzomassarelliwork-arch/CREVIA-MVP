import { supabase } from '../../../lib/supabase';

const demoSavedProjectIds = new Set<string>(['project-3']);

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

export async function listSavedProjectIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('saved_projects')
    .select('project_id')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return [
    ...(data ?? []).map((row) => row.project_id as string),
    ...demoSavedProjectIds,
  ];
}

export async function isProjectSaved(projectId: string): Promise<boolean> {
  if (isDemoProject(projectId)) {
    return demoSavedProjectIds.has(projectId);
  }

  const userId = await getAuthUserId();
  const { data, error } = await supabase
    .from('saved_projects')
    .select('project_id')
    .eq('user_id', userId)
    .eq('project_id', projectId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

export async function toggleSavedProject(projectId: string): Promise<boolean> {
  if (isDemoProject(projectId)) {
    if (demoSavedProjectIds.has(projectId)) {
      demoSavedProjectIds.delete(projectId);
      return false;
    }

    demoSavedProjectIds.add(projectId);
    return true;
  }

  const userId = await getAuthUserId();
  const alreadySaved = await isProjectSaved(projectId);

  if (alreadySaved) {
    const { error } = await supabase
      .from('saved_projects')
      .delete()
      .eq('user_id', userId)
      .eq('project_id', projectId);

    if (error) throw new Error(error.message);
    return false;
  }

  const { error } = await supabase.from('saved_projects').insert({
    user_id: userId,
    project_id: projectId,
  });

  if (error) throw new Error(error.message);
  return true;
}
