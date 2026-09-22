import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  submitContentReport,
  type ReportReason,
} from '../services/safetyService';

type Props = NativeStackScreenProps<RootStackParamList, 'ReportContent'>;

const REASONS: Array<{ value: ReportReason; label: string; description: string }> = [
  { value: 'spam', label: 'Spam', description: 'Pubblicità, messaggi ripetitivi o contenuti indesiderati.' },
  { value: 'harassment', label: 'Molestie o minacce', description: 'Comportamenti intimidatori, insistenti o aggressivi.' },
  { value: 'hate_abusive', label: 'Contenuto offensivo', description: 'Insulti, discriminazione o linguaggio gravemente offensivo.' },
  { value: 'inappropriate', label: 'Contenuto inappropriato', description: 'Contenuti non adatti alla piattaforma o al contesto professionale.' },
  { value: 'scam', label: 'Truffa o comportamento sospetto', description: 'Tentativi di frode, richieste sospette o informazioni ingannevoli.' },
  { value: 'privacy', label: 'Privacy o dati personali', description: 'Condivisione impropria di dati personali o informazioni riservate.' },
  { value: 'other', label: 'Altro', description: 'Un problema diverso da quelli indicati sopra.' },
];

export default function ReportContentScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const targetLabel =
    route.params.targetType === 'user'
      ? 'utente'
      : route.params.targetType === 'project'
        ? 'progetto'
        : 'messaggio';

  const submit = async () => {
    if (!reason || submitting) return;

    setSubmitting(true);
    try {
      await submitContentReport(
        route.params.targetType,
        route.params.targetId,
        reason,
        notes
      );

      Alert.alert(
        'Segnalazione inviata',
        'Crevia ha registrato la segnalazione e potrà valutarla in moderazione.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Segnalazione non inviata',
        error instanceof Error ? error.message : 'Errore imprevisto.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Segnala {targetLabel}</Text>
          <Text style={styles.headerSub}>La segnalazione viene inviata a Crevia</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Qual è il problema?</Text>
        <Text style={styles.subtitle}>
          Seleziona il motivo più adatto. Puoi aggiungere dettagli facoltativi prima dell’invio.
        </Text>

        <View style={styles.reasonList}>
          {REASONS.map((item) => {
            const selected = reason === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.reasonCard, selected && styles.reasonCardSelected]}
                onPress={() => setReason(item.value)}
                activeOpacity={0.78}
              >
                <View style={[styles.radio, selected && styles.radioSelected]}>
                  {selected ? <View style={styles.radioDot} /> : null}
                </View>
                <View style={styles.flex}>
                  <Text style={styles.reasonTitle}>{item.label}</Text>
                  <Text style={styles.reasonDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.notesCard}>
          <Text style={styles.notesTitle}>Note facoltative</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={2000}
            textAlignVertical="top"
            placeholder="Aggiungi dettagli che possono aiutare Crevia a capire l’accaduto..."
            placeholderTextColor={colors.gray}
            style={styles.input}
          />
          <Text style={styles.counter}>{notes.length}/2000</Text>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, (!reason || submitting) && styles.disabled]}
          onPress={() => void submit()}
          disabled={!reason || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="flag-outline" size={18} color={colors.white} />
              <Text style={styles.submitText}>Invia segnalazione</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
      gap: 12,
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
    headerSub: { marginTop: 2, fontSize: 11, color: c.gray },
    content: { padding: 20, gap: 15, paddingBottom: 30 + bottom },
    title: { fontSize: 22, fontWeight: '900', color: c.textStrong },
    subtitle: { fontSize: 13, lineHeight: 20, color: c.textMuted },
    reasonList: { gap: 9 },
    reasonCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 11,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    reasonCardSelected: { borderColor: c.primary, backgroundColor: c.primarySoft },
    radio: {
      marginTop: 2,
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: { borderColor: c.primary },
    radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary },
    flex: { flex: 1 },
    reasonTitle: { fontSize: 14, fontWeight: '900', color: c.textStrong },
    reasonDescription: { marginTop: 3, fontSize: 11, lineHeight: 17, color: c.textMuted },
    notesCard: {
      gap: 8,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
    },
    notesTitle: { fontSize: 13, fontWeight: '900', color: c.textStrong },
    input: {
      minHeight: 130,
      borderRadius: 11,
      padding: 12,
      backgroundColor: c.actionSurface,
      color: c.textStrong,
      fontSize: 14,
      lineHeight: 20,
    },
    counter: { alignSelf: 'flex-end', fontSize: 10, color: c.gray },
    submitButton: {
      minHeight: 48,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.error,
    },
    submitText: { color: c.white, fontSize: 14, fontWeight: '900' },
    disabled: { opacity: 0.45 },
  });
