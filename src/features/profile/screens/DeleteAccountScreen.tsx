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
import { deleteCurrentAccount } from '../services/accountDeletionService';

type Props = NativeStackScreenProps<RootStackParamList, 'DeleteAccount'>;

export default function DeleteAccountScreen({ navigation }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canDelete =
    password.length > 0 && confirmation.trim().toUpperCase() === 'ELIMINA';

  const submit = () => {
    if (!canDelete) {
      setError('Inserisci la password e scrivi ELIMINA per confermare.');
      return;
    }

    Alert.alert(
      'Eliminare definitivamente l’account?',
      'Questa operazione è irreversibile. I dati personali verranno rimossi o anonimizzati e non potrai più accedere con questo account.',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina account',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setError('');
            try {
              await deleteCurrentAccount(password);
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : 'Eliminazione account non riuscita.'
              );
              setLoading(false);
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
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Elimina account</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={28} color={colors.error} />
          <Text style={styles.warningTitle}>Operazione irreversibile</Text>
          <Text style={styles.warningText}>
            Eliminando l’account, i tuoi dati personali vengono anonimizzati e
            l’accesso a Crevia viene rimosso definitivamente.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Cosa succede</Text>
          <Text style={styles.infoText}>
            {'• I progetti in recruiting o in corso di cui sei founder vengono annullati.\n'}
            {'• Le tue partecipazioni attive vengono chiuse.\n'}
            {'• Le candidature in attesa vengono ritirate.\n'}
            {'• Messaggi, motivazioni e altri dati personali vengono rimossi o anonimizzati.\n'}
            {'• I dati storici necessari a mantenere coerenti progetti ed Experience restano associati a “Utente eliminato”.\n'}
            {'• L’account di accesso viene eliminato.'}
          </Text>
        </View>

        <Text style={styles.label}>Password attuale</Text>
        <TextInput
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setError('');
          }}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Inserisci la password"
          placeholderTextColor={colors.gray}
          style={styles.input}
          editable={!loading}
        />

        <Text style={styles.label}>Conferma</Text>
        <Text style={styles.hint}>
          Scrivi ELIMINA per confermare.
        </Text>
        <TextInput
          value={confirmation}
          onChangeText={(value) => {
            setConfirmation(value);
            setError('');
          }}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="ELIMINA"
          placeholderTextColor={colors.gray}
          style={styles.input}
          editable={!loading}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.deleteButton,
            (!canDelete || loading) && styles.disabled,
          ]}
          onPress={submit}
          disabled={!canDelete || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color={colors.white} />
              <Text style={styles.deleteText}>Elimina definitivamente</Text>
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
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '900',
      color: c.textStrong,
    },
    content: {
      padding: 20,
      gap: 12,
      paddingBottom: 30 + bottom,
    },
    warningCard: {
      alignItems: 'center',
      gap: 8,
      padding: 18,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.dangerBorder,
      backgroundColor: c.dangerSoft,
    },
    warningTitle: {
      fontSize: 17,
      fontWeight: '900',
      color: c.error,
    },
    warningText: {
      fontSize: 12,
      lineHeight: 18,
      color: c.textMuted,
      textAlign: 'center',
    },
    infoCard: {
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: c.textStrong,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 12,
      lineHeight: 20,
      color: c.textMuted,
    },
    label: {
      marginTop: 6,
      fontSize: 12,
      fontWeight: '900',
      color: c.textStrong,
    },
    hint: {
      marginTop: -5,
      fontSize: 11,
      color: c.gray,
    },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: 14,
      backgroundColor: c.cardBackground,
      color: c.textStrong,
      fontSize: 14,
    },
    errorText: {
      fontSize: 12,
      lineHeight: 18,
      color: c.error,
    },
    deleteButton: {
      minHeight: 50,
      marginTop: 8,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.error,
    },
    deleteText: {
      color: c.white,
      fontSize: 13,
      fontWeight: '900',
    },
    disabled: { opacity: 0.5 },
  });
