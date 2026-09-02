import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MaterialTopTabScreenProps } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainTabParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import { createProject } from '../services/projectService';

export default function CreateProjectScreen({ navigation }: MaterialTopTabScreenProps<MainTabParamList, 'Create'>) {
  const { colors } = useAppPreferences();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, insets.top, insets.bottom), [colors, insets.bottom, insets.top]);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [goal, setGoal] = useState(''); const [deliverable, setDeliverable] = useState('');
  const [category, setCategory] = useState(''); const [city, setCity] = useState('Milano'); const [duration, setDuration] = useState(''); const [hours, setHours] = useState('');
  const [roleTitle, setRoleTitle] = useState(''); const [roleDescription, setRoleDescription] = useState(''); const [skills, setSkills] = useState('');

  const submit = async () => {
    if ([title, description, goal, deliverable, category, roleTitle, roleDescription].some((value) => value.trim().length < 3)) {
      Alert.alert('Dati mancanti', 'Completa i campi principali e almeno un ruolo.'); return;
    }
    const project = await createProject({ title, description, goal, deliverable, category, type: 'startup', locationMode: 'hybrid', city, expectedDuration: duration || null, weeklyCommitmentHours: hours ? Number(hours) : null, compensationType: 'unpaid', compensationNotes: 'Collaborazione non retribuita. Eventuali accordi economici diversi devono essere concordati direttamente tra le parti.', roles: [{ title: roleTitle, description: roleDescription, requiredSkills: skills.split(',').map((item) => item.trim()).filter(Boolean), seats: 1 }] });
    setTitle(''); setDescription(''); setGoal(''); setDeliverable(''); setCategory(''); setDuration(''); setHours(''); setRoleTitle(''); setRoleDescription(''); setSkills('');
    Alert.alert('Progetto pubblicato', 'Il progetto è ora in recruiting.', [{ text: 'Apri progetto', onPress: () => navigation.getParent()?.navigate('ProjectDetail', { projectId: project.id }) }]);
  };

  const Field = ({ label, value, onChangeText, multiline = false, placeholder }: { label: string; value: string; onChangeText: (v: string) => void; multiline?: boolean; placeholder?: string }) => (
    <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput value={value} onChangeText={onChangeText} multiline={multiline} placeholder={placeholder} placeholderTextColor={colors.gray} style={[styles.input, multiline && styles.area]} /></View>
  );

  return <View style={styles.container}><View style={styles.header}><Text style={styles.logo}>CREVIA</Text><Text style={styles.headerTitle}>Crea progetto</Text></View><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <Text style={styles.sectionTitle}>Informazioni principali</Text>
    <Field label="Nome progetto" value={title} onChangeText={setTitle} placeholder="Es. GreenTrack" />
    <Field label="Descrizione" value={description} onChangeText={setDescription} multiline />
    <Field label="Obiettivo" value={goal} onChangeText={setGoal} multiline />
    <Field label="Deliverable finale" value={deliverable} onChangeText={setDeliverable} multiline placeholder="Cosa deve esistere alla fine del progetto?" />
    <Field label="Categoria" value={category} onChangeText={setCategory} placeholder="Tech, Design, Education..." />
    <View style={styles.row}><View style={styles.flex}><Field label="Città" value={city} onChangeText={setCity} /></View><View style={styles.flex}><Field label="Durata" value={duration} onChangeText={setDuration} placeholder="Es. 3 mesi" /></View></View>
    <Field label="Ore a settimana" value={hours} onChangeText={setHours} placeholder="Es. 5" />
    <Text style={styles.sectionTitle}>Primo ruolo aperto</Text>
    <Field label="Ruolo" value={roleTitle} onChangeText={setRoleTitle} placeholder="Frontend Developer" />
    <Field label="Descrizione ruolo" value={roleDescription} onChangeText={setRoleDescription} multiline />
    <Field label="Competenze" value={skills} onChangeText={setSkills} placeholder="React Native, TypeScript" />
    <View style={styles.notice}><Ionicons name="information-circle-outline" size={20} color={colors.primary}/><Text style={styles.noticeText}>Per il primo MVP il progetto viene creato come startup, ibrido e non retribuito. Tipologia, modalità e condizioni verranno rese selezionabili nel passaggio di rifinitura del form.</Text></View>
    <TouchableOpacity style={styles.button} onPress={() => void submit()}><Text style={styles.buttonText}>Pubblica progetto</Text></TouchableOpacity>
  </ScrollView></View>;
}

const makeStyles = (c: ColorPalette, top: number, bottom: number) => StyleSheet.create({ container:{flex:1,backgroundColor:c.background}, header:{paddingTop:Math.max(top,24)+14,paddingHorizontal:20,paddingBottom:15,backgroundColor:c.cardBackground,borderBottomWidth:1,borderBottomColor:c.border},logo:{fontSize:24,fontWeight:'bold',color:c.primary,letterSpacing:1},headerTitle:{fontSize:13,color:c.gray,fontWeight:'700',marginTop:2},content:{padding:20,gap:16,paddingBottom:90+bottom},sectionTitle:{fontSize:19,fontWeight:'900',color:c.textStrong,marginTop:4},field:{gap:7},label:{fontSize:13,fontWeight:'800',color:c.textStrong},input:{borderWidth:1,borderColor:c.border,borderRadius:12,backgroundColor:c.cardBackground,color:c.textStrong,paddingHorizontal:14,paddingVertical:12,fontSize:14},area:{minHeight:96,textAlignVertical:'top'},row:{flexDirection:'row',gap:10},flex:{flex:1},notice:{flexDirection:'row',gap:10,padding:14,borderRadius:12,backgroundColor:c.primarySoft},noticeText:{flex:1,fontSize:12,lineHeight:18,color:c.textMuted},button:{backgroundColor:c.primary,borderRadius:12,paddingVertical:15,alignItems:'center'},buttonText:{color:c.white,fontSize:15,fontWeight:'900'} });
