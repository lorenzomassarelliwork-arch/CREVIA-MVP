import { useMemo } from 'react';
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ColorPalette } from '../theme/colors';
import { useAppPreferences } from '../theme/AppPreferencesProvider';
import type { MainTabParamList } from './types';

type TabRouteName = keyof MainTabParamList;
type TabConfig = { icon: keyof typeof Ionicons.glyphMap; iconOutline: keyof typeof Ionicons.glyphMap };
const SCREEN_WIDTH = Dimensions.get('window').width;
const TAB_CONFIG: Record<TabRouteName, TabConfig> = {
  Home: { icon: 'home', iconOutline: 'home-outline' },
  Search: { icon: 'search', iconOutline: 'search-outline' },
  Create: { icon: 'add-circle', iconOutline: 'add-circle-outline' },
  Chat: { icon: 'chatbubbles', iconOutline: 'chatbubbles-outline' },
  Profile: { icon: 'person', iconOutline: 'person-outline' },
};

export default function BottomNavBar({ state, descriptors, navigation, position, layout }: MaterialTopTabBarProps) {
  const { colors, language, triggerHaptic } = useAppPreferences(); const insets = useSafeAreaInsets(); const styles = useMemo(() => createStyles(colors, insets.bottom), [colors, insets.bottom]);
  const labels: Record<TabRouteName, string> = language === 'it' ? { Home: 'Home', Search: 'Cerca', Create: 'Crea', Chat: 'Chat', Profile: 'Profilo' } : { Home: 'Home', Search: 'Search', Create: 'Create', Chat: 'Chat', Profile: 'Profile' };
  const tabWidth = (layout.width || SCREEN_WIDTH) / Math.max(state.routes.length, 1); const inputRange = state.routes.map((_, index) => index); const indicatorTranslation = position.interpolate({ inputRange, outputRange: inputRange.map((index) => index * tabWidth), extrapolate: 'clamp' });
  return <View style={styles.navBar}><Animated.View style={[styles.indicator,{width:tabWidth,transform:[{translateX:indicatorTranslation}]}]}/>{state.routes.map((route,index)=>{ const routeName=route.name as TabRouteName; const isFocused=state.index===index; const options=descriptors[route.key]?.options; const {icon,iconOutline}=TAB_CONFIG[routeName]; const isCreate=routeName==='Create'; return <TouchableOpacity key={route.key} accessibilityLabel={options?.tabBarAccessibilityLabel} testID={options?.tabBarButtonTestID} style={styles.navItem} activeOpacity={0.7} onPress={()=>{void triggerHaptic(); const event=navigation.emit({type:'tabPress',target:route.key,canPreventDefault:true}); if(!isFocused&&!event.defaultPrevented) navigation.navigate(route.name,route.params);}}><View style={isCreate?styles.createIconWrap:undefined}><Ionicons name={isFocused?icon:iconOutline} size={isCreate?30:24} color={isCreate?colors.primary:(isFocused?colors.primary:colors.gray)}/></View><Text style={[styles.navText,isFocused&&styles.navTextActive]}>{labels[routeName]}</Text></TouchableOpacity>})}</View>;
}
const createStyles=(c:ColorPalette,bottomInset:number)=>{const bottomPadding=Math.max(bottomInset,10);return StyleSheet.create({navBar:{position:'absolute',bottom:0,left:0,right:0,height:68+bottomPadding,backgroundColor:c.cardBackground,flexDirection:'row',borderTopWidth:1,borderTopColor:c.border,paddingBottom:bottomPadding,paddingTop:8,zIndex:999},navItem:{flex:1,justifyContent:'center',alignItems:'center'},navText:{fontSize:10,color:c.gray,marginTop:4},navTextActive:{color:c.primary,fontWeight:'bold'},indicator:{position:'absolute',bottom:bottomPadding-2,left:0,height:4,borderRadius:999,backgroundColor:c.primary},createIconWrap:{marginTop:-5}})};
