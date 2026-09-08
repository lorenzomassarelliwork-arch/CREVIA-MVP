import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { CURRENT_USER_ID } from '../../../core/session';
import type { VerifiedExperience } from '../../../domain/models';
import type { RootStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import {
  listProjectMembersWithProfiles,
  removeProjectMember,
  type ProjectMemberWithProfile,
} from '../../applications/services/applicationService';
import {
  confirmExperience,
  listExperiencesForProject,
} from '../../experience/services/experienceService';
import {
  getOwnerLabel,
  getProjectDetail,
  isProjectOwner,
} from '../services/projectService';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectTeam'>;

export default function ProjectTeamScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );

  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [experiences, setExperiences] = useState<VerifiedExperience[]>([]);
  const [title, setTitle] = useState('Team');
  const [ownerLabel, setOwnerLabel] = useState('Creator Crevia');
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [projectMembers, detail, projectExperiences] = await Promise.all([
      listProjectMembersWithProfiles(route.params.projectId),
      getProjectDetail(route.params.projectId),
      listExperiencesForProject(route.params.projectId),
    ]);

    setMembers(projectMembers);
    setTitle(detail?.project.title ?? 'Team');
    setOwnerLabel(
      detail ? getOwnerLabel(detail.project) : 'Creator Crevia'
    );
    setCanManageTeam(
      Boolean(
        detail &&
          isProjectOwner(detail.project) &&
          (detail.project.status === 'recruiting' ||
            detail.project.status === 'active')
      )
    );
    setExperiences(projectExperiences);
    setLoading(false);
  }, [route.params.projectId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const confirm = async (experience: VerifiedExperience) => {
    try {
      await confirmExperience(experience.id, CURRENT_USER_ID);
      await load();
      Alert.alert(
        'Esperienza verificata',
        'La partecipazione al progetto è stata confermata.'
      );
    } catch (error) {
      Alert.alert(
        'Conferma non riuscita',
        error instanceof Error ? error.message : 'Errore imprevisto.'
      );
    }
  };

  const removeMember = (member: ProjectMemberWithProfile) => {
    Alert.alert(
      'Rimuovere il partecipante?',
      `${member.profile.firstName} ${member.profile.lastName} non farà più parte del team e non riceverà una Crevia Experience per questo progetto.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeProjectMember(member.id);
              await load();
              Alert.alert(
                'Partecipante rimosso',
                'Il partecipante non fa più parte del team. Se il progetto è ancora in recruiting, il posto nel ruolo è nuovamente disponibile.'
              );
            } catch (error) {
              Alert.alert(
                'Rimozione non riuscita',
                error instanceof Error ? error.message : 'Errore imprevisto.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.textStrong}
          />
        </TouchableOpacity>

        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Team</Text>
          <Text style={styles.headerSub}>{title}</Text>
        </View>

        <View style={styles.spacer} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.ownerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {ownerLabel
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part.charAt(0))
                  .join('')
                  .toUpperCase()}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.name}>{ownerLabel}</Text>
              <Text style={styles.role}>Creator del progetto</Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Founder</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Membri</Text>

          {members.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="people-outline"
                size={28}
                color={colors.gray}
              />
              <Text style={styles.emptyTitle}>Nessun membro ancora</Text>
              <Text style={styles.emptyText}>
                Accetta almeno una candidatura per formare il team.
              </Text>
            </View>
          ) : (
            members.map((member) => {
              const experience = experiences.find(
                (item) => item.userId === member.userId
              );
              const canConfirm =
                experience?.verificationStatus === 'pending' &&
                member.userId === CURRENT_USER_ID;
              const canRemove =
                canManageTeam && member.status === 'active';

              return (
                <View key={member.id} style={styles.card}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {member.profile.firstName.charAt(0)}
                      {member.profile.lastName.charAt(0)}
                    </Text>
                  </View>

                  <View style={styles.flex}>
                    <Text style={styles.name}>
                      {member.profile.firstName}{' '}
                      {member.profile.lastName}
                    </Text>
                    <Text style={styles.role}>{member.roleTitle}</Text>
                    <Text style={styles.meta}>
                      {member.status === 'active'
                        ? 'Membro attivo'
                        : member.status === 'completed'
                          ? 'Partecipazione completata'
                          : member.status === 'removed'
                            ? 'Rimosso dal progetto'
                            : 'Partecipazione chiusa'}
                    </Text>

                    {experience ? (
                      <Text style={styles.verification}>
                        {experience.verificationStatus === 'verified'
                          ? 'Esperienza verificata ✓'
                          : 'Conferma partecipante in attesa'}
                      </Text>
                    ) : null}

                    <TouchableOpacity
                      style={styles.profileButton}
                      onPress={() =>
                        navigation.navigate('PublicProfile', {
                          userId: member.userId,
                        })
                      }
                    >
                      <Ionicons
                        name="person-outline"
                        size={14}
                        color={colors.primary}
                      />
                      <Text style={styles.profileText}>Apri profilo</Text>
                    </TouchableOpacity>

                    {canConfirm ? (
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={() => void confirm(experience)}
                      >
                        <Text style={styles.confirmText}>
                          Conferma esperienza
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {canRemove ? (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeMember(member)}
                      >
                        <Ionicons
                          name="person-remove-outline"
                          size={14}
                          color={colors.error}
                        />
                        <Text style={styles.removeText}>
                          Rimuovi dal progetto
                        </Text>
                      </TouchableOpacity>
                    ) : null}
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

const makeStyles = (c: ColorPalette, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
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
    back: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.actionSurface,
    },
    spacer: { width: 42 },
    headerCopy: { flex: 1, alignItems: 'center' },
    headerTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: c.textStrong,
    },
    headerSub: { fontSize: 11, color: c.gray },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      padding: 20,
      gap: 14,
      paddingBottom: 30 + bottom,
    },
    sectionTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: c.textStrong,
    },
    ownerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    avatar: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: c.primary, fontWeight: '900' },
    flex: { flex: 1, gap: 2 },
    name: {
      fontSize: 15,
      fontWeight: '900',
      color: c.textStrong,
    },
    role: {
      fontSize: 12,
      fontWeight: '800',
      color: c.primary,
    },
    meta: { fontSize: 11, color: c.gray },
    verification: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 3,
    },
    badge: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
    },
    profileButton: {
      alignSelf: 'flex-start',
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 9,
      backgroundColor: c.actionSurface,
    },
    profileText: {
      fontSize: 11,
      fontWeight: '900',
      color: c.primary,
    },
    confirmButton: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 9,
      backgroundColor: c.primary,
    },
    confirmText: {
      fontSize: 11,
      fontWeight: '900',
      color: c.white,
    },
    removeButton: {
      alignSelf: 'flex-start',
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      backgroundColor: c.dangerSoft,
    },
    removeText: {
      fontSize: 11,
      fontWeight: '900',
      color: c.error,
    },
    empty: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
      padding: 20,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '900',
      color: c.textStrong,
    },
    emptyText: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: 'center',
    },
  });
