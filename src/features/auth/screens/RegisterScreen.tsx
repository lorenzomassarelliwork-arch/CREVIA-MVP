import { useMemo, useState } from 'react';
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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { COLORS } from '../../../theme/colors';
import { registerUser } from '../services/authService';
import { validateRegister } from '../validators/authValidator';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const initialForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const errors = useMemo(() => validateRegister(form), [form]);

  const updateField = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSubmitError('');
  };

  const submit = async () => {
    if (Object.keys(errors).length > 0) {
      setSubmitError('Controlla i campi evidenziati.');
      return;
    }

    try {
      setLoading(true);
      setSubmitError('');

      const result = await registerUser({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
      });

      if (result.requiresEmailConfirmation) {
        Alert.alert(
          'Controlla la tua email',
          'Ti abbiamo inviato il link per confermare la registrazione.',
          [{ text: 'OK', onPress: () => navigation.replace('Login') }]
        );
      }
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Registrazione non riuscita.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logo}>CREVIA</Text>
        <Text style={styles.title}>Crea il tuo account</Text>
        <Text style={styles.subtitle}>
          Inizia a costruire esperienza attraverso progetti reali.
        </Text>

        <View style={styles.form}>
          <Field
            placeholder="Nome"
            value={form.firstName}
            error={errors.firstName}
            onChangeText={(value) => updateField('firstName', value)}
          />
          <Field
            placeholder="Cognome"
            value={form.lastName}
            error={errors.lastName}
            onChangeText={(value) => updateField('lastName', value)}
          />
          <Field
            placeholder="Email"
            value={form.email}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            onChangeText={(value) => updateField('email', value)}
          />
          <Field
            placeholder="Password"
            value={form.password}
            error={errors.password}
            secureTextEntry
            onChangeText={(value) => updateField('password', value)}
          />
          <Field
            placeholder="Conferma password"
            value={form.confirmPassword}
            error={errors.confirmPassword}
            secureTextEntry
            onChangeText={(value) => updateField('confirmPassword', value)}
          />

          {submitError ? (
            <Text style={styles.submitError}>{submitError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.button, loading ? styles.buttonDisabled : null]}
            onPress={() => void submit()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.buttonText}>Registrati</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>Hai già un account? Accedi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  error,
  ...props
}: React.ComponentProps<typeof TextInput> & { error?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <TextInput
        {...props}
        style={[styles.input, error ? styles.inputError : null]}
        placeholderTextColor={COLORS.gray}
        autoCorrect={false}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
    paddingVertical: 36,
  },
  logo: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  title: {
    marginTop: 18,
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.textStrong,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 28,
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  form: { gap: 14 },
  fieldWrap: { gap: 6 },
  input: {
    backgroundColor: COLORS.inputSurface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 16,
    color: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.transparent,
  },
  inputError: { borderColor: COLORS.error },
  fieldError: { color: COLORS.error, fontSize: 11, marginLeft: 4 },
  submitError: {
    color: COLORS.error,
    fontSize: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: COLORS.white, fontWeight: '800', fontSize: 16 },
  backText: {
    marginTop: 4,
    textAlign: 'center',
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
