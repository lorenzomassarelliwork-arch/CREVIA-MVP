import { StyleSheet, Text, View } from 'react-native';
import { useAppPreferences } from '../theme/AppPreferencesProvider';

export default function PhaseScreen({ title, subtitle }: { title: string; subtitle: string }) {
  const { colors } = useAppPreferences();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.textStrong }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 64, paddingBottom: 100 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 15, lineHeight: 22, marginTop: 8 },
});
