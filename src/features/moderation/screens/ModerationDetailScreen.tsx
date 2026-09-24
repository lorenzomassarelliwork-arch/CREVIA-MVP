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
  getModerationDetail,
  setModerationStatus,
  type ModerationDetail,
  type ModerationStatus,
} from '../services/moderationService';

type Props = NativeStackScreenProps<RootStackParamList, 'ModerationDetail'>;

export default function ModerationDetailScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );
  const [item, setItem] = useState<ModerationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItem(await getModerationDetail(route.params.kind, route.params.id));
    } finally {
      setLoading(false);
    }
  }, [route.params.id, route.params.kind]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const changeStatus = async (status: ModerationStatus) => {
    if (!item) return;
    setUpdating(true);
    try {
      await setModerationStatus(item.kind, item.id, status);
      await load();
    } catch (error) {
      Alert.alert(
        'Aggiornamento non riuscito',
        error instanceof Error ? error.message : 'Errore imprevisto.'
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dettaglio moderazione</Text>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : !item ? (
        <View style={styles.loading}>
          <Text style={styles.emptyText}>Caso non disponibile.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.statusText}>Stato: {item.status.toUpperCase()}</Text>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('it-IT')}</Text>
          </View>

          <Info label="Motivo" value={item.reason} styles={styles} />
          <Info label="Segnalato da" value={item.reporterName ?? 'Non disponibile'} styles={styles} />
          {item.reportedUserName ? (
            <Info label="Utente segnalato" value={item.reportedUserName} styles={styles} />
          ) : null}
          {item.projectTitle ? (
            <Info label="Progetto" value={item.projectTitle} styles={styles} />
          ) : null}
          {item.snapshot ? (
            <Info label="Contenuto acquisito" value={item.snapshot} styles={styles} />
          ) : null}
          <Info label="Note" value={item.notes?.trim() || 'Nessuna nota.'} styles={styles} />

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => void changeStatus('reviewing')}
              disabled={updating}
            >
              <Text style={styles.reviewText}>Prendi in carico</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={() => void changeStatus('resolved')}
              disabled={updating}
            >
              <Text style={styles.resolveText}>Risolvi</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={() => void changeStatus('dismissed')}
              disabled={updating}
            >
              <Text style={styles.dismissText}>Chiudi senza intervento</Text>
            </TouchableOpacity>
          </View>

          {item.kind === 'experience_exclusion' ? (
            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                La chiusura della contestazione non assegna automaticamente una Crevia Experience e non modifica il profilo del partecipante.
              </Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function Info({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const makeStyles = (c: ColorPalette, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      paddingTop: Math.max(top, 24) + 8, paddingHorizontal: 16, paddingBottom: 12,
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: c.cardBackground, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    headerButton: {
      width: 42, height: 42, borderRadius: 12, alignItems: 'center',
      justifyContent: 'center', backgroundColor: c.actionSurface,
    },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '900', color: c.textStrong },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, gap: 12, paddingBottom: 30 + bottom },
    card: {
      padding: 16, borderRadius: 16, backgroundColor: c.cardBackground,
      borderWidth: 1, borderColor: c.border,
    },
    title: { fontSize: 18, fontWeight: '900', color: c.textStrong },
    statusText: { marginTop: 6, fontSize: 11, fontWeight: '900', color: c.primary },
    date: { marginTop: 4, fontSize: 10, color: c.gray },
    infoCard: {
      padding: 14, borderRadius: 14, backgroundColor: c.cardBackground,
      borderWidth: 1, borderColor: c.border,
    },
    label: { fontSize: 11, fontWeight: '900', color: c.gray },
    value: { marginTop: 5, fontSize: 13, lineHeight: 20, color: c.textStrong },
    actions: { gap: 9 },
    reviewButton: { padding: 13, borderRadius: 11, alignItems: 'center', backgroundColor: c.primarySoft },
    reviewText: { color: c.primary, fontWeight: '900' },
    resolveButton: { padding: 13, borderRadius: 11, alignItems: 'center', backgroundColor: c.primary },
    resolveText: { color: c.white, fontWeight: '900' },
    dismissButton: {
      padding: 13, borderRadius: 11, alignItems: 'center',
      backgroundColor: c.dangerSoft, borderWidth: 1, borderColor: c.dangerBorder,
    },
    dismissText: { color: c.error, fontWeight: '900' },
    notice: { padding: 14, borderRadius: 14, backgroundColor: c.actionSurface },
    noticeText: { fontSize: 12, lineHeight: 18, color: c.textMuted },
    emptyText: { fontSize: 13, color: c.textMuted },
  });
