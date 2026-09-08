import { useEffect, useMemo, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CURRENT_USER_ID } from '../../../core/session';
import type { RootStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import {
  getProfile,
  updateCurrentProfile,
} from '../services/profileService';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;
type ScreenStyles = ReturnType<typeof makeStyles>;

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  styles: ScreenStyles;
  colors: ColorPalette;
  placeholder?: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words';
};

function FormField({
  label,
  value,
  onChangeText,
  styles,
  colors,
  placeholder,
  multiline = false,
  autoCapitalize = 'sentences',
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.gray}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.area]}
      />
    </View>
  );
}

export default function EditProfileScreen({ navigation }: Props) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [headline, setHeadline] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [availability, setAvailability] = useState('');
  const [skills, setSkills] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    let active = true;
    void getProfile(CURRENT_USER_ID).then((profile) => {
      if (!active) return;
      if (profile) {
        setFirstName(profile.firstName);
        setLastName(profile.lastName);
        setHeadline(profile.headline ?? '');
        setCity(profile.city ?? '');
        setBio(profile.bio ?? '');
        setAvailability(profile.availability ?? '');
        setSkills(profile.skills.join(', '));
        setAvatarUrl(profile.avatarUrl ?? '');
      }
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await updateCurrentProfile({
        firstName,
        lastName,
        headline,
        city,
        bio,
        availability,
        skills: skills
          .split(',')
          .map((skill) => skill.trim())
          .filter(Boolean),
        avatarUrl,
      });

      Alert.alert(
        'Profilo aggiornato',
        'Le modifiche sono state salvate.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Profilo non aggiornato',
        error instanceof Error ? error.message : 'Errore imprevisto.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textStrong} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Modifica profilo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introCard}>
          <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
          <View style={styles.flex}>
            <Text style={styles.introTitle}>Il tuo profilo Crevia</Text>
            <Text style={styles.introText}>
              Queste informazioni accompagnano candidature, team ed esperienze.
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <FormField
              label="Nome"
              value={firstName}
              onChangeText={setFirstName}
              styles={styles}
              colors={colors}
              autoCapitalize="words"
            />
          </View>
          <View style={styles.flex}>
            <FormField
              label="Cognome"
              value={lastName}
              onChangeText={setLastName}
              styles={styles}
              colors={colors}
              autoCapitalize="words"
            />
          </View>
        </View>

        <FormField
          label="Ruolo / headline"
          value={headline}
          onChangeText={setHeadline}
          placeholder="Es. Frontend Developer"
          styles={styles}
          colors={colors}
        />

        <FormField
          label="Città"
          value={city}
          onChangeText={setCity}
          placeholder="Es. Milano"
          styles={styles}
          colors={colors}
          autoCapitalize="words"
        />

        <FormField
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Cosa sai fare e che tipo di progetti cerchi?"
          multiline
          styles={styles}
          colors={colors}
        />

        <FormField
          label="Competenze"
          value={skills}
          onChangeText={setSkills}
          placeholder="TypeScript, React Native, Figma"
          styles={styles}
          colors={colors}
        />
        <Text style={styles.helpText}>
          Separa le competenze con una virgola.
        </Text>

        <FormField
          label="Disponibilità"
          value={availability}
          onChangeText={setAvailability}
          placeholder="Es. 5 ore/settimana"
          styles={styles}
          colors={colors}
        />

        <FormField
          label="URL avatar (opzionale)"
          value={avatarUrl}
          onChangeText={setAvatarUrl}
          placeholder="https://..."
          styles={styles}
          colors={colors}
          autoCapitalize="none"
        />
        <Text style={styles.helpText}>
          Il caricamento diretto della foto verrà collegato allo storage quando
          attiveremo Supabase.
        </Text>

        <TouchableOpacity
          disabled={saving}
          style={[styles.saveButton, saving && styles.disabled]}
          onPress={() => void save()}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.saveText}>Salva modifiche</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: ColorPalette, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.background,
    },
    header: {
      paddingTop: Math.max(top, 24) + 8,
      paddingHorizontal: 16,
      paddingBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
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
    headerSpacer: { width: 42 },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 16,
      fontWeight: '900',
      color: c.textStrong,
    },
    content: {
      padding: 20,
      gap: 16,
      paddingBottom: 30 + bottom,
    },
    introCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 15,
      borderRadius: 14,
      backgroundColor: c.primarySoft,
    },
    introTitle: { fontSize: 14, fontWeight: '900', color: c.textStrong },
    introText: { fontSize: 11, lineHeight: 17, color: c.textMuted, marginTop: 2 },
    row: { flexDirection: 'row', gap: 10 },
    flex: { flex: 1 },
    field: { gap: 7 },
    label: { fontSize: 13, fontWeight: '800', color: c.textStrong },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      backgroundColor: c.cardBackground,
      color: c.textStrong,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
    },
    area: { minHeight: 110 },
    helpText: { fontSize: 10, lineHeight: 15, color: c.gray, marginTop: -10 },
    saveButton: {
      marginTop: 4,
      paddingVertical: 15,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: c.primary,
    },
    saveText: { color: c.white, fontSize: 15, fontWeight: '900' },
    disabled: { opacity: 0.55 },
  });
