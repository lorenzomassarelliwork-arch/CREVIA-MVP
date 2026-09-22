import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import { getDirectBlockStatus } from '../../safety/services/safetyService';
import {
  getChatHeader,
  getCurrentChatUserId,
  listMessages,
  markChatRead,
  sendMessage,
  subscribeToChatMessages,
  type ChatHeader,
  type ChatMessage,
} from '../services/chatService';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatRoom'>;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ChatRoomScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );
  const scrollRef = useRef<ScrollView>(null);
  const [header, setHeader] = useState<ChatHeader | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [directContactBlocked, setDirectContactBlocked] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);

  const load = useCallback(async () => {
    const [chatHeader, items, userId] = await Promise.all([
      getChatHeader(route.params.conversationId),
      listMessages(route.params.conversationId),
      getCurrentChatUserId(),
    ]);

    let blocked = false;
    let blockedByCurrentUser = false;
    if (chatHeader.kind === 'direct' && chatHeader.otherUserId) {
      const status = await getDirectBlockStatus(chatHeader.otherUserId).catch(() => null);
      blocked = status?.directContactBlocked ?? false;
      blockedByCurrentUser = status?.blockedByMe ?? false;
    }

    setHeader(chatHeader);
    setMessages(items);
    setCurrentUserId(userId);
    setDirectContactBlocked(blocked);
    setBlockedByMe(blockedByCurrentUser);
    await markChatRead(route.params.conversationId);
  }, [route.params.conversationId]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void load()
        .catch((error) => {
          if (active) {
            Alert.alert(
              'Chat non disponibile',
              error instanceof Error ? error.message : 'Errore imprevisto.'
            );
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load])
  );

  useEffect(() => {
    const unsubscribe = subscribeToChatMessages(
      route.params.conversationId,
      (message) => {
        setMessages((current) =>
          current.some((item) => item.id === message.id)
            ? current
            : [...current, message]
        );
        void markChatRead(route.params.conversationId);
        requestAnimationFrame(() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        );
      }
    );
    return unsubscribe;
  }, [route.params.conversationId]);

  const submit = async () => {
    if (sending || directContactBlocked || !draft.trim()) return;
    setSending(true);
    try {
      const sent = await sendMessage(route.params.conversationId, draft);
      setDraft('');
      setMessages((current) =>
        current.some((item) => item.id === sent.id) ? current : [...current, sent]
      );
      await markChatRead(route.params.conversationId);
      requestAnimationFrame(() =>
        scrollRef.current?.scrollToEnd({ animated: true })
      );
    } catch (error) {
      Alert.alert(
        'Messaggio non inviato',
        error instanceof Error ? error.message : 'Errore imprevisto.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.title} numberOfLines={1}>{header?.title ?? 'Chat'}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{header?.subtitle ?? 'Conversazione'}</Text>
        </View>
        {header?.projectId ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              navigation.navigate('ProjectDetail', { projectId: header.projectId! })
            }
          >
            <Ionicons name="briefcase-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : header?.otherUserId ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() =>
              navigation.navigate('PublicProfile', { userId: header.otherUserId! })
            }
          >
            <Ionicons name="person-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerButton} />
        )}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="chatbubble-ellipses-outline" size={30} color={colors.primary} />
              <Text style={styles.emptyTitle}>Inizia la conversazione</Text>
              <Text style={styles.emptyText}>
                {header?.kind === 'project'
                  ? 'Usa questa chat per coordinarti con il team del progetto.'
                  : 'Scrivi un messaggio per chiedere informazioni o confrontarti direttamente.'}
              </Text>
            </View>
          ) : (
            messages.map((message) => {
              const mine = message.senderId === currentUserId;
              return (
                <View
                  key={message.id}
                  style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowOther]}
                >
                  <TouchableOpacity
                    style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
                    activeOpacity={mine ? 1 : 0.82}
                    disabled={mine}
                    delayLongPress={350}
                    onLongPress={
                      mine
                        ? undefined
                        : () =>
                            Alert.alert(
                              'Messaggio',
                              'Vuoi segnalare questo messaggio a Crevia?',
                              [
                                { text: 'Annulla', style: 'cancel' },
                                {
                                  text: 'Segnala',
                                  onPress: () =>
                                    navigation.navigate('ReportContent', {
                                      targetType: 'message',
                                      targetId: message.id,
                                    }),
                                },
                              ]
                            )
                    }
                  >
                    {header?.kind === 'project' ? (
                      <Text style={[styles.senderName, mine && styles.senderNameMine]}>
                        {mine ? 'Tu' : message.senderName ?? 'Builder'}
                      </Text>
                    ) : null}
                    <Text style={[styles.messageText, mine && styles.messageTextMine]}>
                      {message.body}
                    </Text>
                    <Text style={[styles.time, mine && styles.timeMine]}>{formatTime(message.createdAt)}</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {directContactBlocked && header?.kind === 'direct' ? (
        <View style={styles.blockedComposer}>
          <Ionicons name="ban-outline" size={18} color={colors.error} />
          <Text style={styles.blockedComposerText}>
            {blockedByMe
              ? 'Hai bloccato questo utente. Sbloccalo dal profilo per riprendere la chat privata.'
              : 'I messaggi privati tra questi account sono disattivati.'}
          </Text>
        </View>
      ) : (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Scrivi un messaggio..."
            placeholderTextColor={colors.gray}
            multiline
            maxLength={4000}
            style={styles.input}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
            onPress={() => void submit()}
            disabled={!draft.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={18} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ColorPalette, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      paddingTop: Math.max(top, 24) + 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: c.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.actionSurface,
    },
    headerCopy: { flex: 1 },
    title: { fontSize: 16, fontWeight: '900', color: c.textStrong },
    subtitle: { marginTop: 2, fontSize: 11, color: c.gray },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    messages: { flex: 1 },
    messagesContent: { padding: 16, gap: 8, flexGrow: 1 },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
    emptyTitle: { fontSize: 17, fontWeight: '900', color: c.textStrong },
    emptyText: { fontSize: 12, lineHeight: 18, color: c.textMuted, textAlign: 'center' },
    messageRow: { width: '100%', flexDirection: 'row' },
    messageRowMine: { justifyContent: 'flex-end' },
    messageRowOther: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '82%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, gap: 5 },
    bubbleMine: { backgroundColor: c.primary, borderBottomRightRadius: 5 },
    bubbleOther: { backgroundColor: c.cardBackground, borderWidth: 1, borderColor: c.border, borderBottomLeftRadius: 5 },
    senderName: { fontSize: 11, fontWeight: '900', color: c.primary },
    senderNameMine: { color: c.white },
    messageText: { fontSize: 14, lineHeight: 20, color: c.textStrong },
    messageTextMine: { color: c.white },
    time: { fontSize: 9, color: c.gray, alignSelf: 'flex-end' },
    timeMine: { color: c.white },
    blockedComposer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: Math.max(bottom, 10) + 10,
      backgroundColor: c.dangerSoft,
      borderTopWidth: 1,
      borderTopColor: c.dangerBorder,
    },
    blockedComposerText: { flex: 1, fontSize: 11, lineHeight: 17, color: c.error, fontWeight: '700' },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: Math.max(bottom, 10) + 8,
      backgroundColor: c.cardBackground,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      minHeight: 44,
      borderRadius: 15,
      paddingHorizontal: 14,
      paddingVertical: 11,
      backgroundColor: c.actionSurface,
      color: c.textStrong,
      fontSize: 14,
    },
    sendButton: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary },
    sendButtonDisabled: { opacity: 0.45 },
  });
