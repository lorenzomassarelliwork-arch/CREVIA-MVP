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
import { leaveProject } from '../services/projectParticipationService';

type Props = NativeStackScreenProps<RootStackParamList, 'LeaveProject'>;

export default function LeaveProjectScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const confirmLeave = () => {
    Alert.alert(
      'Abbandonare il progetto?',
      'Dopo la conferma uscirai dal team e perderai l’accesso alla chat progetto. La motivazione, se indicata, sarà inviata agli admin del progetto.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Abbandona',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true);
            try {
              await leaveProject(route.params.projectId, reason);
              Alert.alert(
                'Progetto abbandonato',
                'La tua partecipazione è stata chiusa.',
                [
                  {
                    text: 'OK',
                    onPress: () =>
                      navigation.popTo('ProjectDetail', {
                        projectId: route.params.projectId,
                      }),
                  },
                ]
              );
            } catch (error) {
              Alert.alert(
                'Abbandono non riuscito',
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Abbandona progetto</Text>
          <Text style={styles.headerSub}>La motivazione è facoltativa</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
          <Text style={styles.noticeText}>
            Se lasci il progetto, il tuo posto nel ruolo tornerà disponibile e non riceverai automaticamente una Crevia Experience.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Motivazione</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Es. non riesco più a garantire il tempo necessario..."
            placeholderTextColor={colors.gray}
            multiline
            maxLength={1000}
            textAlignVertical="top"
            style={styles.input}
          />
          <Text style={styles.counter}>{reason.length}/1000</Text>
        </View>

        <TouchableOpacity
          style={[styles.leaveButton, submitting && styles.disabled]}
          onPress={confirmLeave}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="exit-outline" size={19} color={colors.white} />
              <Text style={styles.leaveText}>Abbandona progetto</Text>
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
    content: { padding: 20, gap: 16, paddingBottom: 30 + bottom },
    notice: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      padding: 14,
      borderRadius: 14,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.border,
    },
    noticeText: { flex: 1, fontSize: 12, lineHeight: 18, color: c.textMuted },
    card: {
      gap: 9,
      padding: 16,
      borderRadius: 16,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
    },
    label: { fontSize: 13, fontWeight: '900', color: c.textStrong },
    input: {
      minHeight: 140,
      borderRadius: 12,
      padding: 13,
      backgroundColor: c.actionSurface,
      color: c.textStrong,
      fontSize: 14,
      lineHeight: 20,
    },
    counter: { alignSelf: 'flex-end', fontSize: 10, color: c.gray },
    leaveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.error,
    },
    leaveText: { color: c.white, fontSize: 14, fontWeight: '900' },
    disabled: { opacity: 0.55 },
  });
