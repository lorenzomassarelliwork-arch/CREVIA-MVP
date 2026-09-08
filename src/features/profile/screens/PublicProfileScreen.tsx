import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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
  getProfileOverview,
  type ProfileOverview,
} from '../services/profileOverviewService';
import {
  getProfileDisplayName,
  getProfileInitials,
} from '../services/profileService';

type Props = NativeStackScreenProps<RootStackParamList, 'PublicProfile'>;

export default function PublicProfileScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );

  const [overview, setOverview] = useState<ProfileOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setOverview(await getProfileOverview(route.params.userId));
    setLoading(false);
  }, [route.params.userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!overview) {
    return (
      <View style={styles.loading}>
        <Text style={styles.emptyTitle}>Profilo non disponibile</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Torna indietro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { profile, createdProjects, participatedProjects, experiences } =
    overview;
  const publicExperiences = experiences.filter(
    ({ experience }) => experience.verificationStatus !== 'disputed'
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profilo builder</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getProfileInitials(profile)}</Text>
            )}
          </View>
          <Text style={styles.name}>{getProfileDisplayName(profile)}</Text>
          <Text style={styles.headline}>{profile.headline ?? 'Builder'}</Text>

          <View style={styles.metaWrap}>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.gray} />
              <Text style={styles.metaText}>
                {profile.city ?? 'Città non indicata'}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={14} color={colors.gray} />
              <Text style={styles.metaText}>
                {profile.availability ?? 'Disponibilità non indicata'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Su di me</Text>
          <View style={styles.card}>
            <Text style={styles.body}>
              {profile.bio?.trim() || 'Questo builder non ha ancora aggiunto una bio.'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Competenze</Text>
          <View style={styles.card}>
            {profile.skills.length > 0 ? (
              <View style={styles.skills}>
                {profile.skills.map((skill) => (
                  <View key={skill} style={styles.skillChip}>
                    <Text style={styles.skillText}>{skill}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>Nessuna competenza indicata.</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.sectionTitle}>Crevia Experience</Text>
            <View style={styles.proofBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={colors.primary}
              />
              <Text style={styles.proofText}>Proof of Work</Text>
            </View>
          </View>

          {publicExperiences.length > 0 ? (
            publicExperiences.map(({ experience, project }) => (
              <TouchableOpacity
                key={experience.id}
                style={styles.experienceCard}
                activeOpacity={project ? 0.75 : 1}
                onPress={
                  project
                    ? () =>
                        navigation.navigate('ProjectDetail', {
                          projectId: project.id,
                        })
                    : undefined
                }
              >
                <View style={styles.experienceTop}>
                  <View style={styles.experienceIcon}>
                    <Ionicons name="ribbon-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.projectTitle}>
                      {project?.title ?? 'Progetto Crevia'}
                    </Text>
                    <Text style={styles.role}>{experience.roleTitle}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Ionicons
                      name={
                        experience.verificationStatus === 'verified'
                          ? 'checkmark-circle'
                          : 'time-outline'
                      }
                      size={13}
                      color={
                        experience.verificationStatus === 'verified'
                          ? colors.confirm
                          : colors.gray
                      }
                    />
                    <Text style={styles.statusText}>
                      {experience.verificationStatus === 'verified'
                        ? 'Verificata'
                        : 'In attesa'}
                    </Text>
                  </View>
                </View>

                <View style={styles.skills}>
                  {experience.skills.map((skill) => (
                    <View key={skill} style={styles.skillChip}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.dateText}>
                  {formatDate(experience.startedAt)} - {formatDate(experience.completedAt)}
                </Text>

                {experience.verificationStatus === 'verified' ? (
                  <View style={styles.verifiedRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.confirm}
                    />
                    <Text style={styles.verifiedText}>
                      Esperienza verificata tramite Crevia
                    </Text>
                  </View>
                ) : (
                  <View style={styles.pendingRow}>
                    <Ionicons
                      name="time-outline"
                      size={16}
                      color={colors.gray}
                    />
                    <Text style={styles.pendingText}>
                      Esperienza in attesa di conferma del partecipante
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="ribbon-outline" size={28} color={colors.gray} />
              <Text style={styles.emptyTitle}>Nessuna esperienza ancora</Text>
              <Text style={styles.emptyText}>
                Le esperienze completate appariranno qui, indicando chiaramente se sono in attesa o verificate.
              </Text>
            </View>
          )}
        </View>

        <ProjectList
          title="Progetti creati"
          empty="Nessun progetto creato."
          projects={createdProjects.map((project) => ({
            id: project.id,
            title: project.title,
            subtitle: project.category,
          }))}
          onOpen={(projectId) =>
            navigation.navigate('ProjectDetail', { projectId })
          }
          colors={colors}
          styles={styles}
        />

        <ProjectList
          title="Progetti a cui partecipa"
          empty="Nessuna partecipazione attiva."
          projects={participatedProjects.map(({ project, roleTitle }) => ({
            id: project.id,
            title: project.title,
            subtitle: roleTitle,
          }))}
          onOpen={(projectId) =>
            navigation.navigate('ProjectDetail', { projectId })
          }
          colors={colors}
          styles={styles}
        />
      </ScrollView>
    </View>
  );
}

function ProjectList({
  title,
  empty,
  projects,
  onOpen,
  colors,
  styles,
}: {
  title: string;
  empty: string;
  projects: Array<{ id: string; title: string; subtitle: string }>;
  onOpen: (id: string) => void;
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {projects.length > 0 ? (
        projects.map((project) => (
          <TouchableOpacity
            key={project.id}
            style={styles.projectCard}
            onPress={() => onOpen(project.id)}
          >
            <View style={styles.projectIcon}>
              <Ionicons name="briefcase-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.role}>{project.subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.gray} />
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptySmall}>
          <Text style={styles.emptyText}>{empty}</Text>
        </View>
      )}
    </View>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('it-IT', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

const makeStyles = (c: ColorPalette, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: c.background,
    },
    backLink: { color: c.primary, fontWeight: '800' },
    header: {
      paddingTop: Math.max(top, 24) + 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
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
    headerSpacer: { width: 42 },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '900',
      color: c.textStrong,
    },
    content: { padding: 20, gap: 22, paddingBottom: 30 + bottom },
    identityCard: {
      alignItems: 'center',
      gap: 6,
      padding: 20,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    avatar: {
      width: 82,
      height: 82,
      borderRadius: 26,
      marginBottom: 4,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: c.primarySoft,
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { fontSize: 25, fontWeight: '900', color: c.primary },
    name: { fontSize: 22, fontWeight: '900', color: c.textStrong },
    headline: { fontSize: 14, fontWeight: '800', color: c.primary },
    metaWrap: {
      marginTop: 6,
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 11, color: c.gray },
    section: { gap: 10 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    sectionTitle: { fontSize: 19, fontWeight: '900', color: c.textStrong },
    proofBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    proofText: { fontSize: 10, fontWeight: '800', color: c.primary },
    card: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    body: { fontSize: 14, lineHeight: 21, color: c.textMuted },
    skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    skillChip: {
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 9,
      backgroundColor: c.actionSurface,
    },
    skillText: { fontSize: 11, fontWeight: '800', color: c.textMuted },
    experienceCard: {
      padding: 16,
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    experienceTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    experienceIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
    },
    flex: { flex: 1 },
    projectTitle: { fontSize: 15, fontWeight: '900', color: c.textStrong },
    role: { fontSize: 11, fontWeight: '800', color: c.primary, marginTop: 2 },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.actionSurface,
    },
    statusText: { fontSize: 10, fontWeight: '800', color: c.textMuted },
    dateText: { fontSize: 11, color: c.gray },
    verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    verifiedText: { fontSize: 11, fontWeight: '800', color: c.confirm },
    pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pendingText: { fontSize: 11, fontWeight: '700', color: c.gray },
    projectCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    projectIcon: {
      width: 40,
      height: 40,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
    },
    emptyCard: {
      minHeight: 150,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    emptySmall: {
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    emptyTitle: { fontSize: 15, fontWeight: '900', color: c.textStrong },
    emptyText: { fontSize: 12, lineHeight: 18, color: c.textMuted, textAlign: 'center' },
  });
