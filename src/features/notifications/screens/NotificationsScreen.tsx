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
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeNotificationChanges,
  type AppNotification,
  type NotificationType,
} from '../services/notificationService';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;
type Filter = 'all' | 'unread';

function relativeTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Adesso';
  if (minutes < 60) return `${minutes} min fa`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h fa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} g fa`;
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  });
}

function iconForType(type: NotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'application_received': return 'document-text-outline';
    case 'application_accepted': return 'checkmark-circle-outline';
    case 'application_rejected': return 'close-circle-outline';
    case 'project_started': return 'rocket-outline';
    case 'project_cancelled': return 'alert-circle-outline';
    case 'experience_pending': return 'ribbon-outline';
    case 'experience_verified': return 'shield-checkmark-outline';
    case 'member_removed': return 'person-remove-outline';
    case 'message_received': return 'chatbubble-ellipses-outline';
    case 'member_left': return 'exit-outline';
    case 'cofounder_added': return 'shield-checkmark-outline';
    case 'cofounder_removed': return 'shield-outline';
    case 'experience_not_selected': return 'alert-circle-outline';
  }
}

function groupLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (date >= startToday) return 'Oggi';
  if (date >= startYesterday) return 'Ieri';
  return 'Precedenti';
}

export default function NotificationsScreen({ navigation }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, insets.top, insets.bottom), [colors, insets.bottom, insets.top]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => setNotifications(await listNotifications()), []);

  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    void load().catch(() => { if (active) setNotifications([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]));

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void subscribeNotificationChanges(() => { void load(); })
      .then((cleanup) => { if (!active) cleanup(); else unsubscribe = cleanup; })
      .catch(() => undefined);
    return () => { active = false; unsubscribe?.(); };
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  };

  const unreadCount = notifications.filter((item) => !item.readAt).length;
  const visible = filter === 'unread' ? notifications.filter((item) => !item.readAt) : notifications;
  const grouped = visible.reduce<Record<string, AppNotification[]>>((acc, item) => {
    const label = groupLabel(item.createdAt);
    acc[label] = [...(acc[label] ?? []), item];
    return acc;
  }, {});

  const openNotification = async (item: AppNotification) => {
    if (!item.readAt) {
      await markNotificationRead(item.id);
      setNotifications((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    }
    if (item.type === 'experience_not_selected' && item.experienceExclusionId) {
      navigation.navigate('ExperienceExclusion', {
        exclusionId: item.experienceExclusionId,
      });
      return;
    }
    if (item.type === 'message_received' && item.conversationId) {
      navigation.navigate('ChatRoom', { conversationId: item.conversationId });
      return;
    }
    if (!item.projectId) return;
    if (item.type === 'application_received') {
      navigation.navigate('ProjectApplications', { projectId: item.projectId });
      return;
    }
    if (item.type === 'experience_pending' || item.type === 'experience_verified') {
      navigation.navigate('ProjectTeam', { projectId: item.projectId });
      return;
    }
    navigation.navigate('ProjectDetail', { projectId: item.projectId });
  };

  const markAll = async () => {
    if (unreadCount === 0 || markingAll) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      const now = new Date().toISOString();
      setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    } finally { setMarkingAll(false); }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Notifiche</Text>
          <Text style={styles.headerSub}>{unreadCount > 0 ? `${unreadCount} da leggere` : 'Sei aggiornato'}</Text>
        </View>
        <TouchableOpacity style={styles.readAllButton} onPress={() => void markAll()} disabled={unreadCount === 0 || markingAll}>
          <Ionicons name="checkmark-done-outline" size={20} color={unreadCount > 0 ? colors.primary : colors.disabled} />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity style={[styles.filterButton, filter === 'all' && styles.filterActive]} onPress={() => setFilter('all')}>
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>Tutte</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterButton, filter === 'unread' && styles.filterActive]} onPress={() => setFilter('unread')}>
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>Da leggere {unreadCount > 0 ? `(${unreadCount})` : ''}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.primary} colors={[colors.primary]} />} showsVerticalScrollIndicator={false}>
          {visible.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name={filter === 'unread' ? 'checkmark-circle-outline' : 'notifications-outline'} size={30} color={colors.primary} /></View>
              <Text style={styles.emptyTitle}>{filter === 'unread' ? 'Tutto letto' : 'Nessuna notifica'}</Text>
              <Text style={styles.emptyText}>{filter === 'unread' ? 'Non hai notifiche da leggere.' : 'Qui vedrai candidature, messaggi, aggiornamenti sui progetti e Crevia Experience.'}</Text>
            </View>
          ) : (
            ['Oggi', 'Ieri', 'Precedenti'].map((label) => {
              const items = grouped[label] ?? [];
              if (items.length === 0) return null;
              return (
                <View key={label} style={styles.section}>
                  <Text style={styles.sectionTitle}>{label}</Text>
                  <View style={styles.list}>
                    {items.map((item) => {
                      const unread = !item.readAt;
                      return (
                        <TouchableOpacity key={item.id} activeOpacity={0.76} style={[styles.card, unread && styles.cardUnread]} onPress={() => void openNotification(item)}>
                          <View style={[styles.iconBox, unread && styles.iconBoxUnread]}>
                            <Ionicons name={iconForType(item.type)} size={20} color={colors.primary} />
                          </View>
                          <View style={styles.cardCopy}>
                            <View style={styles.cardTitleRow}><Text style={styles.cardTitle}>{item.title}</Text>{unread ? <View style={styles.unreadDot} /> : null}</View>
                            <Text style={styles.cardBody}>{item.body}</Text>
                            <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
                          </View>
                          {item.projectId || item.conversationId ? <Ionicons name="chevron-forward" size={18} color={colors.gray} /> : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const makeStyles = (c: ColorPalette, top: number, bottom: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: { paddingTop: Math.max(top, 24) + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: c.cardBackground, borderBottomWidth: 1, borderBottomColor: c.border },
  back: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.actionSurface },
  headerCopy: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: c.textStrong },
  headerSub: { marginTop: 2, fontSize: 11, color: c.gray },
  readAllButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.actionSurface },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: c.cardBackground, borderBottomWidth: 1, borderBottomColor: c.border },
  filterButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: c.actionSurface },
  filterActive: { backgroundColor: c.primarySoft },
  filterText: { fontSize: 12, fontWeight: '800', color: c.textMuted },
  filterTextActive: { color: c.primary },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 22, paddingBottom: 32 + bottom },
  section: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: c.gray },
  list: { gap: 10 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: c.cardBackground, borderWidth: 1, borderColor: c.border },
  cardUnread: { borderColor: c.primary, backgroundColor: c.primarySoft },
  iconBox: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: c.actionSurface },
  iconBoxUnread: { backgroundColor: c.cardBackground },
  cardCopy: { flex: 1, gap: 4 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '900', color: c.textStrong },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
  cardBody: { fontSize: 12, lineHeight: 18, color: c.textMuted },
  time: { marginTop: 2, fontSize: 10, fontWeight: '700', color: c.gray },
  empty: { marginTop: 48, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 28, borderRadius: 18, backgroundColor: c.cardBackground, borderWidth: 1, borderColor: c.border },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft, marginBottom: 14 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: c.textStrong },
  emptyText: { marginTop: 7, maxWidth: 280, fontSize: 12, lineHeight: 18, textAlign: 'center', color: c.textMuted },
});