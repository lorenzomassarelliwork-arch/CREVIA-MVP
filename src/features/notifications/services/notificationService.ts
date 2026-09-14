import { supabase } from '../../../lib/supabase';

export type NotificationType =
  | 'application_received'
  | 'application_accepted'
  | 'application_rejected'
  | 'project_started'
  | 'project_cancelled'
  | 'experience_pending'
  | 'experience_verified'
  | 'member_removed';

export type AppNotification = {
  id: string;
  type: NotificationType;
  actorId: string | null;
  projectId: string | null;
  applicationId: string | null;
  experienceId: string | null;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  type: NotificationType;
  actor_id: string | null;
  project_id: string | null;
  application_id: string | null;
  experience_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

function mapNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    actorId: row.actor_id,
    projectId: row.project_id,
    applicationId: row.application_id,
    experienceId: row.experience_id,
    title: row.title,
    body: row.body,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

async function getAuthenticatedUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Sessione utente non disponibile.');
  return user.id;
}

export async function listNotifications(limit = 100): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as NotificationRow[]).map(mapNotification);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function markNotificationRead(
  notificationId: string
): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .is('read_at', null);

  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);

  if (error) throw new Error(error.message);
}

export async function subscribeNotificationChanges(
  onChange: () => void
): Promise<() => void> {
  const userId = await getAuthenticatedUserId();
  const channel = supabase
    .channel(`notifications:${userId}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => onChange()
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
