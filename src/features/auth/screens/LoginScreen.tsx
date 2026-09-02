import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { COLORS } from '../../../theme/colors';
import type { RootStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Inserisci email e password');
      return;
    }
    setLoading(true);
    setError('');
    await new Promise((resolve) => setTimeout(resolve, 250));
    setLoading(false);
    navigation.replace('Main');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>CREVIA</Text>
        <Text style={styles.subtitle}>Trova il progetto giusto per te</Text>
      </View>
      <View style={styles.form}>
        <TextInput style={[styles.input, error ? styles.inputError : null]} placeholder="Email" placeholderTextColor={COLORS.gray} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={(v) => { setEmail(v); setError(''); }} />
        <TextInput style={[styles.input, error ? styles.inputError : null]} placeholder="Password" placeholderTextColor={COLORS.gray} secureTextEntry value={password} onChangeText={(v) => { setPassword(v); setError(''); }} />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <TouchableOpacity style={styles.forgotButton} onPress={() => navigation.navigate('ForgotPassword')}><Text style={styles.forgotText}>Password dimenticata?</Text></TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>{loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.buttonText}>Accedi</Text>}</TouchableOpacity>
      </View>
      <View style={styles.footer}><Text style={styles.footerText}>Sei un nuovo utente? </Text><TouchableOpacity onPress={() => navigation.navigate('Register')}><Text style={styles.link}>Registrati</Text></TouchableOpacity></View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', paddingHorizontal: 30 },
  header: { alignItems: 'center', marginBottom: 50 },
  logo: { fontSize: 42, fontWeight: 'bold', color: COLORS.primary, letterSpacing: 2 },
  subtitle: { fontSize: 16, color: COLORS.gray, marginTop: 8 },
  form: { gap: 16 },
  input: { backgroundColor: COLORS.background, borderRadius: 12, padding: 16, fontSize: 16, color: COLORS.secondary },
  inputError: { borderWidth: 1, borderColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: 12, marginTop: -8, marginLeft: 4 },
  forgotButton: { alignSelf: 'center', marginTop: -4 },
  forgotText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 4 },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: 'bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { color: COLORS.gray, fontSize: 14 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: 'bold' },
});
