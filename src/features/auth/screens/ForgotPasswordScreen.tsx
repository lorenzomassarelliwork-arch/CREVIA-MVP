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
import { requestPasswordReset } from '../services/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    const normalized = email.trim();

    if (!normalized || !normalized.includes('@')) {
      setError('Inserisci un indirizzo email valido.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await requestPasswordReset(normalized);
      Alert.alert(
        'Email inviata',
        'Se esiste un account associato a questa email, riceverai le istruzioni per reimpostare la password.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Invio email non riuscito.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recupera password</Text>
      <Text style={styles.subtitle}>
        Inserisci l'email del tuo account Crevia.
      </Text>

      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        placeholder="Email"
        placeholderTextColor={COLORS.gray}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
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
          <Text style={styles.buttonText}>Invia email</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>Indietro</Text>
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
