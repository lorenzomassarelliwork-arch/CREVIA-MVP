import { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { UserProfile } from '../../../domain/models';
import type { RootStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import {
  addProjectAdmin,
  listProjectAdmins,
  removeProjectAdmin,
  searchProjectAdminCandidates,
  type ProjectAdmin,
} from '../services/projectAdminService';
import { getProjectDetail } from '../services/projectService';

type Props = NativeStackScreenProps<RootStackParamList, 'ManageProjectAdmins'>;

export default function ManageProjectAdminsScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );

  const [admins, setAdmins] = useState<ProjectAdmin[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [title, setTitle] = useState('Progetto');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [detail, currentAdmins] = await Promise.all([
        getProjectDetail(route.params.projectId),
        listProjectAdmins(route.params.projectId),
      ]);

      if (!detail?.isPrimaryOwner) {
        throw new Error('Solo il founder principale può gestire i co-founder.');
      }

      setTitle(detail.project.title);
      setAdmins(currentAdmins);
    } catch (error) {
      Alert.alert(
        'Gestione non disponibile',
        error instanceof Error ? error.message : 'Errore imprevisto.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } finally {
      setLoading(false);
    }
  }, [navigation, route.params.projectId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const search = async () => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      setResults(
        await searchProjectAdminCandidates(route.params.projectId, query)
      );
    } catch (error) {
      Alert.alert(
        'Ricerca non riuscita',
        error instanceof Error ? error.message : 'Errore imprevisto.'
      );
    } finally {
      setSearching(false);
    }
  };

  const nominate = (profile: UserProfile) => {
    Alert.alert(
      'Nominare co-founder?',
      `${profile.firstName} ${profile.lastName} potrà gestire candidature, team, ruoli, chat e completamento del progetto.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Nomina',
          onPress: async () => {
            setActionId(profile.id);
            try {
              await addProjectAdmin(route.params.projectId, profile.id);
              setQuery('');
              setResults([]);
              await load();
            } catch (error) {
              Alert.alert(
                'Nomina non riuscita',
                error instanceof Error ? error.message : 'Errore imprevisto.'
              );
            } finally {
              setActionId(null);
            }
          },
        },
      ]
    );
  };

  const remove = (admin: ProjectAdmin) => {
    const name = admin.profile
      ? `${admin.profile.firstName} ${admin.profile.lastName}`
      : 'Questo co-founder';

    Alert.alert(
      'Rimuovere il co-founder?',
      `${name} perderà i permessi di gestione del progetto.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Rimuovi ruolo',
          style: 'destructive',
          onPress: async () => {
            setActionId(admin.userId);
            try {
              await removeProjectAdmin(route.params.projectId, admin.userId);
              await load();
            } catch (error) {
              Alert.alert(
                'Rimozione non riuscita',
                error instanceof Error ? error.message : 'Errore imprevisto.'
              );
            } finally {
              setActionId(null);
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
          <Text style={styles.headerTitle}>Co-founder</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{title}</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.notice}>
            <Ionicons name="shield-checkmark-outline" size={21} color={colors.primary} />
            <Text style={styles.noticeText}>
              Solo il founder principale può nominare o rimuovere co-founder. Possono essere scelti tra gli utenti Crevia anche se non sono già membri del progetto.
            </Text>
          </View>

          <View style={styles.searchCard}>
            <Text style={styles.sectionTitle}>Aggiungi co-founder</Text>
            <View style={styles.searchRow}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cerca per nome o cognome"
                placeholderTextColor={colors.gray}
                autoCorrect={false}
                style={styles.input}
                returnKeyType="search"
                onSubmitEditing={() => void search()}
              />
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => void search()}
                disabled={searching || query.trim().length < 2}
              >
                {searching ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Ionicons name="search" size={18} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>

            {results.map((profile) => (
              <View key={profile.id} style={styles.personCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {profile.firstName.charAt(0)}
                    {profile.lastName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.name}>
                    {profile.firstName} {profile.lastName}
                  </Text>
                  <Text style={styles.meta}>
                    {profile.headline ?? 'Builder'}
                    {profile.city ? ` · ${profile.city}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => nominate(profile)}
                  disabled={actionId === profile.id}
                >
                  {actionId === profile.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.addText}>Nomina</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}

            {query.trim().length >= 2 && !searching && results.length === 0 ? (
              <Text style={styles.emptySearch}>
                Nessun nuovo utente trovato con questa ricerca.
              </Text>
            ) : null}
          </View>

          <Text style={styles.sectionTitle}>Co-founder attuali</Text>

          {admins.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nessun co-founder</Text>
              <Text style={styles.emptyText}>
                Il progetto è gestito solo dal founder principale.
              </Text>
            </View>
          ) : (
            admins.map((admin) => (
              <View key={admin.userId} style={styles.personCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {admin.profile?.firstName.charAt(0) ?? 'C'}
                    {admin.profile?.lastName.charAt(0) ?? 'F'}
                  </Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.name}>
                    {admin.profile
                      ? `${admin.profile.firstName} ${admin.profile.lastName}`
                      : 'Co-founder'}
                  </Text>
                  <Text style={styles.meta}>
                    {admin.profile?.headline ?? 'Co-founder del progetto'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => remove(admin)}
                  disabled={actionId === admin.userId}
                >
                  {actionId === admin.userId ? (
                    <ActivityIndicator size="small" color={colors.error} />
                  ) : (
                    <Ionicons name="trash-outline" size={17} color={colors.error} />
                  )}
                </TouchableOpacity>
              </View>
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
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.actionSurface,
    },
    headerCopy: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 16, fontWeight: '900', color: c.textStrong },
    headerSub: { marginTop: 2, fontSize: 11, color: c.gray, maxWidth: 220 },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    content: { padding: 20, gap: 14, paddingBottom: 30 + bottom },
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
    searchCard: {
      gap: 12,
      padding: 16,
      borderRadius: 16,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
    },
    sectionTitle: { fontSize: 17, fontWeight: '900', color: c.textStrong },
    searchRow: { flexDirection: 'row', gap: 8 },
    input: {
      flex: 1,
      minHeight: 46,
      borderRadius: 12,
      paddingHorizontal: 13,
      backgroundColor: c.actionSurface,
      color: c.textStrong,
      fontSize: 14,
    },
    searchButton: {
      width: 46,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    personCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 13,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
    },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primarySoft,
    },
    avatarText: { color: c.primary, fontWeight: '900' },
    flex: { flex: 1 },
    name: { fontSize: 14, fontWeight: '900', color: c.textStrong },
    meta: { marginTop: 2, fontSize: 11, color: c.gray },
    addButton: {
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 9,
      backgroundColor: c.primarySoft,
    },
    addText: { fontSize: 11, fontWeight: '900', color: c.primary },
    removeButton: {
      width: 38,
      height: 38,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.dangerSoft,
    },
    emptySearch: { textAlign: 'center', fontSize: 11, color: c.gray },
    emptyCard: {
      padding: 18,
      borderRadius: 14,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      gap: 5,
    },
    emptyTitle: { fontSize: 14, fontWeight: '900', color: c.textStrong },
    emptyText: { fontSize: 12, lineHeight: 18, color: c.textMuted, textAlign: 'center' },
  });
