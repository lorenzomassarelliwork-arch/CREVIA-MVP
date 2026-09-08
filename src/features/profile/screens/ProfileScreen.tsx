import { useCallback, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

import { CURRENT_USER_ID } from '../../../core/session';
import type { MainTabParamList, RootStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import { confirmExperience } from '../../experience/services/experienceService';
import {
  getProfileOverview,
  type ProfileOverview,
} from '../services/profileOverviewService';
import {
  getProfileDisplayName,
  getProfileInitials,
} from '../services/profileService';

type Props = CompositeScreenProps<
  MaterialTopTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function ProfileScreen({ navigation }: Props) {
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
    setOverview(await getProfileOverview(CURRENT_USER_ID));
    setLoading(false);
  }, []);

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
      </View>
    );
  }

  const { profile, createdProjects, participatedProjects, experiences } =
    overview;

  const confirmPendingExperience = async (experienceId: string) => {
    try {
      await confirmExperience(experienceId, CURRENT_USER_ID);
      await load();
      Alert.alert(
        'Esperienza verificata',
        'La tua partecipazione al progetto è stata confermata.'
      );
    } catch (error) {
      Alert.alert(
        'Conferma non riuscita',
        error instanceof Error ? error.message : 'Errore imprevisto.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>CREVIA</Text>
          <Text style={styles.headerTitle}>Profilo</Text>
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}
        >
          <Ionicons name="create-outline" size={18} color={colors.primary} />
          <Text style={styles.editText}>Modifica</Text>
        </TouchableOpacity>
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

          <View style={styles.identityCopy}>
            <Text style={styles.name}>{getProfileDisplayName(profile)}</Text>
            <Text style={styles.headline}>{profile.headline ?? 'Builder'}</Text>
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

        <SectionCard title="Su di me" styles={styles}>
          <Text style={styles.bodyText}>
            {profile.bio?.trim() || 'Aggiungi una bio per raccontare cosa vuoi costruire.'}
          </Text>
        </SectionCard>

        <SectionCard title="Competenze" styles={styles}>
          {profile.skills.length > 0 ? (
            <View style={styles.skills}>
              {profile.skills.map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <Text style={styles.skillText}>{skill}</Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyText text="Nessuna competenza indicata." styles={styles} />
          )}
        </SectionCard>

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Crevia Experience</Text>
            <View style={styles.proofBadge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color={colors.primary}
              />
              <Text style={styles.proofBadgeText}>Proof of Work</Text>
            </View>
          </View>

          {experiences.length > 0 ? (
            experiences.map(({ experience, project }) => (
              <View
                key={experience.id}
                style={styles.experienceCard}
              >
                <View style={styles.experienceTop}>
                  <View style={styles.experienceIcon}>
                    <Ionicons
                      name="ribbon-outline"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>
                      {project?.title ?? 'Progetto Crevia'}
                    </Text>
                    <Text style={styles.cardAccent}>{experience.roleTitle}</Text>
                  </View>
                  <ExperienceStatus
                    status={experience.verificationStatus}
                    colors={colors}
                    styles={styles}
                  />
                </View>

                <View style={styles.skills}>
                  {experience.skills.map((skill) => (
                    <View key={skill} style={styles.skillChip}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.experienceDates}>
                  {formatDate(experience.startedAt)} - {formatDate(experience.completedAt)}
                </Text>

                {experience.verificationStatus === 'verified' ? (
                  <View style={styles.verifiedLine}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={colors.confirm}
                    />
                    <Text style={styles.verifiedText}>
                      Esperienza verificata tramite Crevia
                    </Text>
                  </View>
                ) : experience.verificationStatus === 'pending' ? (
                  <View style={styles.pendingWrap}>
                    <Text style={styles.pendingText}>
                      Questa esperienza attende la tua conferma.
                    </Text>
                    <TouchableOpacity
                      style={styles.confirmExperienceButton}
                      onPress={() =>
                        void confirmPendingExperience(experience.id)
                      }
                    >
                      <Text style={styles.confirmExperienceText}>
                        Conferma esperienza
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.pendingText}>
                    Esperienza contestata.
                  </Text>
                )}

                {project ? (
                  <TouchableOpacity
                    style={styles.experienceProjectButton}
                    onPress={() =>
                      navigation.navigate('ProjectDetail', {
                        projectId: project.id,
                      })
                    }
                  >
                    <Text style={styles.experienceProjectText}>
                      Apri progetto
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={15}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="ribbon-outline" size={28} color={colors.gray} />
              <Text style={styles.emptyTitle}>Nessuna esperienza ancora</Text>
              <Text style={styles.emptyText}>
                Le esperienze completate e confermate appariranno qui.
              </Text>
            </View>
          )}
        </View>

        <ProjectSection
          title="Progetti creati"
          emptyText="Non hai ancora pubblicato progetti."
          projects={createdProjects.map((project) => ({
            id: project.id,
            title: project.title,
            subtitle: project.category,
            status:
              project.status === 'recruiting'
                ? 'In recruiting'
                : project.status === 'active'
                  ? 'In corso'
                  : 'Completato',
          }))}
          onOpen={(projectId) =>
            navigation.navigate('ProjectDetail', { projectId })
          }
          styles={styles}
          colors={colors}
        />

        <ProjectSection
          title="Progetti a cui partecipo"
          emptyText="Non stai ancora partecipando a nessun progetto."
          projects={participatedProjects.map(({ project, roleTitle, member }) => ({
            id: project.id,
            title: project.title,
            subtitle: roleTitle,
            status:
              member.status === 'completed' ? 'Completato' : 'Membro attivo',
          }))}
          onOpen={(projectId) =>
            navigation.navigate('ProjectDetail', { projectId })
          }
          styles={styles}
          colors={colors}
        />
      </ScrollView>
    </View>
  );
}

function SectionCard({
  title,
  styles,
  children,
}: {
  title: string;
  styles: ReturnType<typeof makeStyles>;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.standardCard}>{children}</View>
    </View>
  );
}

function EmptyText({
  text,
  styles,
}: {
  text: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function ExperienceStatus({
  status,
  colors,
  styles,
}: {
  status: 'pending' | 'verified' | 'disputed';
  colors: ColorPalette;
  styles: ReturnType<typeof makeStyles>;
}) {
  const label =
    status === 'verified'
      ? 'Verificata'
      : status === 'pending'
        ? 'In attesa'
        : 'Contestata';

  return (
    <View style={styles.statusBadge}>
      <Ionicons
        name={
          status === 'verified'
            ? 'checkmark-circle'
            : status === 'pending'
              ? 'time-outline'
              : 'alert-circle-outline'
        }
        size={13}
        color={
          status === 'verified'
            ? colors.confirm
            : status === 'disputed'
              ? colors.error
              : colors.gray
        }
      />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

type ProjectItem = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
};

function ProjectSection({
  title,
  emptyText,
  projects,
  onOpen,
  styles,
  colors,
}: {
  title: string;
  emptyText: string;
  projects: ProjectItem[];
  onOpen: (projectId: string) => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ColorPalette;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {projects.length > 0 ? (
        projects.map((project) => (
          <TouchableOpacity
            key={project.id}
            style={styles.projectCard}
            activeOpacity={0.75}
            onPress={() => onOpen(project.id)}
          >
            <View style={styles.projectIcon}>
              <Ionicons name="briefcase-outline" size={19} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{project.title}</Text>
              <Text style={styles.projectSubtitle}>{project.subtitle}</Text>
            </View>
            <Text style={styles.projectStatus}>{project.status}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.gray} />
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptySmallCard}>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
    </View>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('it-IT', {
    month: 'short',
    year: 'numeric',
  }).format(date);
}

const makeStyles = (c: ColorPalette, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
    },
    header: {
      paddingTop: Math.max(top, 24) + 14,
      paddingHorizontal: 20,
      paddingBottom: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: c.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    logo: {
      fontSize: 24,
      fontWeight: 'bold',
      color: c.primary,
      letterSpacing: 1,
    },
    headerTitle: { fontSize: 13, color: c.gray, fontWeight: '700' },
    editButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 11,
      backgroundColor: c.actionSurface,
    },
    editText: { color: c.primary, fontSize: 12, fontWeight: '900' },
    content: {
      padding: 20,
      gap: 22,
      paddingBottom: 90 + bottom,
    },
    identityCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      padding: 18,
      borderRadius: 18,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
    },
    avatar: {
      width: 78,
      height: 78,
      borderRadius: 24,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarText: { color: c.primary, fontSize: 24, fontWeight: '900' },
    identityCopy: { flex: 1, gap: 4 },
    name: { fontSize: 21, fontWeight: '900', color: c.textStrong },
    headline: { fontSize: 14, fontWeight: '800', color: c.primary },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 12, color: c.gray },
    section: { gap: 10 },
    sectionTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    sectionTitle: { fontSize: 19, fontWeight: '900', color: c.textStrong },
    proofBadge: {
      flexDirection: 'row',
      gap: 5,
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    proofBadgeText: { fontSize: 10, fontWeight: '800', color: c.primary },
    standardCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    bodyText: { fontSize: 14, lineHeight: 21, color: c.textMuted },
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
    cardTitle: { fontSize: 15, fontWeight: '900', color: c.textStrong },
    cardAccent: { fontSize: 12, fontWeight: '800', color: c.primary, marginTop: 2 },
    statusBadge: {
      flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.actionSurface,
    },
    statusText: { fontSize: 10, fontWeight: '800', color: c.textMuted },
    experienceDates: { fontSize: 11, color: c.gray },
    verifiedLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    verifiedText: { fontSize: 11, fontWeight: '800', color: c.confirm },
    pendingWrap: { gap: 8 },
    pendingText: { fontSize: 11, color: c.gray },
    confirmExperienceButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 9,
      backgroundColor: c.primary,
    },
    confirmExperienceText: {
      fontSize: 11,
      fontWeight: '900',
      color: c.white,
    },
    experienceProjectButton: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingVertical: 3,
    },
    experienceProjectText: {
      fontSize: 11,
      fontWeight: '900',
      color: c.primary,
    },
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
    projectSubtitle: { fontSize: 11, color: c.primary, fontWeight: '700', marginTop: 2 },
    projectStatus: { fontSize: 10, color: c.gray, fontWeight: '700' },
    emptyCard: {
      minHeight: 160,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    emptySmallCard: {
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    emptyTitle: { fontSize: 15, fontWeight: '900', color: c.textStrong },
    emptyText: { fontSize: 12, lineHeight: 18, color: c.textMuted, textAlign: 'center' },
  });
