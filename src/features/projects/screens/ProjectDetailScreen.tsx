import { useEffect, useMemo, useState } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import { CURRENT_USER_ID } from '../../../core/session';
import type { ProjectRole } from '../../../domain/models';
import {
  getCompensationLabel,
  getLocationLabel,
  getProjectDetail,
  type ProjectDetailData,
} from '../services/projectService';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectDetail'>;

export default function ProjectDetailScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top, insets.bottom), [colors, insets.bottom, insets.top]);
  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void getProjectDetail(route.params.projectId).then((result) => {
      if (!active) return;
      setData(result);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [route.params.projectId]);

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (!data) {
    return (
      <View style={styles.loading}>
        <Text style={styles.notFound}>Progetto non disponibile.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}><Text style={styles.backLink}>Torna indietro</Text></TouchableOpacity>
      </View>
    );
  }

  const { project, roles } = data;
  const isOwner = project.ownerId === CURRENT_USER_ID;

  const applyForRole = (role: ProjectRole) => {
    navigation.navigate('ApplyToProject', { projectId: project.id, roleId: role.id });
  };

  const reportProject = () => {
    Alert.alert('Segnala progetto', 'La gestione delle segnalazioni verrà collegata al backend nella fase dedicata.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progetto</Text>
        <TouchableOpacity style={styles.headerButton} onPress={reportProject}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.textStrong} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.categoryChip}><Text style={styles.categoryText}>{project.category}</Text></View>
          <Text style={styles.title}>{project.title}</Text>
          <Text style={styles.description}>{project.description}</Text>
        </View>

        {isOwner ? (
          <TouchableOpacity
            style={styles.ownerPanel}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('ProjectApplications', { projectId: project.id })}
          >
            <View style={styles.ownerPanelIcon}>
              <Ionicons name="people-outline" size={21} color={colors.primary} />
            </View>
            <View style={styles.ownerPanelCopy}>
              <Text style={styles.ownerPanelTitle}>Gestisci candidature</Text>
              <Text style={styles.ownerPanelSubtitle}>Valuta i candidati e costruisci il team del progetto.</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={colors.gray} />
          </TouchableOpacity>
        ) : null}

        <View style={styles.infoGrid}>
          <InfoItem icon="location-outline" label="Modalità" value={getLocationLabel(project)} colors={colors} styles={styles} />
          <InfoItem icon="time-outline" label="Durata" value={project.expectedDuration ?? 'Da definire'} colors={colors} styles={styles} />
          <InfoItem icon="calendar-outline" label="Impegno" value={project.weeklyCommitmentHours ? `${project.weeklyCommitmentHours} h/settimana` : 'Da definire'} colors={colors} styles={styles} />
          <InfoItem icon="cash-outline" label="Condizioni" value={getCompensationLabel(project)} colors={colors} styles={styles} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Obiettivo</Text>
          <Text style={styles.bodyText}>{project.goal}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condizioni economiche</Text>
          <View style={styles.noticeCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={styles.noticeText}>{project.compensationNotes ?? getCompensationLabel(project)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ruoli aperti</Text>
          <Text style={styles.sectionSubtitle}>
            {isOwner ? 'Questi sono i ruoli per cui stai cercando collaboratori.' : 'La candidatura avviene per un ruolo specifico.'}
          </Text>
          <View style={styles.rolesList}>
            {roles.map((role) => (
              <View key={role.id} style={styles.roleCard}>
                <View style={styles.roleTopRow}>
                  <View style={styles.roleCopy}>
                    <Text style={styles.roleTitle}>{role.title}</Text>
                    <Text style={styles.roleSeats}>{role.seats} {role.seats === 1 ? 'posto' : 'posti'}</Text>
                  </View>
                  {!isOwner ? (
                    <TouchableOpacity style={styles.applyButton} onPress={() => applyForRole(role)}>
                      <Text style={styles.applyButtonText}>Candidati</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={styles.roleDescription}>{role.description}</Text>
                <View style={styles.skillsRow}>
                  {role.requiredSkills.map((skill) => (
                    <View key={skill} style={styles.skillChip}><Text style={styles.skillText}>{skill}</Text></View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

type InfoItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: ColorPalette;
  styles: ReturnType<typeof createStyles>;
};

function InfoItem({ icon, label, value, colors, styles }: InfoItemProps) {
  return (
    <View style={styles.infoCard}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: ColorPalette, topInset: number, bottomInset: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background },
  notFound: { color: colors.textStrong, fontSize: 16, fontWeight: '700' },
  backLink: { color: colors.primary, fontWeight: '700' },
  header: { paddingTop: Math.max(topInset, 24) + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.actionSurface },
  headerTitle: { color: colors.textStrong, fontSize: 16, fontWeight: '800' },
  content: { padding: 20, gap: 22, paddingBottom: 30 + bottomInset },
  hero: { gap: 10 },
  categoryChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.primarySoft },
  categoryText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  title: { color: colors.textStrong, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  description: { color: colors.textMuted, fontSize: 15, lineHeight: 23 },
  ownerPanel: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, padding: 15 },
  ownerPanelIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  ownerPanelCopy: { flex: 1, gap: 3 },
  ownerPanelTitle: { color: colors.textStrong, fontSize: 14, fontWeight: '900' },
  ownerPanelSubtitle: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCard: { width: '48%', minHeight: 104, borderRadius: 14, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, padding: 14, gap: 5 },
  infoLabel: { color: colors.gray, fontSize: 11, fontWeight: '700' },
  infoValue: { color: colors.textStrong, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  section: { gap: 10 },
  sectionTitle: { color: colors.textStrong, fontSize: 19, fontWeight: '900' },
  sectionSubtitle: { color: colors.gray, fontSize: 13 },
  bodyText: { color: colors.textMuted, fontSize: 15, lineHeight: 23 },
  noticeCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, padding: 14 },
  noticeText: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  rolesList: { gap: 12 },
  roleCard: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, padding: 16, gap: 12 },
  roleTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  roleCopy: { flex: 1, gap: 2 },
  roleTitle: { color: colors.textStrong, fontSize: 16, fontWeight: '900' },
  roleSeats: { color: colors.gray, fontSize: 12, fontWeight: '600' },
  roleDescription: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  applyButton: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  applyButtonText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillChip: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.actionSurface },
  skillText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
});
