import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
import { createApplication } from '../services/applicationService';
import { getProjectDetail, type ProjectDetailData } from '../../projects/services/projectService';

type Props = NativeStackScreenProps<RootStackParamList, 'ApplyToProject'>;

export default function ApplyToProjectScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors, insets.top, insets.bottom), [colors, insets.bottom, insets.top]);
  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [motivation, setMotivation] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getProjectDetail(route.params.projectId).then(setData);
  }, [route.params.projectId]);

  const role = data?.roles.find((item) => item.id === route.params.roleId) ?? null;

  const submit = async () => {
    if (!data || !role) {
      Alert.alert('Candidatura non disponibile', 'Il progetto o il ruolo non sono più disponibili.');
      return;
    }

    if (data.project.ownerId === CURRENT_USER_ID) {
      Alert.alert('Operazione non consentita', 'Non puoi candidarti a un progetto di cui sei il creatore.');
      return;
    }

    if (motivation.trim().length < 20) {
      Alert.alert('Motivazione troppo breve', 'Scrivi almeno qualche riga per spiegare perché vuoi partecipare.');
      return;
    }

    setSubmitting(true);
    try {
      await createApplication({
        projectId: data.project.id,
        roleId: role.id,
        roleTitle: role.title,
        applicantId: CURRENT_USER_ID,
        motivation,
        portfolioUrl,
      });
      Alert.alert(
        'Candidatura inviata',
        'Il responsabile del progetto potrà ora valutarla.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Candidatura non inviata', error instanceof Error ? error.message : 'Errore imprevisto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Candidatura</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.summaryCard}>
          <Text style={styles.projectName}>{data?.project.title ?? 'Progetto'}</Text>
          <Text style={styles.roleName}>{role?.title ?? 'Ruolo'}</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Perché vuoi partecipare?</Text>
          <Text style={styles.help}>Spiega cosa ti interessa del progetto e come pensi di poter contribuire.</Text>
          <TextInput
            value={motivation}
            onChangeText={setMotivation}
            multiline
            maxLength={1200}
            placeholder="Racconta brevemente la tua motivazione..."
            placeholderTextColor={colors.gray}
            style={[styles.input, styles.textArea]}
            textAlignVertical="top"
          />
          <Text style={styles.counter}>{motivation.length}/1200</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Link da mostrare <Text style={styles.optional}>(opzionale)</Text></Text>
          <Text style={styles.help}>Portfolio, GitHub, Behance, LinkedIn o sito personale.</Text>
          <TextInput
            value={portfolioUrl}
            onChangeText={setPortfolioUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://..."
            placeholderTextColor={colors.gray}
            style={styles.input}
          />
        </View>

        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <Text style={styles.noticeText}>Il tuo profilo Crevia accompagnerà la candidatura. Non serve compilare un CV separato.</Text>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={() => void submit()} activeOpacity={0.8} disabled={submitting}>
          {submitting ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.submitText}>Invia candidatura</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ColorPalette, topInset: number, bottomInset: number) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: Math.max(topInset, 24) + 8, paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerButton: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.actionSurface },
  headerSpacer: { width: 42 },
  headerTitle: { color: colors.textStrong, fontSize: 16, fontWeight: '800' },
  content: { padding: 20, gap: 22, paddingBottom: 30 + bottomInset },
  summaryCard: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, padding: 16, gap: 4 },
  projectName: { color: colors.textStrong, fontSize: 18, fontWeight: '900' },
  roleName: { color: colors.primary, fontSize: 14, fontWeight: '800' },
  fieldGroup: { gap: 8 },
  label: { color: colors.textStrong, fontSize: 15, fontWeight: '800' },
  optional: { color: colors.gray, fontWeight: '600' },
  help: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, color: colors.textStrong, fontSize: 14 },
  textArea: { minHeight: 150 },
  counter: { alignSelf: 'flex-end', color: colors.gray, fontSize: 11 },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.primarySoft, borderRadius: 12, padding: 14 },
  noticeText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  submitButton: { minHeight: 50, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: colors.white, fontSize: 15, fontWeight: '900' },
});
