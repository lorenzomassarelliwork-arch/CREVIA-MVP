import { CURRENT_USER_ID } from '../../../core/session';
import { supabase } from '../../../lib/supabase';
import { assertAllowedContent, normalizeModerationError } from '../../../lib/contentModeration';

async function getAuthUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sessione utente non disponibile.');
  return user.id;
}

export async function leaveProject(projectId: string, reason?: string | null): Promise<void> {
  const userId = await getAuthUserId();
  const cleanReason = reason?.trim() || null;

  assertAllowedContent([cleanReason]);

  const { data: member, error: memberError } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (memberError) throw new Error(memberError.message);
  if (!member) throw new Error('Non risulti più un partecipante attivo di questo progetto.');

  const { error } = await supabase.from('project_departures').insert({
    project_id: projectId,
    member_id: member.id,
    user_id: userId,
    reason: cleanReason,
  });

  if (error) throw new Error(normalizeModerationError(error.message));
}
