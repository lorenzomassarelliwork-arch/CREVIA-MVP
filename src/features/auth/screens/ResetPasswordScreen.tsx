import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../navigation/types';
import { COLORS } from '../../../theme/colors';
import { logoutUser, updatePassword } from '../services/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export default function ResetPasswordScreen({}: Props) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (password.length < 8) {
      setError('La nuova password deve contenere almeno 8 caratteri.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await updatePassword(password);
      Alert.alert(
        'Password aggiornata',
        'La password è stata modificata. Accedi nuovamente con la nuova password.',
        [
          {
            text: 'Vai al login',
            onPress: () => {
              void logoutUser();
            },
          },
        ]
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Aggiornamento password non riuscito.'
      );
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    Alert.alert(
      'Annullare il recupero?',
      'Tornerai alla schermata di accesso senza modificare la password.',
      [
        { text: 'Continua', style: 'cancel' },
        {
          text: 'Annulla recupero',
          style: 'destructive',
          onPress: () => {
            void logoutUser();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nuova password</Text>
      <Text style={styles.subtitle}>
        Scegli una nuova password per il tuo account Crevia.
      </Text>

      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="Nuova password"
        placeholderTextColor={COLORS.gray}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setError('');
        }}
      />

      <TextInput
        style={[styles.input, styles.secondInput, error ? styles.inputError : null]}
        placeholder="Conferma nuova password"
        placeholderTextColor={COLORS.gray}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          setError('');
        }}
        onSubmitEditing={() => void submit()}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, loading ? styles.buttonDisabled : null]}
        onPress={() => void submit()}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.buttonText}>Aggiorna password</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={cancel} disabled={loading}>
        <Text style={styles.backText}>Annulla</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.textStrong },
  subtitle: {
    marginTop: 12,
    marginBottom: 24,
    fontSize: 16,
    lineHeight: 23,
    color: COLORS.textMuted,
  },
  input: {
    backgroundColor: COLORS.inputSurface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.transparent,
  },
  secondInput: { marginTop: 12 },
  inputError: { borderColor: COLORS.error },
  errorText: { marginTop: 8, color: COLORS.error, fontSize: 12 },
  button: {
    marginTop: 18,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: COLORS.white, fontWeight: '700' },
  backText: {
    marginTop: 20,
    textAlign: 'center',
    color: COLORS.primary,
    fontWeight: '700',
  },
});
