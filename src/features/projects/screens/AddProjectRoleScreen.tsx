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
import { addProjectRole } from '../services/projectService';

type Props = NativeStackScreenProps<RootStackParamList, 'AddProjectRole'>;

export default function AddProjectRoleScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState('');
  const [seats, setSeats] = useState('1');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const parsedSeats = Number(seats);
    if (title.trim().length < 2) {
      Alert.alert('Titolo non valido', 'Inserisci almeno 2 caratteri.');
      return;
    }
    if (description.trim().length < 5) {
      Alert.alert('Descrizione non valida', 'Inserisci almeno 5 caratteri.');
      return;
    }
    const requiredSkills = skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);
    if (requiredSkills.length === 0) {
      Alert.alert('Competenze mancanti', 'Inserisci almeno una competenza.');
      return;
    }
    if (!Number.isInteger(parsedSeats) || parsedSeats < 1 || parsedSeats > 50) {
      Alert.alert('Posti non validi', 'Inserisci un numero intero da 1 a 50.');
      return;
    }

    setSaving(true);
    try {
      await addProjectRole(route.params.projectId, {
        title,
        description,
        requiredSkills,
        seats: parsedSeats,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert(
        'Ruolo non aggiunto',
        error instanceof Error ? error.message : 'Errore imprevisto.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Aggiungi ruolo</Text>
          <Text style={styles.headerSub}>Amplia il team anche dopo la pubblicazione.</Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Titolo ruolo</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Es. Backend Developer"
            placeholderTextColor={colors.gray}
            style={styles.input}
          />

          <Text style={styles.label}>Descrizione</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Cosa farà questa persona nel progetto?"
            placeholderTextColor={colors.gray}
            multiline
            textAlignVertical="top"
            style={[styles.input, styles.area]}
          />

          <Text style={styles.label}>Competenze</Text>
          <TextInput
            value={skills}
            onChangeText={setSkills}
            placeholder="Node.js, PostgreSQL, API"
            placeholderTextColor={colors.gray}
            style={styles.input}
          />
          <Text style={styles.hint}>Separa le competenze con una virgola.</Text>

          <Text style={styles.label}>Posti disponibili</Text>
          <TextInput
            value={seats}
            onChangeText={setSeats}
            keyboardType="numeric"
            placeholder="1"
            placeholderTextColor={colors.gray}
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.disabled]}
          onPress={() => void submit()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <>
              <Ionicons name="add-circle-outline" size={19} color={colors.white} />
              <Text style={styles.primaryText}>Aggiungi ruolo</Text>
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
    headerCopy: { flex: 1 },
    headerTitle: { fontSize: 17, fontWeight: '900', color: c.textStrong },
    headerSub: { marginTop: 2, fontSize: 11, color: c.gray },
    content: { padding: 20, gap: 16, paddingBottom: 30 + bottom },
    card: {
      gap: 9,
      padding: 16,
      borderRadius: 16,
      backgroundColor: c.cardBackground,
      borderWidth: 1,
      borderColor: c.border,
    },
    label: { marginTop: 4, fontSize: 12, fontWeight: '800', color: c.textStrong },
    input: {
      minHeight: 46,
      borderRadius: 12,
      paddingHorizontal: 13,
      paddingVertical: 11,
      backgroundColor: c.actionSurface,
      color: c.textStrong,
      fontSize: 14,
    },
    area: { minHeight: 110 },
    hint: { fontSize: 11, color: c.gray },
    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    primaryText: { color: c.white, fontSize: 14, fontWeight: '900' },
    disabled: { opacity: 0.55 },
  });
