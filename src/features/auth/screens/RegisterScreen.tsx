import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { COLORS } from '../../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Registrazione</Text>
      <Text style={styles.subtitle}>La registrazione completa verrà migrata nel prossimo blocco senza cambiare lo stile attuale.</Text>
      <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>Torna al login</Text></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', paddingHorizontal: 30 },
  title: { fontSize: 30, fontWeight: '800', color: COLORS.textStrong },
  subtitle: { marginTop: 12, fontSize: 16, lineHeight: 23, color: COLORS.textMuted },
  button: { marginTop: 28, backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  buttonText: { color: COLORS.white, fontWeight: '700' },
});
