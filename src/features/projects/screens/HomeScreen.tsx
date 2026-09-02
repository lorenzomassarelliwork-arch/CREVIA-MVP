import { useMemo, useState } from 'react';
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
import type { CompositeScreenProps } from '@react-navigation/native';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { MainTabParamList, RootStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';

type HomeScreenProps = CompositeScreenProps<
  MaterialTopTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

type HomeProject = {
  id: string;
  nome: string;
  settore: string;
  citta: string;
  descrizione: string;
  openRoles: string[];
  builderCount: number;
};

type HomeBuilder = {
  id: string;
  displayName: string;
  ruolo: string;
  citta: string;
  settore: string;
  avatarUrl?: string;
  isOnline: boolean;
};

const FEATURED_PROJECTS: HomeProject[] = [
  {
    id: 'project-1',
    nome: 'GreenTrack',
    settore: 'Tech',
    citta: 'Milano',
    descrizione: 'Una piattaforma per aiutare le persone a monitorare e ridurre il proprio impatto ambientale.',
    openRoles: ['Frontend Developer', 'UI Designer'],
    builderCount: 4,
  },
  {
    id: 'project-2',
    nome: 'UniConnect',
    settore: 'Education',
    citta: 'Milano',
    descrizione: 'Un progetto pensato per connettere studenti con competenze complementari e idee da sviluppare insieme.',
    openRoles: ['Mobile Developer', 'Marketing'],
    builderCount: 3,
  },
];

const SAVED_PROJECTS: HomeProject[] = [
  {
    id: 'project-3',
    nome: 'LocalUp',
    settore: 'Startup',
    citta: 'Milano',
    descrizione: 'Strumenti digitali semplici per dare maggiore visibilità alle attività indipendenti di quartiere.',
    openRoles: ['UX Designer', 'Backend Developer'],
    builderCount: 5,
  },
];

const BUILDERS: HomeBuilder[] = [
  { id: 'builder-1', displayName: 'Giulia Bianchi', ruolo: 'UI/UX Designer', citta: 'Milano', settore: 'Design', isOnline: true },
  { id: 'builder-2', displayName: 'Marco Riva', ruolo: 'Frontend Developer', citta: 'Milano', settore: 'Tech', isOnline: false },
  { id: 'builder-3', displayName: 'Sara Conti', ruolo: 'Digital Marketing', citta: 'Milano', settore: 'Marketing', isOnline: true },
];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const styles = useMemo(() => createStyles(colors, insets.top, insets.bottom), [colors, insets.bottom, insets.top]);

  const refresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const openProject = (projectId: string) => navigation.navigate('ProjectDetail', { projectId });
  const openSearch = () => navigation.navigate('Search');

  const renderProjectCard = (project: HomeProject) => (
    <TouchableOpacity
      key={project.id}
      activeOpacity={0.76}
      style={styles.projectCard}
      onPress={() => openProject(project.id)}
    >
      <View style={styles.projectHeader}>
        <View style={styles.projectIcon}>
          <FontAwesome5 name="building" size={17} color={colors.primary} />
        </View>
        <View style={styles.projectTitleWrap}>
          <Text numberOfLines={1} style={styles.projectTitle}>{project.nome}</Text>
          <Text numberOfLines={1} style={styles.projectMeta}>{project.settore} - {project.citta}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.gray} />
      </View>
      <Text numberOfLines={3} style={styles.projectDescription}>{project.descrizione}</Text>
      <View style={styles.roleRow}>
        {project.openRoles.slice(0, 2).map((role) => (
          <View key={role} style={styles.roleChip}>
            <Text numberOfLines={1} style={styles.roleChipText}>{role}</Text>
          </View>
        ))}
      </View>
      <View style={styles.projectFooter}>
        <View style={styles.projectStat}>
          <Ionicons name="people-outline" size={15} color={colors.gray} />
          <Text style={styles.projectStatText}>{project.builderCount} builders</Text>
        </View>
        <Text style={styles.discoverText}>Scopri</Text>
      </View>
    </TouchableOpacity>
  );

  const renderBuilderCard = (user: HomeBuilder) => (
    <TouchableOpacity key={user.id} activeOpacity={0.76} style={styles.builderCard}>
      <View style={styles.builderAvatar}>
        {user.avatarUrl ? (
          <Image source={{ uri: user.avatarUrl }} style={styles.builderAvatarImage} />
        ) : (
          <Text style={styles.builderInitials}>{getInitials(user.displayName)}</Text>
        )}
        {user.isOnline && <View style={styles.onlineDot} />}
      </View>
      <Text numberOfLines={1} style={styles.builderName}>{user.displayName}</Text>
      <Text numberOfLines={1} style={styles.builderRole}>{user.ruolo}</Text>
      <Text numberOfLines={1} style={styles.builderMeta}>{user.citta} - {user.settore}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoText}>CREVIA</Text>
        <TouchableOpacity activeOpacity={0.78} style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={22} color={colors.textStrong} />
          <View style={styles.notificationBadge}><Text style={styles.notificationBadgeText}>2</Text></View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introBlock}>
          <View style={styles.introCopy}>
            <Text style={styles.greeting}>Ciao Lorenzo</Text>
            <Text style={styles.introTitle}>Trova un progetto da costruire</Text>
            <Text style={styles.introSubtitle}>Team in formazione, builder compatibili e idee vicine a te.</Text>
          </View>
          <TouchableOpacity style={styles.searchShortcut} onPress={openSearch}>
            <Ionicons name="compass-outline" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>In partenza</Text>
            <TouchableOpacity onPress={openSearch}><Text style={styles.sectionAction}>Vedi tutto</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {FEATURED_PROJECTS.map(renderProjectCard)}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Progetti salvati</Text></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {SAVED_PROJECTS.map(renderProjectCard)}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Builder compatibili</Text>
            <TouchableOpacity onPress={openSearch}><Text style={styles.sectionAction}>Cerca</Text></TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {BUILDERS.map(renderBuilderCard)}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ColorPalette, topInset: number, bottomInset: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Math.max(topInset, 24) + 14, paddingBottom: 15, backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border },
  logoText: { fontSize: 24, fontWeight: 'bold', color: colors.primary, letterSpacing: 1 },
  notificationButton: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.actionSurface, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notificationBadge: { position: 'absolute', top: 5, right: 5, minWidth: 17, height: 17, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBackground },
  notificationBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  content: { padding: 20, gap: 22, paddingBottom: 88 + Math.max(bottomInset, 10) },
  introBlock: { borderRadius: 16, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  introCopy: { flex: 1, gap: 4 },
  greeting: { fontSize: 13, color: colors.gray, fontWeight: '600' },
  introTitle: { fontSize: 21, fontWeight: 'bold', color: colors.secondary, lineHeight: 27 },
  introSubtitle: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
  searchShortcut: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 19, fontWeight: 'bold', color: colors.secondary },
  sectionAction: { fontSize: 13, fontWeight: 'bold', color: colors.primary },
  horizontalList: { gap: 12, paddingRight: 20 },
  projectCard: { width: 280, minHeight: 212, backgroundColor: colors.cardBackground, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: colors.border, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  projectHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  projectIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  projectTitleWrap: { flex: 1, gap: 2 },
  projectTitle: { fontSize: 16, fontWeight: 'bold', color: colors.secondary },
  projectMeta: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  projectDescription: { fontSize: 14, color: colors.secondary, lineHeight: 21 },
  roleRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  roleChip: { maxWidth: 126, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: colors.actionSurface },
  roleChipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  projectFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' },
  projectStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  projectStatText: { fontSize: 12, color: colors.gray, fontWeight: '600' },
  discoverText: { fontSize: 13, color: colors.primary, fontWeight: 'bold' },
  builderCard: { width: 142, minHeight: 154, borderRadius: 16, padding: 14, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, alignItems: 'center', gap: 7 },
  builderAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  builderInitials: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  builderAvatarImage: { width: '100%', height: '100%', borderRadius: 16 },
  onlineDot: { position: 'absolute', right: 4, bottom: 4, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.confirm, borderWidth: 1, borderColor: colors.cardBackground },
  builderName: { fontSize: 14, fontWeight: 'bold', color: colors.secondary, textAlign: 'center' },
  builderRole: { fontSize: 12, color: colors.primary, fontWeight: '600', textAlign: 'center' },
  builderMeta: { fontSize: 12, color: colors.gray, textAlign: 'center' },
});
