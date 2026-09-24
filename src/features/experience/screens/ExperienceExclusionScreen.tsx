import { useEffect, useMemo, useState } from 'react';
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
  acknowledgeExperienceExclusion,
  getExperienceExclusion,
  reportExperienceExclusion,
  type ExperienceExclusion,
} from '../services/experienceExclusionService';

type Props = NativeStackScreenProps<RootStackParamList, 'ExperienceExclusion'>;

export default function ExperienceExclusionScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );

  const [item, setItem] = useState<ExperienceExclusion | null>(null);
  const [notes, setNotes] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setItem(await getExperienceExclusion(route.params.exclusionId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [route.params.exclusionId]);

  const acknowledge = () => {
    Alert.alert(
      'Confermi?',
      'Confermi di aver preso atto che la Crevia Experience non è stata assegnata?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Ho capito',
          onPress: async () => {
            setSubmitting(true);
            try {
              await acknowledgeExperienceExclusion(route.params.exclusionId);
              await load();
            } catch (error) {
              Alert.alert(
                'Operazione non riuscita',
                error instanceof Error ? error.message : 'Errore imprevisto.'
              );
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const report = async () => {
    setSubmitting(true);
    try {
      await reportExperienceExclusion(route.params.exclusionId, notes);
      await load();
      Alert.alert(
        'Segnalazione inviata',
        'Crevia ha registrato la segnalazione. Le note inserite saranno disponibili alla moderazione.'
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
          <Text style={styles.headerTitle}>Crevia Experience</Text>
          <Text style={styles.headerSub}>Esito partecipazione</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !item ? (
        <View style={styles.loading}>
          <Text style={styles.empty}>Segnalazione non disponibile.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <View style={styles.icon}>
              <Ionicons name="ribbon-outline" size={26} color={colors.primary} />
            </View>
            <Text style={styles.title}>Experience non assegnata</Text>
            <Text style={styles.project}>{item.projectTitle}</Text>
            <Text style={styles.body}>
              Al completamento del progetto non sei stato selezionato tra i partecipanti a cui verificare la Crevia Experience.
            </Text>
          </View>

          {item.responseStatus === 'pending' ? (
            <>
              <TouchableOpacity
                style={styles.ackButton}
                onPress={acknowledge}
                disabled={submitting}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.ackText}>Ho capito</Text>
              </TouchableOpacity>

              {!showReport ? (
                <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => setShowReport(true)}
                  disabled={submitting}
                >
                  <Ionicons name="flag-outline" size={18} color={colors.error} />
                  <Text style={styles.reportText}>Segnala a Crevia</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.reportCard}>
                  <Text style={styles.reportTitle}>Segnalazione a Crevia</Text>
                  <Text style={styles.reportHint}>
                    Spiega cosa è successo, se vuoi. Le note sono facoltative.
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Aggiungi dettagli utili alla moderazione..."
                    placeholderTextColor={colors.gray}
                    multiline
                    maxLength={2000}
                    textAlignVertical="top"
                    style={styles.input}
                  />
                  <Text style={styles.counter}>{notes.length}/2000</Text>
                  <TouchableOpacity
                    style={[styles.submitReportButton, submitting && styles.disabled]}
                    onPress={() => void report()}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <Text style={styles.submitReportText}>Invia segnalazione</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <View style={styles.resultCard}>
              <Ionicons
                name={item.responseStatus === 'reported' ? 'flag-outline' : 'checkmark-circle-outline'}
                size={21}
                color={item.responseStatus === 'reported' ? colors.error : colors.confirm}
              />
              <View style={styles.flex}>
                <Text style={styles.resultTitle}>
                  {item.responseStatus === 'reported'
                    ? 'Segnalazione inviata a Crevia'
                    : 'Hai preso atto dell’esito'}
                </Text>
                {item.responseStatus === 'reported' ? (
                  <>
                    <Text style={styles.moderationStatus}>
                      Stato moderazione: {formatModerationStatus(item.moderationStatus)}
                    </Text>
                    {item.notes ? (
                      <Text style={styles.resultText}>{item.notes}</Text>
                    ) : null}
                  </>
                ) : null}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={styles.projectButton}
            onPress={() => navigation.navigate('ProjectDetail', { projectId: item.projectId })}
          >
            <Text style={styles.projectButtonText}>Apri progetto</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function formatModerationStatus(status: ExperienceExclusion['moderationStatus']) {
  return status === 'open'
    ? 'Aperta'
    : status === 'reviewing'
      ? 'In revisione'
      : status === 'resolved'
        ? 'Risolta'
        : 'Chiusa senza intervento';
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
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    empty: { fontSize: 14, color: c.textMuted },
    content: { padding: 20, gap: 14, paddingBottom: 30 + bottom },
    card: {
      alignItems: 'center',
      padding: 20,
      gap: 8,
      borderRadius: 18,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
    },
    icon: {
      width: 54,
      height: 54,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
    },
    title: { fontSize: 19, fontWeight: '900', color: c.textStrong },
    project: { fontSize: 13, fontWeight: '800', color: c.primary },
    body: { marginTop: 4, fontSize: 13, lineHeight: 20, textAlign: 'center', color: c.textMuted },
    ackButton: {
      minHeight: 48,
      borderRadius: 12,
      backgroundColor: c.primarySoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    ackText: { color: c.primary, fontSize: 13, fontWeight: '900' },
    reportButton: {
      minHeight: 48,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      backgroundColor: c.dangerSoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    reportText: { color: c.error, fontSize: 13, fontWeight: '900' },
    reportCard: {
      gap: 9,
      padding: 16,
      borderRadius: 16,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
    },
    reportTitle: { fontSize: 15, fontWeight: '900', color: c.textStrong },
    reportHint: { fontSize: 12, lineHeight: 18, color: c.textMuted },
    input: {
      minHeight: 130,
      borderRadius: 12,
      padding: 13,
      backgroundColor: c.actionSurface,
      color: c.textStrong,
      fontSize: 14,
      lineHeight: 20,
    },
    counter: { alignSelf: 'flex-end', fontSize: 10, color: c.gray },
    submitReportButton: {
      minHeight: 46,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.error,
    },
    submitReportText: { color: c.white, fontSize: 13, fontWeight: '900' },
    resultCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 15,
      borderRadius: 14,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
    },
    flex: { flex: 1 },
    resultTitle: { fontSize: 13, fontWeight: '900', color: c.textStrong },
    moderationStatus: { marginTop: 4, fontSize: 11, fontWeight: '900', color: c.primary },
    resultText: { marginTop: 4, fontSize: 12, lineHeight: 18, color: c.textMuted },
    projectButton: {
      minHeight: 46,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.actionSurface,
    },
    projectButtonText: { color: c.primary, fontSize: 13, fontWeight: '900' },
    disabled: { opacity: 0.55 },
  });
