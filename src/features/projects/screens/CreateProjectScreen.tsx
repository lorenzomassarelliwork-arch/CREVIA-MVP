import { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type {
  CompensationType,
  ProjectLocationMode,
  ProjectType,
} from '../../../domain/models';
import type {
  MainTabParamList,
  RootStackParamList,
} from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import { createProject } from '../services/projectService';

type RoleDraft = {
  id: string;
  title: string;
  description: string;
  skills: string;
  seats: string;
};

type ScreenStyles = ReturnType<typeof makeStyles>;

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  styles: ScreenStyles;
  colors: ColorPalette;
  multiline?: boolean;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
};

type ChoiceOption<T extends string> = {
  value: T;
  label: string;
};

type ChoiceProps<T extends string> = {
  label: string;
  value: T;
  options: ChoiceOption<T>[];
  onChange: (value: T) => void;
  styles: ScreenStyles;
};

const newRole = (): RoleDraft => ({
  id: `role-draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  title: '',
  description: '',
  skills: '',
  seats: '1',
});

function FormField({
  label,
  value,
  onChangeText,
  styles,
  colors,
  multiline = false,
  placeholder,
  keyboardType = 'default',
}: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={colors.gray}
        keyboardType={keyboardType}
        style={[styles.input, multiline && styles.area]}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  styles,
}: ChoiceProps<T>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.choice,
              value === option.value && styles.choiceActive,
            ]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.choiceText,
                value === option.value && styles.choiceTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function CreateProjectScreen({
  navigation,
}: MaterialTopTabScreenProps<MainTabParamList, 'Create'>) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(
    () => makeStyles(colors, insets.top, insets.bottom),
    [colors, insets.bottom, insets.top]
  );
  const rootNavigation =
    navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goal, setGoal] = useState('');
  const [deliverable, setDeliverable] = useState('');
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('Milano');
  const [duration, setDuration] = useState('');
  const [hours, setHours] = useState('');
  const [type, setType] = useState<ProjectType>('startup');
  const [locationMode, setLocationMode] =
    useState<ProjectLocationMode>('hybrid');
  const [compensationType, setCompensationType] =
    useState<CompensationType>('unpaid');
  const [compensationNotes, setCompensationNotes] = useState('');
  const [roles, setRoles] = useState<RoleDraft[]>([newRole()]);

  const updateRole = (id: string, patch: Partial<RoleDraft>) => {
    setRoles((current) =>
      current.map((role) => (role.id === id ? { ...role, ...patch } : role))
    );
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setGoal('');
    setDeliverable('');
    setCategory('');
    setCity('Milano');
    setDuration('');
    setHours('');
    setType('startup');
    setLocationMode('hybrid');
    setCompensationType('unpaid');
    setCompensationNotes('');
    setRoles([newRole()]);
  };

  const submit = async () => {
    if (
      [title, description, goal, deliverable, category].some(
        (value) => value.trim().length < 3
      )
    ) {
      Alert.alert(
        'Dati mancanti',
        'Completa nome, descrizione, obiettivo, deliverable e categoria.'
      );
      return;
    }

    if (locationMode !== 'remote' && !city.trim()) {
      Alert.alert(
        'Città mancante',
        'Indica la città per progetti in presenza o ibridi.'
      );
      return;
    }

    if (
      roles.length === 0 ||
      roles.some(
        (role) =>
          role.title.trim().length < 2 || role.description.trim().length < 3
      )
    ) {
      Alert.alert(
        'Ruoli incompleti',
        'Aggiungi almeno un ruolo completo.'
      );
      return;
    }

    if (hours && (!Number.isFinite(Number(hours)) || Number(hours) <= 0)) {
      Alert.alert(
        'Impegno non valido',
        'Le ore settimanali devono essere un numero maggiore di zero.'
      );
      return;
    }

    try {
      const project = await createProject({
        title,
        description,
        goal,
        deliverable,
        category,
        type,
        locationMode,
        city,
        expectedDuration: duration || null,
        weeklyCommitmentHours: hours ? Number(hours) : null,
        compensationType,
        compensationNotes: compensationNotes || null,
        roles: roles.map((role) => ({
          title: role.title,
          description: role.description,
          requiredSkills: role.skills
            .split(',')
            .map((skill) => skill.trim())
            .filter(Boolean),
          seats: Math.max(1, Number(role.seats) || 1),
        })),
      });

      resetForm();
      Alert.alert(
        'Progetto pubblicato',
        'Il progetto è ora in recruiting.',
        [
          {
            text: 'Apri progetto',
            onPress: () =>
              rootNavigation?.navigate('ProjectDetail', {
                projectId: project.id,
              }),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Creazione non riuscita',
        error instanceof Error ? error.message : 'Errore imprevisto.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>CREVIA</Text>
        <Text style={styles.headerTitle}>Crea progetto</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        <Text style={styles.sectionTitle}>Progetto</Text>

        <FormField
          label="Nome"
          value={title}
          onChangeText={setTitle}
          styles={styles}
          colors={colors}
        />
        <FormField
          label="Descrizione"
          value={description}
          onChangeText={setDescription}
          styles={styles}
          colors={colors}
          multiline
        />
        <FormField
          label="Obiettivo"
          value={goal}
          onChangeText={setGoal}
          styles={styles}
          colors={colors}
          multiline
        />
        <FormField
          label="Deliverable finale"
          value={deliverable}
          onChangeText={setDeliverable}
          styles={styles}
          colors={colors}
          multiline
        />
        <FormField
          label="Categoria"
          value={category}
          onChangeText={setCategory}
          styles={styles}
          colors={colors}
        />

        <Choice<ProjectType>
          label="Tipologia"
          value={type}
          options={[
            { value: 'community', label: 'Community' },
            { value: 'startup', label: 'Startup' },
            { value: 'university', label: 'Università' },
            { value: 'non_profit', label: 'Non-profit' },
          ]}
          onChange={setType}
          styles={styles}
        />

        <Choice<ProjectLocationMode>
          label="Modalità"
          value={locationMode}
          options={[
            { value: 'remote', label: 'Remoto' },
            { value: 'onsite', label: 'Presenza' },
            { value: 'hybrid', label: 'Ibrido' },
          ]}
          onChange={setLocationMode}
          styles={styles}
        />

        {locationMode !== 'remote' ? (
          <FormField
            label="Città"
            value={city}
            onChangeText={setCity}
            styles={styles}
            colors={colors}
          />
        ) : null}

        <View style={styles.row}>
          <View style={styles.flex}>
            <FormField
              label="Durata"
              value={duration}
              onChangeText={setDuration}
              placeholder="3 mesi"
              styles={styles}
              colors={colors}
            />
          </View>
          <View style={styles.flex}>
            <FormField
              label="Ore/settimana"
              value={hours}
              onChangeText={setHours}
              placeholder="5"
              keyboardType="numeric"
              styles={styles}
              colors={colors}
            />
          </View>
        </View>

        <Choice<CompensationType>
          label="Condizioni"
          value={compensationType}
          options={[
            { value: 'unpaid', label: 'Non retribuito' },
            { value: 'expense_reimbursement', label: 'Rimborso' },
            { value: 'prize', label: 'Premio' },
            { value: 'paid_to_agree', label: 'Da concordare' },
          ]}
          onChange={setCompensationType}
          styles={styles}
        />

        <FormField
          label="Note sulle condizioni"
          value={compensationNotes}
          onChangeText={setCompensationNotes}
          multiline
          placeholder="Eventuali dettagli o limiti"
          styles={styles}
          colors={colors}
        />

        <Text style={styles.legal}>
          Crevia non gestisce né garantisce pagamenti o accordi economici tra
          gli utenti. Eventuali condizioni economiche sono concordate
          direttamente tra le parti.
        </Text>

        <Text style={styles.sectionTitle}>Ruoli aperti</Text>

        {roles.map((role, index) => (
          <View key={role.id} style={styles.roleCard}>
            <View style={styles.roleHeader}>
              <Text style={styles.roleTitle}>Ruolo {index + 1}</Text>
              {roles.length > 1 ? (
                <TouchableOpacity
                  onPress={() =>
                    setRoles((current) =>
                      current.filter((item) => item.id !== role.id)
                    )
                  }
                >
                  <Text style={styles.remove}>Rimuovi</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <FormField
              label="Titolo ruolo"
              value={role.title}
              onChangeText={(value) => updateRole(role.id, { title: value })}
              styles={styles}
              colors={colors}
            />
            <FormField
              label="Descrizione"
              value={role.description}
              onChangeText={(value) =>
                updateRole(role.id, { description: value })
              }
              styles={styles}
              colors={colors}
              multiline
            />
            <FormField
              label="Competenze (separate da virgola)"
              value={role.skills}
              onChangeText={(value) => updateRole(role.id, { skills: value })}
              styles={styles}
              colors={colors}
            />
            <FormField
              label="Posti"
              value={role.seats}
              onChangeText={(value) => updateRole(role.id, { seats: value })}
              keyboardType="numeric"
              styles={styles}
              colors={colors}
            />
          </View>
        ))}

        <TouchableOpacity
          style={styles.addRole}
          onPress={() => setRoles((current) => [...current, newRole()])}
        >
          <Text style={styles.addRoleText}>+ Aggiungi ruolo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => void submit()}
        >
          <Text style={styles.buttonText}>Pubblica progetto</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (c: ColorPalette, top: number, bottom: number) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    header: {
      paddingTop: Math.max(top, 24) + 14,
      paddingHorizontal: 20,
      paddingBottom: 15,
      backgroundColor: c.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    logo: {
      fontSize: 24,
      fontWeight: 'bold',
      color: c.primary,
      letterSpacing: 1,
    },
    headerTitle: { fontSize: 13, color: c.gray, fontWeight: '700' },
    content: { padding: 20, gap: 16, paddingBottom: 90 + bottom },
    sectionTitle: {
      fontSize: 19,
      fontWeight: '900',
      color: c.textStrong,
      marginTop: 4,
    },
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
    area: { minHeight: 90 },
    row: { flexDirection: 'row', gap: 10 },
    flex: { flex: 1 },
    choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    choice: {
      paddingHorizontal: 11,
      paddingVertical: 9,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    choiceActive: { borderColor: c.primary, backgroundColor: c.primarySoft },
    choiceText: { fontSize: 12, fontWeight: '700', color: c.textMuted },
    choiceTextActive: { color: c.primary },
    legal: { fontSize: 11, lineHeight: 17, color: c.gray },
    roleCard: {
      gap: 12,
      padding: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.cardBackground,
    },
    roleHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    roleTitle: { fontSize: 14, fontWeight: '900', color: c.textStrong },
    remove: { fontSize: 12, fontWeight: '800', color: c.error },
    addRole: {
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 11,
      backgroundColor: c.actionSurface,
    },
    addRoleText: { fontSize: 13, fontWeight: '900', color: c.primary },
    button: {
      backgroundColor: c.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
    },
    buttonText: { color: c.white, fontSize: 15, fontWeight: '900' },
  });
