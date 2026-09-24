import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  listModerationItems,
  type ModerationItem,
} from '../services/moderationService';

type Props = NativeStackScreenProps<RootStackParamList, 'ModerationQueue'>;

export default function ModerationQueueScreen({ navigation }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listModerationItems());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Moderazione</Text>
          <Text style={styles.headerSub}>Segnalazioni Crevia</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {items.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={30} color={colors.gray} />
              <Text style={styles.emptyTitle}>Nessuna segnalazione</Text>
              <Text style={styles.emptyText}>La coda di moderazione è vuota.</Text>
            </View>
          ) : (
            items.map((item) => (
              <TouchableOpacity
                key={item.kind + item.id}
                style={styles.card}
                onPress={() =>
                  navigation.navigate('ModerationDetail', {
                    kind: item.kind,
                    id: item.id,
                  })
                }
              >
                <View style={styles.icon}>
                  <Ionicons
                    name={item.kind === 'experience_exclusion' ? 'ribbon-outline' : 'flag-outline'}
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.title}>{item.title}</Text>
                  <Text style={styles.subtitle}>{item.subtitle}</Text>
                  <Text style={styles.date}>
                    {new Date(item.createdAt).toLocaleString('it-IT')}
                  </Text>
                </View>
                <View style={styles.status}>
                  <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
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
      width: 42, height: 42, borderRadius: 12, alignItems: 'center',
      justifyContent: 'center', backgroundColor: c.actionSurface,
    },
    headerCopy: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '900', color: c.textStrong },
    headerSub: { fontSize: 11, color: c.gray, marginTop: 2 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, gap: 10, paddingBottom: 30 + bottom },
    card: {
      flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
      borderRadius: 14, borderWidth: 1, borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    icon: {
      width: 42, height: 42, borderRadius: 12, alignItems: 'center',
      justifyContent: 'center', backgroundColor: c.primarySoft,
    },
    flex: { flex: 1 },
    title: { fontSize: 14, fontWeight: '900', color: c.textStrong },
    subtitle: { marginTop: 2, fontSize: 11, color: c.textMuted },
    date: { marginTop: 4, fontSize: 10, color: c.gray },
    status: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: c.actionSurface },
    statusText: { fontSize: 9, fontWeight: '900', color: c.textMuted },
    empty: { minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: c.textStrong },
    emptyText: { fontSize: 12, color: c.textMuted },
  });
