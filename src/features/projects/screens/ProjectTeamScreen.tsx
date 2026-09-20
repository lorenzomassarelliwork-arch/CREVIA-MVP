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
import type { UserProfile, VerifiedExperience } from '../../../domain/models';
import type { RootStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import {
  listProjectMembersWithProfiles,
  removeProjectMember,
  type ProjectMemberWithProfile,
} from '../../applications/services/applicationService';
import {
  getOrCreateDirectChat,
  getOrCreateProjectChat,
} from '../../chat/services/chatService';
import {
  confirmExperience,
  listExperiencesForProject,
} from '../../experience/services/experienceService';
import {
  getProfile,
  getProfileDisplayName,
} from '../../profile/services/profileService';
import {
  addProjectAdmin,
  listProjectAdmins,
  removeProjectAdmin,
} from '../services/projectAdminService';
import {
  getOwnerLabel,
  getProjectDetail,
} from '../services/projectService';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectTeam'>;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ProjectTeamScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );

  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]);
  const [experiences, setExperiences] = useState<VerifiedExperience[]>([]);
  const [adminIds, setAdminIds] = useState<string[]>([]);
  const [title, setTitle] = useState('Team');
  const [ownerLabel, setOwnerLabel] = useState('Creator Crevia');
  const [ownerProfileId, setOwnerProfileId] = useState<string | null>(null);
  const [canManageTeam, setCanManageTeam] = useState(false);
  const [canManageAdmins, setCanManageAdmins] = useState(false);
  const [canAccessProjectChat, setCanAccessProjectChat] = useState(false);
  const [chatLoading, setChatLoading] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projectMembers, detail, projectExperiences, admins] =
        await Promise.all([
          listProjectMembersWithProfiles(route.params.projectId),
          getProjectDetail(route.params.projectId),
          listExperiencesForProject(route.params.projectId),
          listProjectAdmins(route.params.projectId),
        ]);

      let creatorProfile: UserProfile | null = null;
      if (
        detail &&
        (detail.project.ownerId === CURRENT_USER_ID ||
          UUID_PATTERN.test(detail.project.ownerId))
      ) {
        try {
          creatorProfile = await getProfile(detail.project.ownerId);
        } catch {
          creatorProfile = null;
        }
      }

      setMembers(projectMembers);
      setExperiences(projectExperiences);
      setAdminIds(admins.map((admin) => admin.userId));
      setTitle(detail?.project.title ?? 'Team');
      setOwnerProfileId(
        creatorProfile && detail ? detail.project.ownerId : null
      );
      setOwnerLabel(
        creatorProfile
          ? getProfileDisplayName(creatorProfile)
          : detail
            ? getOwnerLabel(detail.project)
            : 'Creator Crevia'
      );

      const projectOpen =
        detail?.project.status === 'recruiting' ||
        detail?.project.status === 'active';

      setCanManageTeam(Boolean(detail?.canManage && projectOpen));
      setCanManageAdmins(Boolean(detail?.isPrimaryOwner && projectOpen));
      setCanAccessProjectChat(
        Boolean(
          detail &&
            (detail.canManage ||
              projectMembers.some(
                (member) =>
                  member.userId === CURRENT_USER_ID &&
                  (member.status === 'active' || member.status === 'completed')
              ))
        )
      );
    } finally {
      setLoading(false);
    }
  }, [route.params.projectId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openProjectChat = async () => {
    setChatLoading('project');
    try {
      const conversationId = await getOrCreateProjectChat(route.params.projectId);
      navigation.navigate('ChatRoom', { conversationId });
    } catch (error) {
      Alert.alert(
        'Chat non disponibile',
        error instanceof Error ? error.message : 'Errore imprevisto.'
      );
    } finally {
      setChatLoading(null);
    }
  };

  const openDirectChat = async (userId: string) => {
    setChatLoading(userId);
    try {
      const conversationId = await getOrCreateDirectChat(
        userId,
        route.params.projectId
      );
      navigation.navigate('ChatRoom', { conversationId });
    } catch (error) {
      Alert.alert(
        'Chat non disponibile',
        error instanceof Error ? error.message : 'Errore imprevisto.'
      );
    } finally {
      setChatLoading(null);
    }
  };

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

  const toggleAdmin = (member: ProjectMemberWithProfile, isAdmin: boolean) => {
    const name = `${member.profile.firstName} ${member.profile.lastName}`;
    Alert.alert(
      isAdmin ? 'Rimuovere il co-founder?' : 'Nominare co-founder?',
      isAdmin
        ? `${name} perderà i permessi di gestione del progetto.`
        : `${name} potrà gestire candidature, team, ruoli, chat e completamento del progetto.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: isAdmin ? 'Rimuovi ruolo' : 'Nomina',
          style: isAdmin ? 'destructive' : 'default',
          onPress: async () => {
            setAdminLoading(member.userId);
            try {
              if (isAdmin) {
                await removeProjectAdmin(route.params.projectId, member.userId);
              } else {
                await addProjectAdmin(route.params.projectId, member.userId);
              }
              await load();
            } catch (error) {
              Alert.alert(
                'Operazione non riuscita',
                error instanceof Error ? error.message : 'Errore imprevisto.'
              );
            } finally {
              setAdminLoading(null);
            }
          },
        },
      ]
    );
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
                'Il partecipante non fa più parte del team e il posto nel ruolo è nuovamente disponibile.'
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
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Team</Text>
          <Text style={styles.headerSub}>{title}</Text>
        </View>
        {canAccessProjectChat ? (
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => void openProjectChat()}
            disabled={chatLoading === 'project'}
          >
            {chatLoading === 'project' ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
            )}
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
        <ScrollView contentContainerStyle={styles.content}>
          {canAccessProjectChat ? (
            <TouchableOpacity
              style={styles.projectChatCard}
              onPress={() => void openProjectChat()}
            >
              <View style={styles.projectChatIcon}>
                <Ionicons name="people-outline" size={21} color={colors.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.projectChatTitle}>Chat progetto</Text>
                <Text style={styles.projectChatText}>
                  Un unico spazio per founder, co-founder e partecipanti.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.gray} />
            </TouchableOpacity>
          ) : null}

          <View style={styles.card}>
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
              <Text style={styles.role}>Founder principale</Text>
              {ownerProfileId ? (
                <View style={styles.inlineActions}>
                  <TouchableOpacity
                    style={styles.smallButton}
                    onPress={() =>
                      navigation.navigate('PublicProfile', { userId: ownerProfileId })
                    }
                  >
                    <Text style={styles.smallButtonText}>Apri profilo</Text>
                  </TouchableOpacity>
                  {ownerProfileId !== CURRENT_USER_ID ? (
                    <TouchableOpacity
                      style={styles.smallButton}
                      onPress={() => void openDirectChat(ownerProfileId)}
                      disabled={chatLoading === ownerProfileId}
                    >
                      <Text style={styles.smallButtonText}>Messaggio</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Founder</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Membri</Text>

          {members.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={28} color={colors.gray} />
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
              const isAdmin = adminIds.includes(member.userId);
              const canConfirm =
                experience?.verificationStatus === 'pending' &&
                member.userId === CURRENT_USER_ID;
              const canRemove =
                canManageTeam &&
                member.status === 'active' &&
                member.userId !== CURRENT_USER_ID;
              const canMessage =
                member.userId !== CURRENT_USER_ID &&
                (member.status === 'active' || member.status === 'completed');
              const canToggleAdmin =
                canManageAdmins &&
                member.status === 'active' &&
                member.userId !== CURRENT_USER_ID;

              return (
                <View key={member.id} style={styles.card}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {member.profile.firstName.charAt(0)}
                      {member.profile.lastName.charAt(0)}
                    </Text>
                  </View>

                  <View style={styles.flex}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name}>
                        {member.profile.firstName} {member.profile.lastName}
                      </Text>
                      {isAdmin ? (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>Co-founder</Text>
                        </View>
                      ) : null}
                    </View>
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

                    <View style={styles.inlineActions}>
                      <TouchableOpacity
                        style={styles.smallButton}
                        onPress={() =>
                          navigation.navigate('PublicProfile', {
                            userId: member.userId,
                          })
                        }
                      >
                        <Text style={styles.smallButtonText}>Profilo</Text>
                      </TouchableOpacity>

                      {canMessage ? (
                        <TouchableOpacity
                          style={styles.smallButton}
                          onPress={() => void openDirectChat(member.userId)}
                          disabled={chatLoading === member.userId}
                        >
                          <Text style={styles.smallButtonText}>Messaggio</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {canToggleAdmin ? (
                      <TouchableOpacity
                        style={isAdmin ? styles.demoteButton : styles.promoteButton}
                        onPress={() => toggleAdmin(member, isAdmin)}
                        disabled={adminLoading === member.userId}
                      >
                        {adminLoading === member.userId ? (
                          <ActivityIndicator size="small" color={colors.primary} />
                        ) : (
                          <>
                            <Ionicons
                              name={isAdmin ? 'shield-outline' : 'shield-checkmark-outline'}
                              size={14}
                              color={isAdmin ? colors.error : colors.primary}
                            />
                            <Text style={isAdmin ? styles.demoteText : styles.promoteText}>
                              {isAdmin ? 'Rimuovi co-founder' : 'Nomina co-founder'}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    ) : null}

                    {canConfirm ? (
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={() => void confirm(experience)}
                      >
                        <Text style={styles.confirmText}>Conferma esperienza</Text>
                      </TouchableOpacity>
                    ) : null}

                    {canRemove ? (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeMember(member)}
                      >
                        <Ionicons name="person-remove-outline" size={14} color={colors.error} />
                        <Text style={styles.removeText}>Rimuovi dal progetto</Text>
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
    headerButton: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.actionSurface,
    },
    headerCopy: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '900', color: c.textStrong },
    headerSub: { fontSize: 11, color: c.gray },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, gap: 14, paddingBottom: 30 + bottom },
    projectChatCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
      borderRadius: 16,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.border,
    },
    projectChatIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.cardBackground,
    },
    projectChatTitle: { fontSize: 14, fontWeight: '900', color: c.textStrong },
    projectChatText: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    sectionTitle: { fontSize: 19, fontWeight: '900', color: c.textStrong },
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
    flex: { flex: 1, gap: 3 },
    nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
    name: { fontSize: 15, fontWeight: '900', color: c.textStrong },
    role: { fontSize: 12, fontWeight: '800', color: c.primary },
    meta: { fontSize: 11, color: c.gray },
    verification: { fontSize: 11, color: c.textMuted, marginTop: 3 },
    badge: {
      paddingHorizontal: 9,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    badgeText: { fontSize: 10, fontWeight: '800', color: c.primary },
    inlineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    smallButton: {
      alignSelf: 'flex-start',
      marginTop: 7,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 9,
      backgroundColor: c.actionSurface,
    },
    smallButtonText: { fontSize: 11, fontWeight: '900', color: c.primary },
    promoteButton: {
      alignSelf: 'flex-start',
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 9,
      backgroundColor: c.primarySoft,
    },
    promoteText: { fontSize: 11, fontWeight: '900', color: c.primary },
    demoteButton: {
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
    demoteText: { fontSize: 11, fontWeight: '900', color: c.error },
    confirmButton: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 9,
      backgroundColor: c.primary,
    },
    confirmText: { fontSize: 11, fontWeight: '900', color: c.white },
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
    removeText: { fontSize: 11, fontWeight: '900', color: c.error },
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
    emptyTitle: { fontSize: 16, fontWeight: '900', color: c.textStrong },
    emptyText: { fontSize: 12, lineHeight: 18, color: c.textMuted, textAlign: 'center' },
  });
