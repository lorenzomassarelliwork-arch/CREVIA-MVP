import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Linking, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import BottomNavBar from './src/navigation/BottomNavBar';
import LoginScreen from './src/features/auth/screens/LoginScreen';
import RegisterScreen from './src/features/auth/screens/RegisterScreen';
import ForgotPasswordScreen from './src/features/auth/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/features/auth/screens/ResetPasswordScreen';
import HomeScreen from './src/features/projects/screens/HomeScreen';
import SearchScreen from './src/features/projects/screens/SearchScreen';
import CreateProjectScreen from './src/features/projects/screens/CreateProjectScreen';
import ProjectDetailScreen from './src/features/projects/screens/ProjectDetailScreen';
import ProjectTeamScreen from './src/features/projects/screens/ProjectTeamScreen';
import CompleteProjectScreen from './src/features/projects/screens/CompleteProjectScreen';
import AddProjectRoleScreen from './src/features/projects/screens/AddProjectRoleScreen';
import LeaveProjectScreen from './src/features/projects/screens/LeaveProjectScreen';
import ManageProjectAdminsScreen from './src/features/projects/screens/ManageProjectAdminsScreen';
import ExperienceExclusionScreen from './src/features/experience/screens/ExperienceExclusionScreen';
import ApplyToProjectScreen from './src/features/applications/screens/ApplyToProjectScreen';
import ProjectApplicationsScreen from './src/features/applications/screens/ProjectApplicationsScreen';
import ChatsScreen from './src/features/chat/screens/ChatsScreen';
import ChatRoomScreen from './src/features/chat/screens/ChatRoomScreen';
import NotificationsScreen from './src/features/notifications/screens/NotificationsScreen';
import ProfileScreen from './src/features/profile/screens/ProfileScreen';
import EditProfileScreen from './src/features/profile/screens/EditProfileScreen';
import DeleteAccountScreen from './src/features/profile/screens/DeleteAccountScreen';
import PublicProfileScreen from './src/features/profile/screens/PublicProfileScreen';
import ReportContentScreen from './src/features/safety/screens/ReportContentScreen';
import ModerationQueueScreen from './src/features/moderation/screens/ModerationQueueScreen';
import ModerationDetailScreen from './src/features/moderation/screens/ModerationDetailScreen';
import { supabase } from './src/lib/supabase';
import { handleSupabaseAuthCallback } from './src/features/auth/services/authCallbackService';
import {
  AppPreferencesProvider,
  useAppPreferences,
} from './src/theme/AppPreferencesProvider';
import type {
  MainTabParamList,
  RootStackParamList,
} from './src/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createMaterialTopTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      initialLayout={{ width: Dimensions.get('window').width }}
      tabBarPosition="bottom"
      screenOptions={{ swipeEnabled: true, animationEnabled: false, lazy: true }}
      tabBar={(props) => <BottomNavBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Create" component={CreateProjectScreen} />
      <Tab.Screen name="Chat" component={ChatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { colors, isDark } = useAppPreferences();
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    let mounted = true;

    const handleUrl = async (url: string | null) => {
      if (!url) return;
      try {
        const callbackKind = await handleSupabaseAuthCallback(url);
        if (callbackKind === 'recovery') {
          setPasswordRecovery(true);
        }
      } catch (error) {
        console.error('Supabase auth callback failed', error);
      }
    };

    void Linking.getInitialURL().then(handleUrl);

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
      }
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      linkingSubscription.remove();
      subscription.unsubscribe();
    };
  }, []);

  const navigationTheme = useMemo(() => {
    const baseTheme = isDark ? DarkTheme : DefaultTheme;

    return {
      ...baseTheme,
      colors: {
        ...baseTheme.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.cardBackground,
        text: colors.textStrong,
        border: colors.border,
        notification: colors.error,
      },
    };
  }, [colors, isDark]);

  if (!authReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer theme={navigationTheme}>
        {session ? (
          passwordRecovery ? (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen
                name="ResetPassword"
                component={ResetPasswordScreen}
                options={{ gestureEnabled: false }}
              />
            </Stack.Navigator>
          ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ gestureEnabled: false }}
            />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="ChatRoom" component={ChatRoomScreen} />
            <Stack.Screen name="AddProjectRole" component={AddProjectRoleScreen} />
            <Stack.Screen name="LeaveProject" component={LeaveProjectScreen} />
            <Stack.Screen name="ManageProjectAdmins" component={ManageProjectAdminsScreen} />
            <Stack.Screen name="ExperienceExclusion" component={ExperienceExclusionScreen} />
            <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
            <Stack.Screen
              name="ApplyToProject"
              component={ApplyToProjectScreen}
            />
            <Stack.Screen
              name="ProjectApplications"
              component={ProjectApplicationsScreen}
            />
            <Stack.Screen name="ProjectTeam" component={ProjectTeamScreen} />
            <Stack.Screen
              name="CompleteProject"
              component={CompleteProjectScreen}
            />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} />
            <Stack.Screen
              name="PublicProfile"
              component={PublicProfileScreen}
            />
            <Stack.Screen name="ReportContent" component={ReportContentScreen} />
            <Stack.Screen name="ModerationQueue" component={ModerationQueueScreen} />
            <Stack.Screen name="ModerationDetail" component={ModerationDetailScreen} />
          </Stack.Navigator>
          )
        ) : (
          <Stack.Navigator
            screenOptions={{ headerShown: false }}
            initialRouteName="Login"
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
            />
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <AppPreferencesProvider>
        <AppNavigator />
      </AppPreferencesProvider>
    </SafeAreaProvider>
  );
}
