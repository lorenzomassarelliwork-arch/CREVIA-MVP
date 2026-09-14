import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useFocusEffect,
  type CompositeScreenProps,
} from '@react-navigation/native';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  MainTabParamList,
  RootStackParamList,
} from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import {
  listChats,
  subscribeToChatList,
  type ChatSummary,
} from '../services/chatService';

type Props = CompositeScreenProps<
  MaterialTopTabScreenProps<MainTabParamList, 'Chat'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Filter = 'all' | 'direct' | 'project';

function relativeTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Adesso';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} g`;
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  });
}

export default function ChatsScreen({ navigation }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const items = await listChats();
    setChats(items);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      void load()
        .catch(() => {
          if (active) setChats([]);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, [load])
  );

  useEffect(() => subscribeToChatList(() => void load()), [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const visible = chats.filter((chat) => filter === 'all' || chat.kind === filter);
  const unreadTotal = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>CREVIA</Text>
          <Text style={styles.headerTitle}>Messaggi</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="chatbubbles-outline" size={21} color={colors.primary} />
          {unreadTotal > 0 ? (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadTotal > 99 ? '99+' : unreadTotal}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.filters}>
        {([
          ['all', 'Tutte'],
          ['direct', 'Private'],
          ['project', 'Progetti'],
        ] as const).map(([value, label]) => (
          <TouchableOpacity
            key={value}
            style={[styles.filter, filter === value && styles.filterActive]}
            onPress={() => setFilter(value)}
          >
            <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refresh()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {visible.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="chatbubble-ellipses-outline" size={30} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Nessuna conversazione</Text>
              <Text style={styles.emptyText}>
                Le chat private con candidati e membri, insieme alle chat di progetto, appariranno qui.
              </Text>
            </View>
          ) : (
            visible.map((chat) => (
              <TouchableOpacity
                key={chat.id}
                activeOpacity={0.76}
                style={[styles.card, chat.unreadCount > 0 && styles.cardUnread]}
                onPress={() => navigation.navigate('ChatRoom', { conversationId: chat.id })}
              >
                <View style={[styles.avatar, chat.kind === 'project' && styles.avatarProject]}>
                  <Ionicons
                    name={chat.kind === 'project' ? 'people-outline' : 'person-outline'}
                    size={21}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={1}>{chat.title}</Text>
                    <Text style={styles.time}>{relativeTime(chat.lastMessageAt)}</Text>
                  </View>
                  <Text style={styles.subtitle} numberOfLines={1}>{chat.subtitle}</Text>
                  <View style={styles.previewRow}>
                    <Text
                      style={[styles.preview, chat.unreadCount > 0 && styles.previewUnread]}
                      numberOfLines={1}
                    >
                      {chat.lastMessage ?? 'Nessun messaggio ancora'}
                    </Text>
                    {chat.unreadCount > 0 ? (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (c: ColorPalette, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      paddingTop: Math.max(top, 24) + 14,
      paddingHorizontal: 20,
      paddingBottom: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    logo: { fontSize: 24, fontWeight: 'bold', color: c.primary, letterSpacing: 1 },
    headerTitle: { fontSize: 13, color: c.gray, fontWeight: '700' },
    headerIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.actionSurface },
    headerBadge: { position: 'absolute', right: 3, top: 3, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: c.error },
    headerBadgeText: { color: c.white, fontSize: 9, fontWeight: '900' },
    filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: c.cardBackground, borderBottomWidth: 1, borderBottomColor: c.border },
    filter: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: c.actionSurface },
    filterActive: { backgroundColor: c.primarySoft },
    filterText: { fontSize: 12, fontWeight: '800', color: c.textMuted },
    filterTextActive: { color: c.primary },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, gap: 10, paddingBottom: 88 + Math.max(bottom, 10) },
    card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: c.cardBackground, borderWidth: 1, borderColor: c.border },
    cardUnread: { borderColor: c.primary },
    avatar: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft },
    avatarProject: { borderRadius: 15 },
    copy: { flex: 1, gap: 3 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, fontSize: 15, fontWeight: '900', color: c.textStrong },
    time: { fontSize: 10, fontWeight: '700', color: c.gray },
    subtitle: { fontSize: 11, fontWeight: '700', color: c.primary },
    previewRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    preview: { flex: 1, fontSize: 12, color: c.textMuted },
    previewUnread: { color: c.textStrong, fontWeight: '800' },
    unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primary },
    unreadText: { color: c.white, fontSize: 9, fontWeight: '900' },
    empty: { marginTop: 48, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 28, borderRadius: 18, backgroundColor: c.cardBackground, borderWidth: 1, borderColor: c.border },
    emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft, marginBottom: 14 },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: c.textStrong },
    emptyText: { marginTop: 7, maxWidth: 290, fontSize: 12, lineHeight: 18, textAlign: 'center', color: c.textMuted },
  });
