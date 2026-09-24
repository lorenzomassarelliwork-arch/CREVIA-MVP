import { supabase } from '../../../lib/supabase';
import { getProfileDisplayName, getProfile } from '../../profile/services/profileService';

export type PlatformRole = 'moderator' | 'admin';
export type ModerationStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

export type ModerationItem = {
  id: string;
  kind: 'content_report' | 'experience_exclusion';
  status: ModerationStatus;
  title: string;
  subtitle: string;
  createdAt: string;
};

export type ModerationDetail = {
  id: string;
  kind: 'content_report' | 'experience_exclusion';
  status: ModerationStatus;
  title: string;
  reason: string;
  notes: string | null;
  snapshot: string | null;
  reporterName: string | null;
  reportedUserName: string | null;
  projectTitle: string | null;
  createdAt: string;
};

export async function getPlatformRole(): Promise<PlatformRole | null> {
  const { data, error } = await supabase.rpc('get_platform_role');
  if (error) throw new Error(error.message);
  return data === 'admin' || data === 'moderator' ? data : null;
}

export async function listModerationItems(): Promise<ModerationItem[]> {
  const [{ data: reports, error: reportsError }, { data: exclusions, error: exclusionsError }] =
    await Promise.all([
      supabase
        .from('content_reports')
        .select('id,target_type,reason,status,created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('experience_exclusions')
        .select('id,response_status,moderation_status,created_at')
        .eq('response_status', 'reported')
        .order('created_at', { ascending: false }),
    ]);

  if (reportsError) throw new Error(reportsError.message);
  if (exclusionsError) throw new Error(exclusionsError.message);

  const reportItems: ModerationItem[] = (reports ?? []).map((row: any) => ({
    id: row.id,
    kind: 'content_report',
    status: row.status,
    title:
      row.target_type === 'user'
        ? 'Segnalazione utente'
        : row.target_type === 'project'
          ? 'Segnalazione progetto'
          : 'Segnalazione messaggio',
    subtitle: formatReason(row.reason),
    createdAt: row.created_at,
  }));

  const exclusionItems: ModerationItem[] = (exclusions ?? []).map((row: any) => ({
    id: row.id,
    kind: 'experience_exclusion',
    status: row.moderation_status,
    title: 'Contestazione Crevia Experience',
    subtitle: 'Mancata assegnazione Experience',
    createdAt: row.created_at,
  }));

  return [...reportItems, ...exclusionItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getModerationDetail(
  kind: ModerationItem['kind'],
  id: string
): Promise<ModerationDetail | null> {
  if (kind === 'content_report') {
    const { data, error } = await supabase
      .from('content_reports')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return null;

    const [reporter, reportedUser, project] = await Promise.all([
      data.reporter_id ? getProfile(data.reporter_id).catch(() => null) : Promise.resolve(null),
      data.reported_user_id ? getProfile(data.reported_user_id).catch(() => null) : Promise.resolve(null),
      data.project_id
        ? supabase.from('projects').select('title').eq('id', data.project_id).maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
    ]);

    return {
      id: data.id,
      kind,
      status: data.status,
      title:
        data.target_type === 'user'
          ? 'Segnalazione utente'
          : data.target_type === 'project'
            ? 'Segnalazione progetto'
            : 'Segnalazione messaggio',
      reason: formatReason(data.reason),
      notes: data.notes,
      snapshot: data.content_snapshot,
      reporterName: reporter ? getProfileDisplayName(reporter) : null,
      reportedUserName: reportedUser ? getProfileDisplayName(reportedUser) : null,
      projectTitle: project?.data?.title ?? null,
      createdAt: data.created_at,
    };
  }

  const { data, error } = await supabase
    .from('experience_exclusions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const [reporter, project] = await Promise.all([
    getProfile(data.user_id).catch(() => null),
    supabase.from('projects').select('title').eq('id', data.project_id).maybeSingle(),
  ]);

  return {
    id: data.id,
    kind,
    status: data.moderation_status,
    title: 'Contestazione Crevia Experience',
    reason: 'Mancata assegnazione Experience',
    notes: data.notes,
    snapshot: null,
    reporterName: reporter ? getProfileDisplayName(reporter) : null,
    reportedUserName: null,
    projectTitle: project?.data?.title ?? null,
    createdAt: data.created_at,
  };
}

export async function setModerationStatus(
  kind: ModerationItem['kind'],
  id: string,
  status: ModerationStatus
): Promise<void> {
  const { error } =
    kind === 'content_report'
      ? await supabase.rpc('set_content_report_status', {
          report_id: id,
          next_status: status,
        })
      : await supabase.rpc('set_experience_exclusion_moderation_status', {
          exclusion_id: id,
          next_status: status,
        });

  if (error) throw new Error(error.message);
}

function formatReason(reason: string): string {
  switch (reason) {
    case 'spam': return 'Spam';
    case 'harassment': return 'Molestie o minacce';
    case 'hate_abusive': return 'Contenuto offensivo';
    case 'inappropriate': return 'Contenuto inappropriato';
    case 'scam': return 'Truffa o comportamento sospetto';
    case 'privacy': return 'Privacy o dati personali';
    default: return 'Altro';
  }
}
