import { CURRENT_USER_ID } from '../../../core/session';
import { supabase } from '../../../lib/supabase';
import { assertAllowedContent, normalizeModerationError } from '../../../lib/contentModeration';

export type ReportTargetType = 'user' | 'project' | 'message';
export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'hate_abusive'
  | 'inappropriate'
  | 'scam'
  | 'privacy'
  | 'other';

export type DirectBlockStatus = {
  blockedByMe: boolean;
  directContactBlocked: boolean;
};

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

export async function submitContentReport(
  targetType: ReportTargetType,
  targetId: string,
  reason: ReportReason,
  notes?: string | null
): Promise<string> {
  const cleanNotes = notes?.trim() || null;
  assertAllowedContent([cleanNotes]);

  const { data, error } = await supabase.rpc('create_content_report', {
    report_target_type: targetType,
    report_target_id: targetId,
    report_reason: reason,
    report_notes: cleanNotes,
  });

  if (error) {
    const message = error.message;
    if (message.includes('CANNOT_REPORT_SELF')) {
      throw new Error('Non puoi segnalare il tuo stesso profilo.');
    }
    if (message.includes('CANNOT_REPORT_OWN_PROJECT')) {
      throw new Error('Non puoi segnalare un progetto creato da te.');
    }
    if (message.includes('CANNOT_REPORT_OWN_MESSAGE')) {
      throw new Error('Non puoi segnalare un tuo messaggio.');
    }
    if (message.includes('REPORT_TARGET_NOT_FOUND')) {
      throw new Error('Il contenuto non è più disponibile.');
    }
    if (message.includes('REPORT_TARGET_NOT_ACCESSIBLE')) {
      throw new Error('Non hai accesso a questo contenuto.');
    }
    throw new Error(normalizeModerationError(message));
  }

  if (!data || typeof data !== 'string') {
    throw new Error('Non è stato possibile inviare la segnalazione.');
  }
  return data;
}

export async function getDirectBlockStatus(
  otherUserId: string
): Promise<DirectBlockStatus> {
  const resolved = await resolveUserId(otherUserId);
  const { data, error } = await supabase.rpc('get_direct_block_status', {
    other_user_id: resolved,
  });

  if (error) throw new Error(error.message);

  const row = Array.isArray(data) ? data[0] : data;
  return {
    blockedByMe: Boolean(row?.blocked_by_me),
    directContactBlocked: Boolean(row?.direct_contact_blocked),
  };
}

export async function blockUser(otherUserId: string): Promise<void> {
  const blockerId = await getAuthUserId();
  const blockedId = await resolveUserId(otherUserId);

  if (blockerId === blockedId) {
    throw new Error('Non puoi bloccare il tuo stesso account.');
  }

  const { error } = await supabase.from('user_blocks').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });

  if (error && !error.message.toLowerCase().includes('duplicate')) {
    throw new Error(error.message);
  }
}

export async function unblockUser(otherUserId: string): Promise<void> {
  const blockerId = await getAuthUserId();
  const blockedId = await resolveUserId(otherUserId);

  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);

  if (error) throw new Error(error.message);
}
