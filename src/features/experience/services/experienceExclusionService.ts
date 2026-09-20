import { supabase } from '../../../lib/supabase';
import { assertAllowedContent, normalizeModerationError } from '../../../lib/contentModeration';

export type ExperienceExclusionStatus = 'pending' | 'acknowledged' | 'reported';

export type ExperienceExclusion = {
  id: string;
  projectId: string;
  userId: string;
  responseStatus: ExperienceExclusionStatus;
  notes: string | null;
  createdAt: string;
  respondedAt: string | null;
  projectTitle: string;
};

type ExclusionRow = {
  id: string;
  project_id: string;
  user_id: string;
  response_status: ExperienceExclusionStatus;
  notes: string | null;
  created_at: string;
  responded_at: string | null;
};

export async function getExperienceExclusion(id: string): Promise<ExperienceExclusion | null> {
  const { data, error } = await supabase
    .from('experience_exclusions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as ExclusionRow;
  const { data: project } = await supabase
    .from('projects')
    .select('title')
    .eq('id', row.project_id)
    .maybeSingle();

  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    responseStatus: row.response_status,
    notes: row.notes,
    createdAt: row.created_at,
    respondedAt: row.responded_at,
    projectTitle: project?.title ?? 'Progetto',
  };
}

export async function acknowledgeExperienceExclusion(id: string): Promise<void> {
  const { error } = await supabase
    .from('experience_exclusions')
    .update({
      response_status: 'acknowledged',
      notes: null,
      responded_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('response_status', 'pending');

  if (error) throw new Error(error.message);
}

export async function reportExperienceExclusion(id: string, notes?: string | null): Promise<void> {
  const cleanNotes = notes?.trim() || null;
  assertAllowedContent([cleanNotes]);

  const { error } = await supabase
    .from('experience_exclusions')
    .update({
      response_status: 'reported',
      notes: cleanNotes,
      responded_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('response_status', 'pending');

  if (error) throw new Error(normalizeModerationError(error.message));
}
