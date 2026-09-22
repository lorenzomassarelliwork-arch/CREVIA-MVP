import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
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
import type { Project, ProjectRole, UserProfile } from '../../../domain/models';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import { listProjectMembers } from '../../applications/services/applicationService';
import {
  getUnreadNotificationCount,
  subscribeNotificationChanges,
} from '../../notifications/services/notificationService';
import { CURRENT_USER_ID } from '../../../core/session';
import {
  getProfile,
  getProfileDisplayName,
  listProfiles,
} from '../../profile/services/profileService';
import { getProjectDetail, listProjects } from '../services/projectService';
import { listSavedProjectIds } from '../services/savedProjectService';

type Props = CompositeScreenProps<
  MaterialTopTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

type HomeProject = {
  project: Project;
  roles: ProjectRole[];
  builderCount: number;
};

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

export default function HomeScreen({ navigation }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );

  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<HomeProject[]>([]);
  const [builders, setBuilders] = useState<UserProfile[]>([]);
  const [currentFirstName, setCurrentFirstName] = useState('Builder');
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const load = useCallback(async () => {
    const [all, savedProjectIds, currentProfile, unreadCount, allProfiles] =
      await Promise.all([
        listProjects(),
        listSavedProjectIds(),
        getProfile(CURRENT_USER_ID),
        getUnreadNotificationCount(),
        listProfiles(),
      ]);

    setCurrentFirstName(currentProfile?.firstName ?? 'Builder');
    setUnreadNotifications(unreadCount);

    const currentSkills = new Set(
      (currentProfile?.skills ?? []).map((skill) => skill.trim().toLowerCase())
    );
    const currentCity = currentProfile?.city?.trim().toLowerCase() ?? '';

    const compatibleBuilders = allProfiles
      .filter((profile) => profile.id !== CURRENT_USER_ID)
      .map((profile) => {
        const sharedSkills = profile.skills.filter((skill) =>
          currentSkills.has(skill.trim().toLowerCase())
        ).length;
        const sameCity =
          Boolean(currentCity) &&
          profile.city?.trim().toLowerCase() === currentCity;
        return {
          profile,
          score: sharedSkills * 3 + (sameCity ? 1 : 0),
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.profile.firstName.localeCompare(b.profile.firstName, 'it')
      )
      .slice(0, 8)
      .map(({ profile }) => profile);

    setBuilders(compatibleBuilders);

    const detailed = await Promise.all(
      all.map(async (project) => {
        const [detail, members] = await Promise.all([
          getProjectDetail(project.id),
          listProjectMembers(project.id),
        ]);

        return {
          project,
          roles: detail?.roles ?? [],
          builderCount: members.filter(
            (member) =>
              member.status === 'active' || member.status === 'completed'
          ).length,
        };
      })
    );

    setProjects(detailed);
    setSavedIds(savedProjectIds);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;

    void subscribeNotificationChanges(() => {
      void getUnreadNotificationCount()
        .then((count) => {
          if (active) setUnreadNotifications(count);
        })
        .catch(() => undefined);
    })
      .then((cleanup) => {
        if (!active) {
          cleanup();
          return;
        }
        unsubscribe = cleanup;
      })
      .catch(() => undefined);

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const recruiting = projects
    .filter((item) => item.project.status === 'recruiting')
    .slice(0, 6);
  const saved = projects.filter(
    (item) =>
      savedIds.includes(item.project.id) && item.project.status !== 'cancelled'
  );

  const card = (item: HomeProject) => (
    <TouchableOpacity
      key={item.project.id}
      activeOpacity={0.76}
      style={styles.projectCard}
      onPress={() =>
        navigation.navigate('ProjectDetail', { projectId: item.project.id })
      }
    >
      <View style={styles.projectHeader}>
        <View style={styles.projectIcon}>
          <FontAwesome5 name="building" size={17} color={colors.primary} />
        </View>
        <View style={styles.projectTitleWrap}>
          <Text numberOfLines={1} style={styles.projectTitle}>
            {item.project.title}
          </Text>
          <Text numberOfLines={1} style={styles.projectMeta}>
            {item.project.category} - {item.project.city ?? 'Remoto'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray} />
      </View>

      <Text numberOfLines={3} style={styles.projectDescription}>
        {item.project.description}
      </Text>

      <View style={styles.roleRow}>
        {item.roles.slice(0, 2).map((role) => (
          <View key={role.id} style={styles.roleChip}>
            <Text numberOfLines={1} style={styles.roleChipText}>
              {role.title}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.projectFooter}>
        <View style={styles.projectStat}>
          <Ionicons name="people-outline" size={15} color={colors.gray} />
          <Text style={styles.projectStatText}>
            {item.builderCount} builders
          </Text>
        </View>
        <Text style={styles.discoverText}>Scopri</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>CREVIA</Text>
        <TouchableOpacity
          activeOpacity={0.78}
          style={styles.notificationButton}
          onPress={() => navigation.navigate('Notifications')}
          accessibilityLabel="Apri notifiche"
        >
          <Ionicons
            name="notifications-outline"
            size={22}
            color={colors.textStrong}
          />
          {unreadNotifications > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {unreadNotifications > 99 ? '99+' : unreadNotifications}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBlock}>
          <View style={styles.introCopy}>
            <Text style={styles.greeting}>Ciao {currentFirstName}</Text>
            <Text style={styles.introTitle}>Trova un progetto da costruire</Text>
            <Text style={styles.introSubtitle}>
              Team in formazione, builder compatibili e idee vicine a te.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.searchShortcut}
            onPress={() => navigation.navigate('Search')}
          >
            <Ionicons name="compass-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>In partenza</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={styles.sectionAction}>Vedi tutto</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {recruiting.map(card)}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Progetti salvati</Text>
          </View>
          {saved.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {saved.map(card)}
            </ScrollView>
          ) : (
            <View style={styles.emptySaved}>
              <Text style={styles.emptySavedText}>
                I progetti che salvi appariranno qui.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Builder compatibili</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Search')}>
              <Text style={styles.sectionAction}>Cerca</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {builders.map((user) => (
              <TouchableOpacity
                key={user.id}
                activeOpacity={0.76}
                style={styles.builderCard}
                onPress={() =>
                  navigation.navigate('PublicProfile', { userId: user.id })
                }
              >
                <View style={styles.builderAvatar}>
                  {user.avatarUrl ? (
                    <Image
                      source={{ uri: user.avatarUrl }}
                      style={styles.builderAvatarImage}
                    />
                  ) : (
                    <Text style={styles.builderInitials}>
                      {initials(getProfileDisplayName(user))}
                    </Text>
                  )}
                </View>
                <Text numberOfLines={1} style={styles.builderName}>
                  {getProfileDisplayName(user)}
                </Text>
                <Text numberOfLines={1} style={styles.builderRole}>
                  {user.headline ?? 'Builder'}
                </Text>
                <Text numberOfLines={1} style={styles.builderMeta}>
                  {user.city ?? 'Località non indicata'}
                </Text>
              </TouchableOpacity>
            ))}
            {builders.length === 0 ? (
              <View style={styles.emptyBuilders}>
                <Text style={styles.emptySavedText}>
                  Nessun altro builder disponibile al momento.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ColorPalette, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: Math.max(top, 24) + 14,
      paddingBottom: 15,
      backgroundColor: c.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    logoText: {
      fontSize: 24,
      fontWeight: 'bold',
      color: c.primary,
      letterSpacing: 1,
    },
    notificationButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: c.actionSurface,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    notificationBadge: {
      position: 'absolute',
      top: 3,
      right: 3,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: c.error,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.cardBackground,
    },
    notificationBadgeText: {
      color: c.white,
      fontSize: 9,
      fontWeight: '900',
    },
    content: {
      padding: 20,
      gap: 22,
      paddingBottom: 88 + Math.max(bottom, 10),
    },
    introBlock: {
      borderRadius: 16,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
      padding: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    introCopy: { flex: 1, gap: 4 },
    greeting: { fontSize: 13, color: c.gray, fontWeight: '600' },
    introTitle: {
      fontSize: 21,
      fontWeight: 'bold',
      color: c.secondary,
      lineHeight: 27,
    },
    introSubtitle: { fontSize: 14, color: c.textMuted, lineHeight: 20 },
    searchShortcut: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    section: { gap: 12 },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sectionTitle: { fontSize: 19, fontWeight: 'bold', color: c.secondary },
    sectionAction: { fontSize: 13, fontWeight: 'bold', color: c.primary },
    horizontalList: { gap: 12, paddingRight: 20 },
    projectCard: {
      width: 280,
      minHeight: 212,
      backgroundColor: c.cardBackground,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    projectHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    projectIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: c.primarySoft,
      justifyContent: 'center',
      alignItems: 'center',
    },
    projectTitleWrap: { flex: 1, gap: 2 },
    projectTitle: { fontSize: 16, fontWeight: 'bold', color: c.secondary },
    projectMeta: { fontSize: 12, color: c.primary, fontWeight: '600' },
    projectDescription: { fontSize: 14, color: c.secondary, lineHeight: 21 },
    roleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    roleChip: {
      maxWidth: 126,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
      backgroundColor: c.actionSurface,
    },
    roleChipText: { fontSize: 12, fontWeight: '700', color: c.textMuted },
    projectFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 'auto',
    },
    projectStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    projectStatText: { fontSize: 12, color: c.gray, fontWeight: '600' },
    discoverText: { fontSize: 13, color: c.primary, fontWeight: 'bold' },
    builderCard: {
      width: 142,
      minHeight: 154,
      borderRadius: 16,
      padding: 14,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      gap: 7,
    },
    builderAvatar: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    builderInitials: { color: c.primary, fontSize: 16, fontWeight: 'bold' },
    builderAvatarImage: { width: '100%', height: '100%', borderRadius: 16 },

    builderName: {
      fontSize: 14,
      fontWeight: 'bold',
      color: c.secondary,
      textAlign: 'center',
    },
    builderRole: {
      fontSize: 12,
      color: c.primary,
      fontWeight: '600',
      textAlign: 'center',
    },
    builderMeta: { fontSize: 12, color: c.gray, textAlign: 'center' },
    emptyBuilders: {
      width: 250,
      minHeight: 110,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
      padding: 16,
    },
    emptySaved: {
      minHeight: 90,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    emptySavedText: { fontSize: 12, color: c.textMuted },
  });
