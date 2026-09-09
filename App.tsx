import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, View } from 'react-native';
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
import HomeScreen from './src/features/projects/screens/HomeScreen';
import SearchScreen from './src/features/projects/screens/SearchScreen';
import CreateProjectScreen from './src/features/projects/screens/CreateProjectScreen';
import ProjectDetailScreen from './src/features/projects/screens/ProjectDetailScreen';
import ProjectTeamScreen from './src/features/projects/screens/ProjectTeamScreen';
import CompleteProjectScreen from './src/features/projects/screens/CompleteProjectScreen';
import ApplyToProjectScreen from './src/features/applications/screens/ApplyToProjectScreen';
import ProjectApplicationsScreen from './src/features/applications/screens/ProjectApplicationsScreen';
import ChatsScreen from './src/features/chat/screens/ChatsScreen';
import ProfileScreen from './src/features/profile/screens/ProfileScreen';
import EditProfileScreen from './src/features/profile/screens/EditProfileScreen';
import PublicProfileScreen from './src/features/profile/screens/PublicProfileScreen';
import { supabase } from './src/lib/supabase';
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

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
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
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen
              name="Main"
              component={MainTabs}
              options={{ gestureEnabled: false }}
            />
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
            <Stack.Screen
              name="PublicProfile"
              component={PublicProfileScreen}
            />
          </Stack.Navigator>
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
