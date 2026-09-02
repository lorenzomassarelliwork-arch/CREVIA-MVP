import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import type { ColorPalette } from '../../../theme/colors';
import { useAppPreferences } from '../../../theme/AppPreferencesProvider';
import { listProjectMembersWithProfiles, type ProjectMemberWithProfile } from '../../applications/services/applicationService';
import { getProjectDetail } from '../services/projectService';
import { listExperiencesForProject } from '../../experience/services/experienceService';
import type { VerifiedExperience } from '../../../domain/models';

type Props = NativeStackScreenProps<RootStackParamList, 'ProjectTeam'>;

export default function ProjectTeamScreen({ navigation, route }: Props) {
  const { colors } = useAppPreferences(); const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors, insets.top, insets.bottom), [colors, insets.bottom, insets.top]);
  const [members, setMembers] = useState<ProjectMemberWithProfile[]>([]); const [experiences, setExperiences] = useState<VerifiedExperience[]>([]); const [title, setTitle] = useState('Team'); const [loading, setLoading] = useState(true);
  useFocusEffect(useCallback(() => { let active = true; void Promise.all([listProjectMembersWithProfiles(route.params.projectId), getProjectDetail(route.params.projectId), listExperiencesForProject(route.params.projectId)]).then(([m,p,e]) => { if (!active) return; setMembers(m); setTitle(p?.project.title ?? 'Team'); setExperiences(e); setLoading(false); }); return () => { active = false; }; }, [route.params.projectId]));

  return <View style={styles.container}><View style={styles.header}><TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={24} color={colors.textStrong}/></TouchableOpacity><View style={styles.headerCopy}><Text style={styles.headerTitle}>Team</Text><Text style={styles.headerSub}>{title}</Text></View><View style={styles.spacer}/></View>
    {loading ? <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary}/></View> : <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.ownerCard}><View style={styles.avatar}><Text style={styles.avatarText}>LM</Text></View><View style={styles.flex}><Text style={styles.name}>Lorenzo Massarelli</Text><Text style={styles.role}>Creator del progetto</Text></View><View style={styles.badge}><Text style={styles.badgeText}>Founder</Text></View></View>
      <Text style={styles.sectionTitle}>Membri</Text>
      {members.length === 0 ? <View style={styles.empty}><Ionicons name="people-outline" size={28} color={colors.gray}/><Text style={styles.emptyTitle}>Nessun membro ancora</Text><Text style={styles.emptyText}>Accetta almeno una candidatura per formare il team.</Text></View> : members.map((member) => { const experience = experiences.find((item) => item.userId === member.userId); return <View key={member.id} style={styles.card}><View style={styles.avatar}><Text style={styles.avatarText}>{member.profile.firstName.charAt(0)}{member.profile.lastName.charAt(0)}</Text></View><View style={styles.flex}><Text style={styles.name}>{member.profile.firstName} {member.profile.lastName}</Text><Text style={styles.role}>{member.roleTitle}</Text><Text style={styles.meta}>{member.status === 'active' ? 'Membro attivo' : member.status === 'completed' ? 'Partecipazione completata' : member.status}</Text>{experience ? <Text style={styles.verification}>{experience.verificationStatus === 'verified' ? 'Esperienza verificata ✓' : 'Conferma partecipante in attesa'}</Text> : null}</View></View>; })}
    </ScrollView>}
  </View>;
}

const makeStyles = (c: ColorPalette, top: number, bottom: number) => StyleSheet.create({container:{flex:1,backgroundColor:c.background},header:{paddingTop:Math.max(top,24)+8,paddingHorizontal:16,paddingBottom:12,flexDirection:'row',alignItems:'center',backgroundColor:c.cardBackground,borderBottomWidth:1,borderBottomColor:c.border},back:{width:42,height:42,borderRadius:12,alignItems:'center',justifyContent:'center',backgroundColor:c.actionSurface},spacer:{width:42},headerCopy:{flex:1,alignItems:'center'},headerTitle:{fontSize:16,fontWeight:'900',color:c.textStrong},headerSub:{fontSize:11,color:c.gray},loading:{flex:1,alignItems:'center',justifyContent:'center'},content:{padding:20,gap:14,paddingBottom:30+bottom},sectionTitle:{fontSize:19,fontWeight:'900',color:c.textStrong},ownerCard:{flexDirection:'row',alignItems:'center',gap:12,padding:16,borderRadius:16,borderWidth:1,borderColor:c.border,backgroundColor:c.cardBackground},card:{flexDirection:'row',alignItems:'center',gap:12,padding:16,borderRadius:16,borderWidth:1,borderColor:c.border,backgroundColor:c.cardBackground},avatar:{width:48,height:48,borderRadius:16,backgroundColor:c.primarySoft,alignItems:'center',justifyContent:'center'},avatarText:{color:c.primary,fontWeight:'900'},flex:{flex:1,gap:2},name:{fontSize:15,fontWeight:'900',color:c.textStrong},role:{fontSize:12,fontWeight:'800',color:c.primary},meta:{fontSize:11,color:c.gray},verification:{fontSize:11,color:c.textMuted,marginTop:3},badge:{paddingHorizontal:9,paddingVertical:6,borderRadius:999,backgroundColor:c.primarySoft},badgeText:{fontSize:10,fontWeight:'800',color:c.primary},empty:{minHeight:180,alignItems:'center',justifyContent:'center',gap:8,borderRadius:16,borderWidth:1,borderColor:c.border,backgroundColor:c.cardBackground,padding:20},emptyTitle:{fontSize:16,fontWeight:'900',color:c.textStrong},emptyText:{fontSize:12,color:c.textMuted,textAlign:'center'}});
