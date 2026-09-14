import type { RealtimeChannel } from '@supabase/supabase-js';

import { supabase } from '../../../lib/supabase';
import { getProfile } from '../../profile/services/profileService';

type ConversationKind = 'direct' | 'project';

type ConversationRow = {
  id: string;
  kind: ConversationKind;
  project_id: string | null;
  direct_user_a: string | null;
  direct_user_b: string | null;
  created_at: string;
  last_message_at: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type ReadStateRow = {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type ChatSummary = {
  id: string;
  kind: ConversationKind;
  title: string;
  subtitle: string;
  projectId: string | null;
  otherUserId: string | null;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

export type ChatHeader = {
  id: string;
  kind: ConversationKind;
  title: string;
  subtitle: string;
  projectId: string | null;
  otherUserId: string | null;
};

async function getAuthUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sessione utente non disponibile.');
  return user.id;
}

function mapMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

function normalizeChatError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('direct chat not allowed')) {
    return 'Puoi avviare una chat privata solo con persone collegate a un tuo progetto o team.';
  }
  if (lower.includes('project chat not allowed')) {
    return 'Non hai accesso alla chat di questo progetto.';
  }
  if (lower.includes('invalid chat participant')) {
    return 'Non puoi avviare una chat con questo utente.';
  }
  return message;
}

export async function getOrCreateDirectChat(
  otherUserId: string,
  projectId: string
): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_direct_chat', {
    other_user_id: otherUserId,
    context_project_id: projectId,
  });

  if (error) throw new Error(normalizeChatError(error.message));
  if (!data || typeof data !== 'string') {
    throw new Error('Impossibile aprire la chat privata.');
  }
  return data;
}

export async function getOrCreateProjectChat(projectId: string): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_project_chat', {
    target_project_id: projectId,
  });

  if (error) throw new Error(normalizeChatError(error.message));
  if (!data || typeof data !== 'string') {
    throw new Error('Impossibile aprire la chat del progetto.');
  }
  return data;
}

async function buildHeader(
  row: ConversationRow,
  authUserId: string
): Promise<ChatHeader> {
  if (row.kind === 'direct') {
    const otherUserId =
      row.direct_user_a === authUserId ? row.direct_user_b : row.direct_user_a;
    const profile = otherUserId ? await getProfile(otherUserId) : null;
    const title = profile
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : 'Chat privata';
    return {
      id: row.id,
      kind: row.kind,
      title,
      subtitle: profile?.headline ?? 'Conversazione privata',
      projectId: null,
      otherUserId,
    };
  }

  const { data: projectData } = await supabase
    .from('projects')
    .select('title,status')
    .eq('id', row.project_id)
    .maybeSingle();

  return {
    id: row.id,
    kind: row.kind,
    title: projectData?.title ?? 'Chat progetto',
    subtitle:
      projectData?.status === 'completed'
        ? 'Progetto completato'
        : projectData?.status === 'active'
          ? 'Team di progetto'
          : 'Team in formazione',
    projectId: row.project_id,
    otherUserId: null,
  };
}

export async function getChatHeader(conversationId: string): Promise<ChatHeader> {
  const authUserId = await getAuthUserId();
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Chat non trovata o non più accessibile.');
  return buildHeader(data as ConversationRow, authUserId);
}

export async function listChats(): Promise<ChatSummary[]> {
  const authUserId = await getAuthUserId();
  const { data, error } = await supabase
    .from('chat_conversations')
    .select('*')
    .order('last_message_at', { ascending: false });

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ConversationRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id);
  const { data: readData, error: readError } = await supabase
    .from('chat_read_state')
    .select('*')
    .in('conversation_id', ids);
  if (readError) throw new Error(readError.message);

  const readMap = new Map(
    ((readData ?? []) as ReadStateRow[]).map((item) => [
      item.conversation_id,
      item.last_read_at,
    ])
  );

  return Promise.all(
    rows.map(async (row) => {
      const [header, lastResult] = await Promise.all([
        buildHeader(row, authUserId),
        supabase
          .from('chat_messages')
          .select('body,created_at')
          .eq('conversation_id', row.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (lastResult.error) throw new Error(lastResult.error.message);
      const lastReadAt = readMap.get(row.id) ?? '1970-01-01T00:00:00.000Z';
      const { count, error: countError } = await supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', row.id)
        .gt('created_at', lastReadAt)
        .neq('sender_id', authUserId);

      if (countError) throw new Error(countError.message);

      return {
        ...header,
        lastMessage: lastResult.data?.body ?? null,
        lastMessageAt: lastResult.data?.created_at ?? row.last_message_at,
        unreadCount: count ?? 0,
      };
    })
  );
}

export async function listMessages(
  conversationId: string,
  limit = 200
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data ?? []) as MessageRow[]).map(mapMessage);
}

export async function sendMessage(
  conversationId: string,
  body: string
): Promise<ChatMessage> {
  const trimmed = body.trim();
  if (!trimmed) throw new Error('Scrivi un messaggio prima di inviare.');
  if (trimmed.length > 4000) {
    throw new Error('Il messaggio può contenere al massimo 4000 caratteri.');
  }

  const senderId = await getAuthUserId();
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: trimmed })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return mapMessage(data as MessageRow);
}

export async function markChatRead(conversationId: string): Promise<void> {
  const userId = await getAuthUserId();
  const { error } = await supabase.from('chat_read_state').upsert(
    {
      conversation_id: conversationId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    },
    { onConflict: 'conversation_id,user_id' }
  );
  if (error) throw new Error(error.message);
}

export async function getCurrentChatUserId(): Promise<string> {
  return getAuthUserId();
}

export function subscribeToChatMessages(
  conversationId: string,
  onMessage: (message: ChatMessage) => void
): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`chat:${conversationId}:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(mapMessage(payload.new as MessageRow))
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function subscribeToChatList(onChange: () => void): () => void {
  const channel: RealtimeChannel = supabase
    .channel(`chat-list:${Date.now()}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages' },
      onChange
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
