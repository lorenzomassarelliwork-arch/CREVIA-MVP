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

import type { RootStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import {
  acceptApplication,
  listApplicationsForProject,
  rejectApplication,
  type ApplicationWithApplicant,
} from '../services/applicationService';
import { getProjectDetail } from '../../projects/services/projectService';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectApplications'>;

export default function ProjectApplicationsScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top, insets.bottom), [colors, insets.bottom, insets.top]);
  const [applications, setApplications] = useState<ApplicationWithApplicant[]>([]);
  const [projectTitle, setProjectTitle] = useState('Progetto');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [items, project] = await Promise.all([
      listApplicationsForProject(route.params.projectId),
      getProjectDetail(route.params.projectId),
    ]);
    setApplications(items);
    setProjectTitle(project?.project.title ?? 'Progetto');
    setLoading(false);
  }, [route.params.projectId]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const accept = async (application: ApplicationWithApplicant) => {
    setActionLoading(application.id);
    try {
      await acceptApplication(application.id);
      await loadData();
      Alert.alert('Candidatura accettata', `${application.applicant.firstName} è ora membro del progetto.`);
    } catch (error) {
      Alert.alert('Operazione non riuscita', error instanceof Error ? error.message : 'Errore imprevisto.');
    } finally {
      setActionLoading(null);
    }
  };

  const reject = (application: ApplicationWithApplicant) => {
    Alert.alert(
      'Rifiutare la candidatura?',
      `La candidatura di ${application.applicant.firstName} verrà rifiutata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rifiuta',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(application.id);
            try {
              await rejectApplication(application.id);
              await loadData();
            } catch (error) {
              Alert.alert('Operazione non riuscita', error instanceof Error ? error.message : 'Errore imprevisto.');
            } finally {
              setActionLoading(null);
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
          <Text style={styles.headerTitle}>Candidature</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{projectTitle}</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {applications.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="people-outline" size={28} color={colors.gray} />
              <Text style={styles.emptyTitle}>Nessuna candidatura</Text>
              <Text style={styles.emptyText}>Quando qualcuno si candiderà a un ruolo, lo vedrai qui.</Text>
            </View>
          ) : (
            applications.map((application) => {
              const disabled = actionLoading === application.id;
              return (
                <View key={application.id} style={styles.card}>
                  <View style={styles.personRow}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{application.applicant.firstName.charAt(0)}{application.applicant.lastName.charAt(0)}</Text>
                    </View>
                    <View style={styles.personCopy}>
                      <Text style={styles.name}>{application.applicant.firstName} {application.applicant.lastName}</Text>
                      <Text style={styles.headline}>{application.applicant.headline ?? 'Builder'}</Text>
                      <Text style={styles.city}>{application.applicant.city ?? 'Località non indicata'}</Text>
                    </View>
                    <StatusBadge status={application.status} colors={colors} styles={styles} />
                  </View>

                  <View style={styles.roleBox}>
                    <Text style={styles.roleLabel}>Candidatura per</Text>
                    <Text style={styles.roleTitle}>{application.roleTitle}</Text>
                  </View>

                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Motivazione</Text>
                    <Text style={styles.body}>{application.motivation}</Text>
                  </View>

                  <View style={styles.skillsRow}>
                    {application.applicant.skills.slice(0, 4).map((skill) => (
                      <View key={skill} style={styles.skillChip}><Text style={styles.skillText}>{skill}</Text></View>
                    ))}
                  </View>

                  {application.portfolioUrl ? (
                    <View style={styles.portfolioRow}>
                      <Ionicons name="link-outline" size={16} color={colors.primary} />
                      <Text numberOfLines={1} style={styles.portfolioText}>{application.portfolioUrl}</Text>
                    </View>
                  ) : null}

                  {application.status === 'pending' ? (
                    <View style={styles.actions}>
                      <TouchableOpacity disabled={disabled} style={styles.rejectButton} onPress={() => reject(application)}>
                        <Text style={styles.rejectText}>Rifiuta</Text>
                      </TouchableOpacity>
                      <TouchableOpacity disabled={disabled} style={styles.acceptButton} onPress={() => void accept(application)}>
                        {disabled ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.acceptText}>Accetta</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

type StatusBadgeProps = {
  status: ApplicationWithApplicant['status'];
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
};

function StatusBadge({ status, colors, styles }: StatusBadgeProps) {
  const label = status === 'pending' ? 'In attesa' : status === 'accepted' ? 'Accettata' : status === 'rejected' ? 'Rifiutata' : 'Ritirata';
  const icon = status === 'accepted' ? 'checkmark-circle' : status === 'rejected' ? 'close-circle' : 'time-outline';
  return (
    <View style={styles.statusBadge}>
      <Ionicons name={icon} size={14} color={status === 'accepted' ? colors.confirm : status === 'rejected' ? colors.error : colors.gray} />
      <Text style={styles.statusText}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ColorPalette, topInset: number, bottomInset: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: Math.max(topInset, 24) + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.actionSurface },
  headerSpacer: { width: 42 },
  headerCopy: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  headerTitle: { color: colors.textStrong, fontSize: 16, fontWeight: '900' },
  headerSubtitle: { color: colors.gray, fontSize: 11, marginTop: 2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, gap: 14, paddingBottom: 30 + bottomInset },
  emptyCard: { minHeight: 220, borderRadius: 16, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyTitle: { color: colors.textStrong, fontSize: 17, fontWeight: '900' },
  emptyText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  card: { borderRadius: 16, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 14 },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primary, fontSize: 15, fontWeight: '900' },
  personCopy: { flex: 1, gap: 2 },
  name: { color: colors.textStrong, fontSize: 15, fontWeight: '900' },
  headline: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  city: { color: colors.gray, fontSize: 11 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.actionSurface },
  statusText: { color: colors.textMuted, fontSize: 10, fontWeight: '700' },
  roleBox: { borderRadius: 12, backgroundColor: colors.primarySoft, padding: 12, gap: 3 },
  roleLabel: { color: colors.gray, fontSize: 10, fontWeight: '700' },
  roleTitle: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  section: { gap: 5 },
  sectionLabel: { color: colors.textStrong, fontSize: 12, fontWeight: '800' },
  body: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  skillChip: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.actionSurface },
  skillText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  portfolioRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  portfolioText: { flex: 1, color: colors.primary, fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  rejectButton: { flex: 1, borderRadius: 11, borderWidth: 1, borderColor: colors.dangerBorder, backgroundColor: colors.dangerSoft, paddingVertical: 12, alignItems: 'center' },
  rejectText: { color: colors.error, fontSize: 13, fontWeight: '900' },
  acceptButton: { flex: 1, borderRadius: 11, backgroundColor: colors.primary, paddingVertical: 12, alignItems: 'center' },
  acceptText: { color: colors.white, fontSize: 13, fontWeight: '900' },
});
